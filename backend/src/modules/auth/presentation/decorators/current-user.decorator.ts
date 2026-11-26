
import {
    createParamDecorator,
    ExecutionContext,
    InternalServerErrorException,
} from '@nestjs/common';

import type { CustomerIdentity } from '../../domain/customer-identity';
import type { IAuthenticatedRequest } from '../http/authenticated-request';

export const CurrentUser = createParamDecorator((_data: unknown,context: ExecutionContext): CustomerIdentity => {
    const request = context
        .switchToHttp()
        .getRequest<IAuthenticatedRequest>();

    const identity = request.authenticatedCustomer;

    if (!identity) {
        throw new InternalServerErrorException();
    }

        return identity;
    },
);
