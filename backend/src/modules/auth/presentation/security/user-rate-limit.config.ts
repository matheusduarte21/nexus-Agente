import {
    InternalServerErrorException,
    SetMetadata,
} from '@nestjs/common';

import type {
    ExecutionContext,
} from '@nestjs/common';

import type {
    ThrottlerModuleOptions,
} from '@nestjs/throttler';

import {
    IS_PUBLIC_KEY,
} from '../decorators/public.decorator';
import { IAuthenticatedRequest } from '../http/authenticated-request';


export const USER_REQUEST_LIMIT = 60;

export const CHAT_REQUEST_LIMIT = 5;

const CHAT_RATE_LIMIT_KEY =
    'nexus:auth:chat-rate-limit';

export const ChatRateLimited = (): MethodDecorator =>
    SetMetadata(CHAT_RATE_LIMIT_KEY, true);

function getCustomerTracker(
    _request: unknown,
    context: ExecutionContext,
): string {
    const request = context
        .switchToHttp()
        .getRequest<IAuthenticatedRequest>();

    const customerId =
        request.authenticatedCustomer?.customerId;

    if (!customerId) {
        throw new InternalServerErrorException();
    }

    return customerId;
}

function generateKey(
    _context: ExecutionContext,
    tracker: string,
    name: string,
): string {
    return `user:${name}:${tracker}`;
}

function isPublic(
    context: ExecutionContext,
): boolean {
    return Reflect.getMetadata(
        IS_PUBLIC_KEY,
        context.getHandler(),
    ) === true;
}

export function createUserRateLimitOptions():
    ThrottlerModuleOptions {
    return [
        {
            name: 'default',

            ttl: 60_000,

            limit: USER_REQUEST_LIMIT,

            blockDuration: 60_000,

            skipIf: isPublic,

            getTracker: getCustomerTracker,

            generateKey,
        },

        {
            name: 'chat',

            ttl: 60_000,

            limit: CHAT_REQUEST_LIMIT,

            blockDuration: 60_000,

            skipIf: (context) =>
                isPublic(context) ||
                Reflect.getMetadata(
                    CHAT_RATE_LIMIT_KEY,
                    context.getHandler(),
                ) !== true,

            getTracker: getCustomerTracker,

            generateKey,
        },
    ];
}