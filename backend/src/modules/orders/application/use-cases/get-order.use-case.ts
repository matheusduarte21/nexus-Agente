
import type { CustomerIdentity } from '../../../auth';
import type {
    OrderQuery,
    OrderView,
} from '../order-query';
import type { OrderReader } from '../ports/order-reader.port';
import { OrderAccessPolicy } from '../../domain/policies/order-access.policy';
import { InvalidOrderIdError } from '../errors/invalid-order-id.error';

export class GetOrderUseCase implements OrderQuery {
    constructor(
        private readonly orderReader: OrderReader,
        private readonly accessPolicy: OrderAccessPolicy,
    ) { }

    public async execute(customer: CustomerIdentity,orderId: string): Promise<OrderView | null> {
        this.validateOrderId(orderId);

        if (!customer.customerId) {
            return null;
        }

        const order =
            await this.orderReader.findByIdForCustomer(orderId,customer.customerId);

        if (!order) {
            return null;
        }

        if (order.id !== orderId) {
            return null;
        }

        if (!this.accessPolicy.canRead(customer.customerId,order)) {
            return null;
        }

        return {
            id: order.id,
            status: order.status,
            estimatedDelivery: order.estimatedDelivery,
            total: order.total,
            canCancel: order.canCancel,
        };
    }

    //ver possibilidade de colocar em um validador de id de pedido separado, para ser usado em outros casos de uso
    private validateOrderId(orderId: string): void {
        if (
            orderId.length === 0 ||
            orderId.length > 64 ||
            /[^A-Za-z0-9_-]/.test(orderId)
        ) {
            throw new InvalidOrderIdError();
        }
    }
}
