
import { z } from 'zod';

export const orderResponseSchema = z
    .object({
        id: z
            .string()
            .min(1)
            .max(64)
            .regex(/^[A-Za-z0-9_-]+$/),

        customerId: z
            .string()
            .min(1)
            .max(128)
            .regex(/^[A-Za-z0-9_-]+$/),

        status: z.string().min(1).max(64),

        estimatedDelivery: z
            .string()
            .date()
            .nullable(),

        total: z.number().finite().nonnegative(),

        canCancel: z.boolean(),
    })
    .strict();
