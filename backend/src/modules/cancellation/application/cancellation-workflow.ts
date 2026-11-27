
import type { CustomerIdentity } from '../../auth';

export const CANCELLATION_WORKFLOW = Symbol(
    'CANCELLATION_WORKFLOW',
);

export interface CancellationContext {
    readonly customer: CustomerIdentity;
    readonly sessionId: string;
    readonly correlationId: string;
}

export interface PendingConfirmation {
    readonly requestId: string;
    readonly orderId: string;
    readonly expiresAt: string;
}

export type CancellationOutcome =
    | {
        readonly kind: 'confirmation_required';
        readonly confirmation: PendingConfirmation;
    }
    | {
        readonly kind:
        | 'requested'
        | 'rejected'
        | 'expired'
        | 'not_found'
        | 'not_eligible'
        | 'conflict'
        | 'processing'
        | 'failed'
        | 'unavailable';
    };

export interface CancellationWorkflow {
    prepare(
        context: CancellationContext,
        orderId: string,
    ): Promise<CancellationOutcome>;

    decide(
        context: CancellationContext,
        requestId: string,
        decision: 'confirm' | 'reject',
    ): Promise<CancellationOutcome>;
}
