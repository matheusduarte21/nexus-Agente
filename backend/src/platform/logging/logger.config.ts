import type { LoggerOptions } from 'pino';
import type { Environment } from '../../config/env.schema';

export function createLoggerOptions(
  level: Environment['LOG_LEVEL'],
): LoggerOptions {
  return {
    level,

    hooks: {
      logMethod(args, method) {
        const [argument, ...rest] = args;
        let safeArgument = argument;

        if (argument instanceof Error) {
          safeArgument = { err: { type: 'Error' } };
        } else if (
          typeof argument === 'object' &&
          argument !== null &&
          'err' in argument &&
          argument.err instanceof Error
        ) {
          safeArgument = {
            ...argument,
            err: { type: 'Error' },
          };
        }

        method.apply(this, [safeArgument, ...rest]);
      },
    },

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
        'OPENAI_API_KEY',
        'LANGFUSE_PUBLIC_KEY',
        'LANGFUSE_SECRET_KEY',
        'ORDER_API_TOKEN',
        'DATABASE_URL',
        'MIGRATION_DATABASE_URL',
        'INGESTION_DATABASE_URL',
        'api_key',
        'secretKey',
        'serviceToken',
        'credentials',
        'credential',
        'embedding',
        'embeddings',
        'evidence',
        'toolArguments',
        'toolResults',
        '*.secretKey',
        '*.serviceToken',
        '*.credentials',
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
