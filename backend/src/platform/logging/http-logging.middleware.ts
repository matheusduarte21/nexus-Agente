
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';

import type { RequestHandler } from 'express';
import { PinoLogger } from 'nestjs-pino';

export const CORRELATION_HEADER = 'x-correlation-id';

export function createHttpLoggingMiddleware(): RequestHandler {
    return (request, response, next): void => {
        const correlationId = randomUUID();
        const startedAt = performance.now();

        request.id = correlationId;

        response.setHeader(
            CORRELATION_HEADER,
            correlationId,
        );

        const logger = PinoLogger.root.child({
            correlationId,
            component: 'http',
        });

        let logged = false;

        const logCompletion = (): void => {
            if (logged) {
                return;
            }

            logged = true;

            const completed = response.writableFinished;

            const durationMs = Number(
                (performance.now() - startedAt).toFixed(2),
            );

            const event = {
                event: completed
                    ? 'http.request.completed'
                    : 'http.request.aborted',

                method: request.method,

                statusCode: completed
                    ? response.statusCode
                    : null,

                durationMs,
            };

            if (!completed) {
                logger.warn(event, 'HTTP request aborted');
                return;
            }

            if (response.statusCode >= 500) {
                logger.error(event, 'HTTP request failed');
                return;
            }

            if (response.statusCode >= 400) {
                logger.warn(event, 'HTTP request rejected');
                return;
            }

            logger.info(event, 'HTTP request completed');
        };

        response.once('finish', logCompletion);
        response.once('close', logCompletion);

        next();
    };
}
