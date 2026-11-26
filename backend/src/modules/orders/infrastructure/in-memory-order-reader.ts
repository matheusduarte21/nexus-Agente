
import type { IOrder } from '../domain/order';
import type { OrderReader } from '../application/ports/order-reader.port';

const ORDERS: readonly IOrder[] = [
    {
        id: '12345',
        customerId: 'customer-001',
        status: 'delayed',
        estimatedDelivery: '2026-11-25',
        total: 299.9,
        canCancel: true,
    },
    {
        id: '67890',
        customerId: 'customer-002',
        status: 'shipped',
        estimatedDelivery: '2026-11-28',
        total: 599.9,
        canCancel: false,
    },
];

export class InMemoryOrderReader
    implements OrderReader {
    public findByIdForCustomer(
        orderId: string,
        customerId: string,
    ): Promise<IOrder | null> {
        const order = ORDERS.find(
            (item) =>
                item.id === orderId &&
                item.customerId === customerId,
        );

        return Promise.resolve(
            order ? { ...order } : null,
        );
    }
}
