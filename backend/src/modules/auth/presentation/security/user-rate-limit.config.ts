
import {
    InternalServerErrorException,
} from '@nestjs/common';

import type {
    ThrottlerModuleOptions,
} from '@nestjs/throttler';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { IAuthenticatedRequest } from '../http/authenticated-request';


export const USER_REQUEST_LIMIT = 60;

export function createUserRateLimitOptions():
    ThrottlerModuleOptions {
    return [
        {
            ttl: 60_000,

            limit: USER_REQUEST_LIMIT,

            blockDuration: 60_000,

            skipIf: (context) =>
                Reflect.getMetadata(
                    IS_PUBLIC_KEY,
                    context.getHandler(),
                ) === true,

            getTracker: (_request, context): string => {
                const request = context
                    .switchToHttp()
                    .getRequest<IAuthenticatedRequest>();

                const customerId =
                    request.authenticatedCustomer?.customerId;

                if (!customerId) {
                    throw new InternalServerErrorException();
                }

                return customerId;
            },

            generateKey: (
                _context,
                tracker,
                name,
            ): string => {
                return `user:${name}:${tracker}`;
            },
        },
    ];
}
