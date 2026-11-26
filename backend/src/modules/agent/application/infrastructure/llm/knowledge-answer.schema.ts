import { z } from 'zod';

export const knowledgeAnswerSchema = z
    .object({
        status: z.enum([
            'answered',
            'insufficient_evidence',
        ]),

        answer: z.string(),

        citationIds: z.array(z.string()),
    })
    .strict();