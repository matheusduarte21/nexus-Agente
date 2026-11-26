
import {
    BadRequestException,
    Controller,
    Get,
    Inject,
    NotFoundException,
    Param,
    Query,
} from '@nestjs/common';

import { CurrentUser } from '../../auth';
import type { CustomerIdentity } from '../../auth';

import { ZodValidationPipe } from '../../../platform/http/validation/zod-validation.pipe';

import { GET_ORDER } from '../application/order-query';

import type {
    OrderQuery,
    OrderView,
} from '../application/order-query';

import { InvalidOrderIdError } from '../application/errors/invalid-order-id.error';

import {
    orderParamsSchema,
    orderQueryParamsSchema,
} from './schemas/order-request.schema';

import type {
    OrderParams,
} from './schemas/order-request.schema';

@Controller('orders')
export class OrdersController {
    constructor(
        @Inject(GET_ORDER)
        private readonly orderQuery: OrderQuery,
    ) { }

    @Get(':id')
    public async getOrder(
        @CurrentUser() customer: CustomerIdentity,

        @Param(new ZodValidationPipe(orderParamsSchema))
        params: OrderParams,

        @Query(new ZodValidationPipe(orderQueryParamsSchema))
        query: unknown,
    ): Promise<OrderView> {
        // This endpoint does not accept query parameters.
        //verificar esse void aq
        void query;

        try {
            const order = await this.orderQuery.execute(
                customer,
                params.id,
            );

            if (!order) {
                throw new NotFoundException();
            }

            return order;
        } catch (error: unknown) {
            if (error instanceof InvalidOrderIdError) {
                throw new BadRequestException();
            }

            throw error;
        }
    }
}
