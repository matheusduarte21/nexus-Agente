
import { Module } from '@nestjs/common';

import { GET_ORDER } from './application/order-query';
import type { OrderQuery } from './application/order-query';
import type { OrderReader } from './application/ports/order-reader.port';
import { GetOrderUseCase } from './application/use-cases/get-order.use-case';
import { OrderAccessPolicy } from './domain/policies/order-access.policy';
import { InMemoryOrderReader } from './infrastructure/in-memory-order-reader';
import { OrdersController } from './presentation/orders.controller';
const ORDER_READER = Symbol('ORDER_READER');

@Module({
    controllers: [OrdersController],

    providers: [
        {
            provide: ORDER_READER,
            useFactory: (): OrderReader =>
                new InMemoryOrderReader(),
        },

        {
            provide: GET_ORDER,

            inject: [ORDER_READER],

            useFactory: (
                reader: OrderReader,
            ): OrderQuery =>
                new GetOrderUseCase(
                    reader,
                    new OrderAccessPolicy(),
                ),
        },
    ],

    exports: [GET_ORDER],
})
export class OrdersModule { }
