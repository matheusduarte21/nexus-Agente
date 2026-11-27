
import { AgentReply, AgentResult } from '../../agent-query';
import { cancellationReply } from '../../cancellation-reply';
import { AgentModel } from '../../ports/agent-model.port';
import {
    knowledgeAnswerSchema,
} from '../llm/knowledge-answer.schema';

const orderStatuses = new Map([
    ['delayed', 'atrasado'],
    ['shipped', 'enviado'],
    ['delivered', 'entregue'],
    ['processing', 'em processamento'],
    ['cancelled', 'cancelado'],
]);

export const UNAVAILABLE_REPLY: AgentReply = {
    status: 'unavailable',
    answer:
        'Não consegui consultar as informações neste momento. Tente novamente mais tarde.',
    sources: [],
};

export const NO_EVIDENCE_REPLY: AgentReply = {
    status: 'no_evidence',
    answer:
        'Não encontrei informações suficientes na base de conhecimento para responder à sua pergunta.',
    sources: [],
};

export async function composeAgentReply(
    model: AgentModel,
    message: string,
    result: AgentResult,
    signal?: AbortSignal,
): Promise<AgentReply> {
    switch (result.kind) {
        case 'order': {
            const order = result.order;

            const status =
                orderStatuses.get(order.status) ??
                'não reconhecido';

            const delivery =
                order.estimatedDelivery ??
                'Não informada';

            return {
                status: 'answered',

                answer: [
                    `Pedido: ${order.id}`,
                    `Status: ${status}`,
                    `Previsão de entrega: ${delivery}`,
                    `Valor total informado: ${order.total.toLocaleString('pt-BR')}`,
                    `Elegível para solicitar cancelamento: ${order.canCancel ? 'Sim' : 'Não'}`,
                ].join('\n'),

                sources: [],
            };
        }

        case 'cancellation':
            return cancellationReply(result.cancellation);

        case 'knowledge': {
            if (result.knowledge.status === 'unavailable') {
                return UNAVAILABLE_REPLY;
            }

            if (result.knowledge.status === 'no_evidence') {
                return NO_EVIDENCE_REPLY;
            }

            const evidence = result.knowledge.evidence;

            if (evidence.length === 0) {
                return NO_EVIDENCE_REPLY;
            }

            try {
                const draft =
                    await model.generateKnowledgeAnswer(
                        message,
                        evidence,
                        signal,
                    );

                const parsed =
                    knowledgeAnswerSchema.safeParse(draft);

                if (
                    !parsed.success ||
                    parsed.data.status !== 'answered'
                ) {
                    return NO_EVIDENCE_REPLY;
                }

                const answer = parsed.data.answer.trim();

                const citationIds =
                    parsed.data.citationIds;

                if (
                    !answer ||
                    answer.length > 4000 ||
                    citationIds.length === 0 ||
                    citationIds.length > 5
                ) {
                    return NO_EVIDENCE_REPLY;
                }

                const citations = new Map(
                    evidence.map((item:any) => [
                        item.citation.chunkId,
                        item.citation,
                    ]),
                );

                const sources: AgentReply['sources'][number][] = [];

                for (const id of new Set(citationIds)) {
                    const citation = citations.get(id);

                    if (!citation) {
                        return NO_EVIDENCE_REPLY;
                    }

                    sources.push(citation);
                }

                return {
                    status: 'answered',
                    answer,
                    sources,
                };
            } catch {
                return UNAVAILABLE_REPLY;
            }
        }

        case 'not_found':
            return {
                status: 'not_found',

                answer:
                    'Não localizei esse pedido entre os recursos disponíveis para sua conta. Verifique o número informado.',

                sources: [],
            };

        case 'no_tool':
            return {
                status: 'needs_input',

                answer:
                    'Olá! Posso ajudar com pedidos, entregas e políticas de devolução ou cancelamento. Como posso ajudar?',

                sources: [],
            };

        case 'invalid_tool':
            return {
                status: 'invalid_tool',

                answer:
                    'Não consegui interpretar sua solicitação. Por favor, reformule a pergunta.',

                sources: [],
            };

        case 'unavailable':
            return UNAVAILABLE_REPLY;
    }
}