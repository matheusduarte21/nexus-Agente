import { CancellationContext, CancellationOutcome } from "../cancellation-workflow";

export interface ClaimedCancellation {
    readonly kind: 'claimed';
    readonly requestId: string;
    readonly orderId: string;
    readonly idempotencyKey: string;
}

export interface CancellationStore {
    prepare(
        context: CancellationContext,
        orderId: string,
    ): Promise<CancellationOutcome>;

    decide(
        context: CancellationContext,
        requestId: string,
        decision: 'confirm' | 'reject',
    ): Promise<ClaimedCancellation | CancellationOutcome>;

    finish(
        context: CancellationContext,
        requestId: string,
        status: 'requested' | 'failed',
    ): Promise<void>;
}