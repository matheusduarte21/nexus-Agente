
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import type { Environment } from '../../config/env.schema';

import { GET_ORDER } from './application/order-query';
import type { OrderQuery } from './application/order-query';

import type { OrderReader } from './application/ports/order-reader.port';

import { GetOrderUseCase } from './application/use-cases/get-order.use-case';

import { OrderAccessPolicy } from './domain/policies/order-access.policy';

import { InMemoryOrderReader } from './infrastructure/in-memory-order-reader';

import { HttpOrderReader } from './infrastructure/http-order-reader';

import { OrdersController } from './presentation/orders.controller';

const ORDER_READER = Symbol('ORDER_READER');

@Module({
    imports: [ConfigModule],

    controllers: [OrdersController],

    providers: [
        {
            provide: ORDER_READER,

            inject: [ConfigService],

            useFactory: (
                config: ConfigService<Environment, true>,
            ): OrderReader => {
                const environment = config.getOrThrow(
                    'NODE_ENV',
                    { infer: true },
                );

                if (environment === 'test') {
                    return new InMemoryOrderReader();
                }

                const baseUrl = config.get(
                    'ORDER_API_BASE_URL',
                    { infer: true },
                );

                const serviceToken = config.get(
                    'ORDER_API_TOKEN',
                    { infer: true },
                );

                if (!baseUrl || !serviceToken) {
                    throw new Error(
                        'Order API configuration is required',
                    );
                }

                return new HttpOrderReader(
                    baseUrl,
                    serviceToken,
                );
            },
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
