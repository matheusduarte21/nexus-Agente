
import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';

import { CORRELATION_HEADER } from '../../logging/http-logging.middleware';

export const IP_REQUEST_LIMIT = 120;
export const RATE_LIMIT_WINDOW_MS = 60_000;
//colocar em um const 

export function createIpRateLimitMiddleware(
    limit = IP_REQUEST_LIMIT,
): RequestHandler {
    return rateLimit({
        windowMs: RATE_LIMIT_WINDOW_MS,

        limit,

        standardHeaders: 'draft-7',

        legacyHeaders: false,

        skipSuccessfulRequests: false,

        skipFailedRequests: false,

        passOnStoreError: false,

        handler: (_request, response): void => {
            const correlationId = response.getHeader(
                CORRELATION_HEADER,
            );

            response.setHeader(
                'Cache-Control',
                'no-store',
            );

            response.status(429).json({
                statusCode: 429,

                message: 'Too Many Requests',

                correlationId:
                    typeof correlationId === 'string'
                        ? correlationId
                        : undefined,
            });
        },
    });
}
