
import type { IOrder } from '../order';

export class OrderAccessPolicy {
    public canRead(customerId: string,order: IOrder): boolean {
        return (
            customerId.length > 0 &&
            customerId === order.customerId
        );
    }
}
