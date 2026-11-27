import { z } from 'zod';

export const identitySchema = z.object({
    customerId: z.string().min(1).max(128),
});

export const citationSchema = z.object({
    chunkId: z.string(),
    documentId: z.string(),
    sourceKey: z.string(),
    title: z.string(),
    version: z.number().int().positive(),
    chunkIndex: z.number().int().nonnegative(),
    pageNumber: z.number().int().positive().nullable(),
    section: z.string().nullable(),
});

export const confirmationSchema = z.object({
    requestId: z.string().uuid(),
    orderId: z.string().min(1).max(64),
    expiresAt: z.string().datetime(),
});

export const chatResponseSchema = z.object({
    sessionId: z.string(),

    status: z.enum([
        'answered',
        'no_evidence',
        'not_found',
        'needs_input',
        'invalid_tool',
        'unavailable',
        'confirmation_required',
        'cancellation_requested',
        'cancellation_rejected',
        'cancellation_processing',
        'cancellation_expired',
        'cancellation_not_eligible',
        'cancellation_conflict',
        'cancellation_failed',
    ]),

    answer: z.string().min(1).max(4000),

    sources: z.array(citationSchema).max(5),

    confirmation: confirmationSchema.optional(),
}).refine(
    (value) =>
        value.status === 'confirmation_required'
            ? value.confirmation !== undefined
            : value.confirmation === undefined,
    'Invalid confirmation response',
);

export type CustomerIdentity =
    z.infer<typeof identitySchema>;

export type KnowledgeCitation =
    z.infer<typeof citationSchema>;

export type PendingConfirmation =
    z.infer<typeof confirmationSchema>;

export type ChatResponse =
    z.infer<typeof chatResponseSchema>;

export interface ConfirmationDecision {
    requestId: string;
    decision: 'confirm' | 'reject';
}

export interface ChatRequest {
    sessionId: string;
    message: string;
    confirmation?: ConfirmationDecision;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sources?: KnowledgeCitation[];
}

export type StreamUpdate =
    | {
        kind: 'progress';
        label: string;
    }
    | {
        kind: 'delta';
        text: string;
    };