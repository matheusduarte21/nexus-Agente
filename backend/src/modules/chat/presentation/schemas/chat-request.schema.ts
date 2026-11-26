import { z } from 'zod';

export const chatRequestSchema = z
    .object({
        sessionId: z
            .string()
            .min(1)
            .max(128)
            .refine(
                (value) => !/[^A-Za-z0-9_-]/.test(value),
            ),

        message: z
            .string()
            .trim()
            .min(1)
            .max(4000),

        userId: z
            .string()
            .min(1)
            .max(128)
            .optional(),
    })
    .strict();

export type ChatRequest = z.infer<
    typeof chatRequestSchema
>;