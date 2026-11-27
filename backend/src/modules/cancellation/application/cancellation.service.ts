
import type { OrderQuery } from '../../orders';

import type {
    CancellationContext,
    CancellationOutcome,
    CancellationWorkflow,
} from './cancellation-workflow';

import type {
    CancellationStore,
} from './ports/cancellation-store.port';

import type {
    CancellationGateway,
} from './ports/cancellation-gateway.port';

export class CancellationService
    implements CancellationWorkflow {
    constructor(
        private readonly orders: OrderQuery,
        private readonly store: CancellationStore,
        private readonly gateway: CancellationGateway,
    ) { }

    public async prepare(
        context: CancellationContext,
        orderId: string,
    ): Promise<CancellationOutcome> {
        try {
            const order = await this.orders.execute(
                context.customer,
                orderId,
            );

            if (!order) {
                return { kind: 'not_found' };
            }

            if (!order.canCancel) {
                return { kind: 'not_eligible' };
            }
            
            return await this.store.prepare(
                context,
                orderId,
            );
        } catch {
            return { kind: 'unavailable' };
        }
    }

    public async decide(
        context: CancellationContext,
        requestId: string,
        decision: 'confirm' | 'reject',
    ): Promise<CancellationOutcome> {
        try {
            const claimed = await this.store.decide(
                context,
                requestId,
                decision,
            );

            if (claimed.kind !== 'claimed') {
                return claimed;
            }

            try {
                const order = await this.orders.execute(
                    context.customer,
                    claimed.orderId,
                );

                if (!order || !order.canCancel) {
                    await this.store.finish(
                        context,
                        requestId,
                        'failed',
                    );

                    return {
                        kind: order
                            ? 'not_eligible'
                            : 'not_found',
                    };
                }
            } catch {
                await this.store.finish(
                    context,
                    requestId,
                    'failed',
                );

                return { kind: 'unavailable' };
            }

            try {
                await this.gateway.request(
                    context.customer,
                    claimed.orderId,
                    claimed.idempotencyKey,
                );
            } catch {
                return { kind: 'processing' };
            }

            await this.store.finish(
                context,
                requestId,
                'requested',
            );

            return { kind: 'requested' };
        } catch {
            return { kind: 'unavailable' };
        }
    }
}
