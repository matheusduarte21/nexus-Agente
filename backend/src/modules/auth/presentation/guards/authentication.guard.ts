
import {
    CanActivate,
    ExecutionContext,
    Inject,
    Injectable,
    ServiceUnavailableException,
    UnauthorizedException,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';
import { PinoLogger } from 'nestjs-pino';
import type { Response } from 'express';

import { AUTHENTICATOR } from '../../application/authenticator';
import type { Authenticator } from '../../application/authenticator';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { IAuthenticatedRequest } from '../http/authenticated-request';
import { extractBearerToken } from '../http/bearer-token.extractor';

@Injectable()
export class AuthenticationGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        @Inject(AUTHENTICATOR)
        private readonly authenticator: Authenticator,

        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(AuthenticationGuard.name);
    }

    public async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.get<boolean>(
            IS_PUBLIC_KEY,
            context.getHandler(),
        );

        if (isPublic === true) {
            return true;
        }

        const httpContext = context.switchToHttp();

        const request =
            httpContext.getRequest<IAuthenticatedRequest>();

        const response =
            httpContext.getResponse<Response>();

        response.setHeader('Cache-Control', 'no-store');

        const credential = extractBearerToken(
            request.headers.authorization,
            request.rawHeaders,
        );

        if (!credential) {
            return this.deny(response, 'INVALID_AUTH_HEADER');
        }

        const identity = await this.authenticator
            .authenticate(credential)
            .catch(() => {
                this.logger.error({
                    event: 'authentication.failed',
                    errorCode: 'AUTH_PROVIDER_UNAVAILABLE',
                });

                throw new ServiceUnavailableException();
            });

        if (!identity) {
            return this.deny(response, 'INVALID_CREDENTIAL');
        }

        request.authenticatedCustomer = Object.freeze({
            customerId: identity.customerId,
        });

        this.logger.info({
            event: 'authentication.succeeded',
        });

        return true;
    }

    private deny(response: Response, reasonCode: string): never {
        this.logger.warn({
            event: 'authentication.denied',
            reasonCode,
        });

        response.setHeader(
            'WWW-Authenticate',
            'Bearer realm="nexus-commerce"',
        );

        throw new UnauthorizedException();
    }
}
