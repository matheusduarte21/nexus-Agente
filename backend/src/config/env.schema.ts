
import { z } from 'zod';

const httpOriginSchema = z.string().refine((value) => {
    try {
        const url = new URL(value);

        return (
            ['http:', 'https:'].includes(url.protocol) &&
            url.origin === value
        );
    } catch {
        return false;
    }
}, 'Invalid HTTP origin');

export const envSchema = z.object({
    NODE_ENV: z
        .enum(['development', 'test', 'production'])
        .default('development'),

    LOG_LEVEL: z
        .enum(['debug', 'info', 'warn', 'error'])
        .default('info'),

    DATABASE_URL: z
        .string()
        .refine((value) => {
            try {
                const url = new URL(value);

                return (
                    ['postgres:', 'postgresql:'].includes(
                        url.protocol,
                    ) &&
                    url.username === 'nexus_app' &&
                    url.password.length > 0 &&
                    url.hostname.length > 0 &&
                    url.pathname.length > 1 &&
                    url.hash === ''
                );
            } catch {
                return false;
            }
        }, 'Invalid application database connection')
        .optional(),

    ORDER_API_BASE_URL: z
        .string()
        .refine((value) => {
            try {
                const url = new URL(value);

                return (
                    url.protocol === 'http:' &&
                    url.hostname === '127.0.0.1' &&
                    url.port !== '' &&
                    url.origin === value
                );
            } catch {
                return false;
            }
        }, 'Invalid Order API URL')
        .optional(),
    LANGFUSE_ENABLED: z
        .enum(['true', 'false'])
        .default('false')
        .transform((value) => value === 'true'),

    LANGFUSE_BASE_URL: z
        .enum([
            'https://cloud.langfuse.com',
            'https://us.cloud.langfuse.com',
        ])
        .default('https://cloud.langfuse.com'),

    LANGFUSE_PUBLIC_KEY: z
        .string()
        .trim()
        .min(1)
        .optional(),

    LANGFUSE_SECRET_KEY: z
        .string()
        .trim()
        .min(1)
        .optional(),

    ORDER_API_TOKEN: z
        .string()
        .length(64)
        .regex(/^[a-f0-9]{64}$/)
        .optional(),
    LLM_PROVIDER: z
        .enum(['mock', 'openai'])
        .default('mock'),

    LLM_MODEL: z
        .string()
        .trim()
        .min(1)
        .max(100)
        .default('gpt-5.4-mini'),

    EMBEDDING_PROVIDER: z
        .enum(['mock', 'openai'])
        .default('mock'),

    OPENAI_API_KEY: z
        .string()
        .trim()
        .min(1)
        .optional(),



    PORT: z
        .string()
        .regex(/^\d+$/)
        .default('3000')
        .transform(Number)
        .pipe(z.number().int().min(1).max(65535)),

    HOST: z
        .enum(['127.0.0.1', '0.0.0.0'])
        .default('127.0.0.1'),

    DEMO_CUSTOMER_001_TOKEN_HASH: z
        .string()
        .regex(/^[a-f0-9]{64}$/)
        .optional(),

    DEMO_CUSTOMER_002_TOKEN_HASH: z
        .string()
        .regex(/^[a-f0-9]{64}$/)
        .optional(),
    CORS_ORIGIN: httpOriginSchema.optional(),
    }).superRefine((env, ctx) => {
        if (env.NODE_ENV === 'test') {
            return;
        }

        const requiredFields = [
            'DATABASE_URL',
            'ORDER_API_BASE_URL',
            'ORDER_API_TOKEN',
        ] as const;

        for (const field of requiredFields) {
            if (!env[field]) {
                ctx.addIssue({
                    code: 'custom',
                    path: [field],
                    message: 'Required configuration',
                });
            }
        }

        if (
            (env.LLM_PROVIDER === 'openai' ||
                env.EMBEDDING_PROVIDER === 'openai') &&
            !env.OPENAI_API_KEY
        ) {
            ctx.addIssue({
                code: 'custom',
                path: ['OPENAI_API_KEY'],
                message: 'Required OpenAI configuration',
            });
        }

        if (env.LANGFUSE_ENABLED) {
            for (const field of [
                'LANGFUSE_PUBLIC_KEY',
                'LANGFUSE_SECRET_KEY',
            ] as const) {
                if (!env[field]) {
                    ctx.addIssue({
                        code: 'custom',
                        path: [field],
                        message: 'Required Langfuse configuration',
                    });
                }
            }
        }
    });

export type Environment = z.infer<typeof envSchema>;

export function validateEnvironment(
    config: Record<string, unknown>,
): Environment {
    const result = envSchema.safeParse(config);

    if (!result.success) {
        const invalidFields = [
            ...new Set(
                result.error.issues.map((issue) =>
                    issue.path.join('.'),
                ),
            ),
        ];

        throw new Error(
            `Invalid environment configuration: ${invalidFields.join(', ')}`,
        );
    }

    return result.data;
}
