
import { z } from 'zod';

export const getOrderSchema = z
    .object({
        orderId: z
            .string()
            .min(1)
            .max(64)
            .regex(/^[A-Za-z0-9_-]+$/),
    })
    .strict();

export const searchKnowledgeSchema = z
    .object({
        query: z
            .string()
            .trim()
            .min(1)
            .max(2000),
    })
    .strict();

export const TOOL_DEFINITIONS = [
    {
        type: 'function' as const,

        function: {
            name: 'get_order',

            description:
                'Retrieve an order belonging to the authenticated customer.',

            strict: true,

            parameters: {
                type: 'object',

                properties: {
                    orderId: {
                        type: 'string',
                        description: 'Order identifier provided by the customer.',
                    },
                },

                required: ['orderId'],

                additionalProperties: false,
            },
        },
    },

    {
        type: 'function' as const,

        function: {
            name: 'search_knowledge',

            description:
                'Search approved corporate documents about delivery, returns and cancellation policies.',

            strict: true,

            parameters: {
                type: 'object',

                properties: {
                    query: {
                        type: 'string',
                        description: 'Search query about corporate policies.',
                    },
                },

                required: ['query'],

                additionalProperties: false,
            },
        },
    },
];
