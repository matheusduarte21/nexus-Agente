import { AsyncLocalStorage } from 'node:async_hooks';
import { performance } from 'node:perf_hooks';
import { Logger } from '@nestjs/common';

import {
    startObservation,
} from '@langfuse/tracing';

import type {
    LangfuseSpan,
} from '@langfuse/tracing';

type Stage =
    | 'memory'
    | 'model'
    | 'tool'
    | 'answer'
    | 'confirmation'
    | 'persistence';

type GenerationName =
    | 'llm.select'
    | 'llm.answer'
    | 'embedding';

export type ProgressEvent =
    `${Stage}.${'started' | 'completed'}`;

export type ProgressListener = (
    event: ProgressEvent,
    data: {
        durationMs?: number;
        outcome?: 'completed' | 'failed';
    },
) => void;

interface TraceContext {
    readonly correlationId: string;
    readonly listener?: ProgressListener;
    readonly root?: LangfuseSpan;
}

interface TokenUsage {
    input: number;
    output: number;
    total: number;
}

type RecordUsage = (
    input: number | undefined,
    output: number | undefined,
) => void;

const storage =
    new AsyncLocalStorage<TraceContext>();

const logger = new Logger('AiTelemetry');

let tracingEnabled = false;

export function setTracingEnabled(
    enabled: boolean,
): void {
    tracingEnabled = enabled;
}

function safely<T>(
    work: () => T,
): T | undefined {
    try {
        return work();
    } catch {
        return undefined;
    }
}

function elapsed(startedAt: number): number {
    return Number(
        (performance.now() - startedAt).toFixed(2),
    );
}

function publish(
    event: ProgressEvent,
    data: Parameters<ProgressListener>[1],
): void {
    safely(() => {
        storage.getStore()?.listener?.(
            event,
            data,
        );
    });
}

export async function withChatTelemetry<T>(
    correlationId: string,
    work: () => Promise<T>,
    listener?: ProgressListener,
): Promise<T> {
    const startedAt = performance.now();

    const root = tracingEnabled
        ? safely(() =>
            startObservation('nexus.chat', {
                metadata: { correlationId },
            }),
        )
        : undefined;

    let outcome: 'completed' | 'failed' =
        'failed';

    return storage.run(
        {
            correlationId,
            listener,
            root,
        },
        async () => {
            try {
                const result = await work();

                outcome = 'completed';

                return result;
            } finally {
                const durationMs = elapsed(startedAt);

                safely(() => {
                    root?.update({
                        output: { outcome },
                    });
                });

                safely(() => root?.end());

                safely(() => {
                    logger.log({
                        event: 'ai.chat.finished',
                        correlationId,
                        durationMs,
                        outcome,
                    });
                });
            }
        },
    );
}

export async function observeStage<T>(
    stage: Stage,
    work: () => Promise<T>,
): Promise<T> {
    const context = storage.getStore();

    const startedAt = performance.now();

    const span = safely(() =>
        context?.root?.startObservation(
            `nexus.${stage}`,
        ),
    );

    let outcome: 'completed' | 'failed' =
        'failed';

    publish(`${stage}.started`, {});

    try {
        const result = await work();

        outcome = 'completed';

        return result;
    } finally {
        const durationMs = elapsed(startedAt);

        safely(() => {
            span?.update({
                output: { outcome },
            });
        });

        safely(() => span?.end());

        safely(() => {
            logger.log({
                event: 'ai.stage.finished',
                correlationId: context?.correlationId,
                stage,
                durationMs,
                outcome,
            });
        });

        publish(`${stage}.completed`, {
            durationMs,
            outcome,
        });
    }
}

export async function observeGeneration<T>(
    name: GenerationName,
    model: string,
    work: (recordUsage: RecordUsage) => Promise<T>,
): Promise<T> {
    const context = storage.getStore();

    const startedAt = performance.now();

    const generation = safely(() =>
        context?.root?.startObservation(
            `nexus.${name}`,
            { model },
            { asType: 'generation' },
        ),
    );

    let usage: TokenUsage | undefined;

    let outcome: 'completed' | 'failed' =
        'failed';

    try {
        const result = await work(
            (input, output) => {
                if (
                    input === undefined ||
                    output === undefined ||
                    !Number.isSafeInteger(input) ||
                    !Number.isSafeInteger(output) ||
                    input < 0 ||
                    output < 0 ||
                    !Number.isSafeInteger(input + output)
                ) {
                    return;
                }

                usage = {
                    input,
                    output,
                    total: input + output,
                };
            },
        );

        outcome = 'completed';

        return result;
    } finally {
        const durationMs = elapsed(startedAt);

        safely(() => {
            generation?.update({
                output: { outcome },

                ...(usage
                    ? {
                        usageDetails: {
                            input: usage.input,
                            output: usage.output,
                            total: usage.total,
                        },
                    }
                    : {}),
            });
        });

        safely(() => generation?.end());

        safely(() => {
            logger.log({
                event: 'ai.generation.finished',
                correlationId: context?.correlationId,
                operation: name,
                model,
                durationMs,
                outcome,
                usage: usage ?? null,
            });
        });
    }
}