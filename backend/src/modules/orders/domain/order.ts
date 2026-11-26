
export interface IOrder {
    readonly id: string;
    readonly customerId: string;
    readonly status: string;
    readonly estimatedDelivery: string | null;
    readonly total: number;
    readonly canCancel: boolean;
}
