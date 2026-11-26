
import { z } from 'zod';

export const orderParamsSchema = z
    .object({
        id: z
            .string()
            .min(1)
            .max(64)
            .refine(
                (value) => !/[^A-Za-z0-9_-]/.test(value),
                'Invalid order identifier',
            ),
    })
    .strict();

export const orderQueryParamsSchema = z
    .object({})
    .strict();

export type OrderParams = z.infer<
    typeof orderParamsSchema
>;
