
import { z } from 'zod';

import {
    identitySchema,
    chatResponseSchema,
} from './chat.types';

import type {
    CustomerIdentity,
    ChatRequest,
    ChatResponse,
    StreamUpdate,
} from './chat.types';

export class ApiError extends Error {
    constructor(public readonly status: number) {
        super('API request failed');
        this.name = 'ApiError';
    }
}

function getApiUrl(): string {
    const url =
        process.env.NEXT_PUBLIC_API_URL ??
        'http://127.0.0.1:3000';

    if (
        url !== 'http://127.0.0.1:3000' &&
        url !== 'http://localhost:3000'
    ) {
        throw new Error('Invalid demo API URL');
    }

    return url;
}

export function getErrorMessage(
    error: unknown,
): string {
    if (error instanceof ApiError) {
        switch (error.status) {
            case 400:
                return 'Solicitação inválida.';

            case 401:
                return 'Token inválido ou sessão não autorizada.';

            case 403:
                return 'Acesso não autorizado.';

            case 409:
                return 'Esta sessão está processando outra operação.';

            case 429:
                return 'Limite de mensagens atingido. Aguarde antes de tentar novamente.';

            case 503:
                return 'Serviço temporariamente indisponível.';
        }
    }

    return 'Não foi possível concluir a comunicação. O resultado de uma operação já enviada pode estar pendente.';
}

export async function authenticate(
    token: string,
): Promise<CustomerIdentity> {
    const response = await fetch(
        `${getApiUrl()}/auth/me`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
            },

            credentials: 'omit',
            cache: 'no-store',
            redirect: 'error',

            signal: AbortSignal.timeout(5000),
        },
    );

    if (!response.ok) {
        throw new ApiError(response.status);
    }

    const payload: unknown = await response.json();

    return identitySchema.parse(payload);
}

function validateResponse(
    payload: unknown,
    sessionId: string,
): ChatResponse {
    const result = chatResponseSchema.parse(payload);

    if (result.sessionId !== sessionId) {
        throw new Error('Invalid response session');
    }

    return result;
}

export async function sendChat(
    token: string,
    body: ChatRequest,
    signal: AbortSignal,
): Promise<ChatResponse> {
    const response = await fetch(
        `${getApiUrl()}/chat`,
        {
            method: 'POST',

            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },

            body: JSON.stringify(body),

            credentials: 'omit',
            cache: 'no-store',
            redirect: 'error',

            signal: AbortSignal.any([
                signal,
                AbortSignal.timeout(50_000),
            ]),
        },
    );

    if (!response.ok) {
        throw new ApiError(response.status);
    }

    const payload: unknown = await response.json();

    return validateResponse(
        payload,
        body.sessionId,
    );
}

const progressLabels = new Map([
    ['message.received', 'Mensagem recebida'],
    ['memory.started', 'Recuperando contexto'],
    ['model.started', 'Analisando sua solicitação'],
    ['tool.started', 'Consultando informações'],
    ['answer.started', 'Preparando resposta'],
    ['persistence.started', 'Salvando conversa'],
    ['confirmation.started', 'Processando sua decisão'],
]);

const deltaSchema = z.object({
    text: z.string().max(4000),
});

function parseEvent(frame: string) {
    let event = 'message';

    const data: string[] = [];

    for (const line of frame.split(/\r?\n/)) {
        if (line.startsWith('event:')) {
            event = line.slice(6).trim();
        }

        if (line.startsWith('data:')) {
            data.push(
                line.slice(5).replace(/^ /, ''),
            );
        }
    }

    if (data.length === 0) {
        return null;
    }

    const payload: unknown = JSON.parse(
        data.join('\n'),
    );

    return {
        event,
        payload,
    };
}

export async function streamChat(
    token: string,
    body: ChatRequest,
    signal: AbortSignal,
    onUpdate: (update: StreamUpdate) => void,
): Promise<ChatResponse> {
    const response = await fetch(
        `${getApiUrl()}/chat/stream`,
        {
            method: 'POST',

            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                Accept: 'text/event-stream',
            },

            body: JSON.stringify(body),

            credentials: 'omit',
            cache: 'no-store',
            redirect: 'error',

            signal: AbortSignal.any([
                signal,
                AbortSignal.timeout(50_000),
            ]),
        },
    );

    if (!response.ok) {
        throw new ApiError(response.status);
    }

    if (
        !response.body ||
        !response.headers
            .get('content-type')
            ?.toLowerCase()
            .startsWith('text/event-stream')
    ) {
        throw new Error('Invalid streaming response');
    }

    const reader = response.body.getReader();

    const decoder = new TextDecoder('utf-8', {
        fatal: true,
    });

    let buffer = '';
    let receivedBytes = 0;
    let answerLength = 0;

    try {
        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                break;
            }

            receivedBytes += value.byteLength;

            if (receivedBytes > 64 * 1024) {
                throw new Error('Stream limit exceeded');
            }

            buffer += decoder.decode(value, {
                stream: true,
            });

            while (true) {
                const boundary = /\r?\n\r?\n/.exec(buffer);

                if (!boundary) {
                    break;
                }

                const frame = buffer.slice(
                    0,
                    boundary.index,
                );

                buffer = buffer.slice(
                    boundary.index + boundary[0].length,
                );

                const parsed = parseEvent(frame);

                if (!parsed) {
                    continue;
                }

                const { event, payload } = parsed;

                if (event === 'error') {
                    const failure = z.object({
                        code: z.string(),
                    }).safeParse(payload);

                    throw new ApiError(
                        failure.success &&
                            failure.data.code === 'SESSION_BUSY'
                            ? 409
                            : 503,
                    );
                }

                if (event === 'response.completed') {
                    return validateResponse(
                        payload,
                        body.sessionId,
                    );
                }

                if (event === 'response.delta') {
                    const { text } =
                        deltaSchema.parse(payload);

                    answerLength += text.length;

                    if (answerLength > 4000) {
                        throw new Error('Answer limit exceeded');
                    }

                    onUpdate({
                        kind: 'delta',
                        text,
                    });

                    continue;
                }

                const label = progressLabels.get(event);

                if (label) {
                    onUpdate({
                        kind: 'progress',
                        label,
                    });
                }
            }
        }

        throw new Error(
            'Stream ended without a final response',
        );
    } finally {
        await reader.cancel().catch(() => undefined);

        reader.releaseLock();
    }
}
