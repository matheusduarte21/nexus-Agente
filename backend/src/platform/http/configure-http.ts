
import type { NestExpressApplication } from '@nestjs/platform-express';

import helmet from 'helmet';

import {
    CORRELATION_HEADER,
    createHttpLoggingMiddleware,
} from '../logging/http-logging.middleware';

import {
    createIpRateLimitMiddleware,
    IP_REQUEST_LIMIT,
} from './security/ip-rate-limit.middleware';

export function configureHttp(
    app: NestExpressApplication,
    corsOrigin?: string,
    ipLimit = IP_REQUEST_LIMIT,
): void {
    app.use(createHttpLoggingMiddleware());

    app.use(helmet());

    app.disable('x-powered-by');

    app.set('trust proxy', false);

    if (corsOrigin) {
        app.enableCors({
            origin: corsOrigin,

            methods: [
                'GET',
                'POST',
                'OPTIONS',
            ],

            allowedHeaders: [
                'Content-Type',
                'Authorization',
                'Accept',
            ],

            exposedHeaders: [
                CORRELATION_HEADER,
                'Retry-After',
                'RateLimit',
                'RateLimit-Policy',
                'X-RateLimit-Limit',
                'X-RateLimit-Remaining',
                'X-RateLimit-Reset',
            ],

            credentials: false,

            maxAge: 600,
        });
    }

    app.use(
        createIpRateLimitMiddleware(ipLimit),
    );

    app.useBodyParser('json', {
        limit: '32kb',
        inflate: false,
    });
}
