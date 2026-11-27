import type { CustomerIdentity } from '../../../auth';

export interface CancellationGateway {
    request(
        customer: CustomerIdentity,
        orderId: string,
        idempotencyKey: string,
    ): Promise<void>;
}