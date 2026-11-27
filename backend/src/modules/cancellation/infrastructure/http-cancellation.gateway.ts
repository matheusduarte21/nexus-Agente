import type { CustomerIdentity } from '../../auth';

import type {
    CancellationGateway,
} from '../application/ports/cancellation-gateway.port';

export class HttpCancellationGateway
    implements CancellationGateway {
    constructor(
        private readonly baseUrl: string,
        private readonly serviceToken: string,
    ) { }

    public async request(
        customer: CustomerIdentity,
        orderId: string,
        idempotencyKey: string,
    ): Promise<void> {
        const url = new URL(
            `/orders/${encodeURIComponent(orderId)}/cancellation-request`,
            this.baseUrl,
        );

        const response = await fetch(url, {
            method: 'POST',

            headers: {
                Authorization: `Bearer ${this.serviceToken}`,
                'X-Customer-Id': customer.customerId,
                'Idempotency-Key': idempotencyKey,
                Accept: 'application/json',
            },

            signal: AbortSignal.timeout(3000),

            redirect: 'error',
        });

        // The mock API confirms acceptance with HTTP 202.
        await response.body?.cancel();

        if (response.status !== 202) {
            throw new Error('Cancellation provider unavailable');
        }
    }
}