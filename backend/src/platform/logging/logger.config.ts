
import type { LoggerOptions } from 'pino';
import type { Environment } from '../../config/env.schema';

export function createLoggerOptions(
    level: Environment['LOG_LEVEL'],
): LoggerOptions {
    return {
        level,

        base: {
            service: 'nexus-commerce-api',
        },

        redact: {
            paths: [
                'password',
                'token',
                'accessToken',
                'refreshToken',
                'apiKey',
                'authorization',
                'headers.authorization',
                'headers.cookie',
                'req.headers.authorization',
                'req.headers.cookie',
                'res.headers["set-cookie"]',
                'req.body',
                'body',
                'prompt',
                'messages',
                'sessionId',
                '*.password',
                '*.token',
                '*.apiKey',
                '*.accessToken',
            ],

            censor: '[REDACTED]',
        },

        serializers: {
            req: () => undefined,
            res: () => undefined,
            err: () => ({ type: 'Error' }),
        },
    };
}
