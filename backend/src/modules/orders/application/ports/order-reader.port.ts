
import type { IOrder } from '../../domain/order';

export interface OrderReader {
    findByIdForCustomer(orderId: string, customerId: string): Promise<IOrder | null>;
}
