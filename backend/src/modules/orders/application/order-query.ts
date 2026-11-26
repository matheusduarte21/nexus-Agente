
import type { CustomerIdentity } from '../../auth';

export const GET_ORDER = Symbol('GET_ORDER');

export interface OrderView {
    readonly id: string;
    readonly status: string;
    readonly estimatedDelivery: string | null;
    readonly total: number;
    readonly canCancel: boolean;
}

export interface OrderQuery {
    execute(customer: CustomerIdentity,orderId: string): Promise<OrderView | null>;
}
