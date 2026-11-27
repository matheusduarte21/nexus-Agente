import { Module } from '@nestjs/common';

import {
    ConfigModule,
    ConfigService,
} from '@nestjs/config';

import type { Environment } from '../../config/env.schema';

import {
    OrdersModule,
    GET_ORDER,
} from '../orders';

import type { OrderQuery } from '../orders';

import {
    DatabaseModule,
} from '../../platform/database/database.module';

import {
    DatabaseService,
} from '../../platform/database/database.service';

import {
    CANCELLATION_WORKFLOW,
} from './application/cancellation-workflow';

import {
    CancellationService,
} from './application/cancellation.service';

import {
    PostgresCancellationStore,
} from './infrastructure/postgres-cancellation.store';

import {
    HttpCancellationGateway,
} from './infrastructure/http-cancellation.gateway';

import type {
    CancellationGateway,
} from './application/ports/cancellation-gateway.port';

@Module({
    imports: [
        ConfigModule,
        OrdersModule,
        DatabaseModule,
    ],

    providers: [
        {
            provide: CANCELLATION_WORKFLOW,

            inject: [
                GET_ORDER,
                DatabaseService,
                ConfigService,
            ],

            useFactory: (
                orders: OrderQuery,
                database: DatabaseService,
                config: ConfigService<Environment, true>,
            ): CancellationService => {
                const store =
                    new PostgresCancellationStore(database);

                let gateway: CancellationGateway;

                if (
                    config.getOrThrow('NODE_ENV', {
                        infer: true,
                    }) === 'test'
                ) {
                    gateway = {
                        request: () =>
                            Promise.reject(
                                new Error('Test gateway not configured'),
                            ),
                    };
                } else {
                    gateway = new HttpCancellationGateway(
                        config.getOrThrow('ORDER_API_BASE_URL'),
                        config.getOrThrow('ORDER_API_TOKEN'),
                    );
                }

                return new CancellationService(
                    orders,
                    store,
                    gateway,
                );
            },
        },
    ],

    exports: [CANCELLATION_WORKFLOW],
})
export class CancellationModule { }