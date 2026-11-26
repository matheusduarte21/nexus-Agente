
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import type { Environment } from '../../config/env.schema';

import { AUTHENTICATOR } from './application/authenticator';
import { AuthenticationGuard } from './presentation/guards/authentication.guard';
import { AuthController } from './presentation/auth.controller';
import { ICredentialVerifier } from './application/ports/credential-verifier.port';
import { DemoCredential, MockCredentialVerifier } from './application/infrastructure/mock-credential-verifier';
import { AuthenticateCustomer } from './application/use-cases/authenticate-customer.use-case';
import {
    ThrottlerGuard,
    ThrottlerModule,
} from '@nestjs/throttler';

import {
    createUserRateLimitOptions,
} from './presentation/security/user-rate-limit.config';
const CREDENTIAL_VERIFIER = Symbol(
    'CREDENTIAL_VERIFIER',
);

@Module({
    imports: [
        ConfigModule,

        ThrottlerModule.forRoot(
            createUserRateLimitOptions(),
        ),
    ],

    controllers: [AuthController],

    providers: [
        {
            provide: CREDENTIAL_VERIFIER,

            inject: [ConfigService],

            useFactory: (
                config: ConfigService<Environment, true>,
            ): ICredentialVerifier => {
                const environment = config.getOrThrow(
                    'NODE_ENV',
                    { infer: true },
                );

                if (environment === 'production') {
                    throw new Error(
                        'Demo authentication is not allowed in production',
                    );
                }

                const credentials: DemoCredential[] = [];

                const customer001Hash = config.get(
                    'DEMO_CUSTOMER_001_TOKEN_HASH',
                    { infer: true },
                );

                const customer002Hash = config.get(
                    'DEMO_CUSTOMER_002_TOKEN_HASH',
                    { infer: true },
                );

                if (customer001Hash) {
                    credentials.push({
                        customerId: 'customer-001',
                        tokenHash: customer001Hash,
                    });
                }

                if (customer002Hash) {
                    credentials.push({
                        customerId: 'customer-002',
                        tokenHash: customer002Hash,
                    });
                }

                return new MockCredentialVerifier(credentials);
            },
        }, {
            provide: APP_GUARD,
            useClass: AuthenticationGuard,
        },

        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },

        {
            provide: AUTHENTICATOR,

            inject: [CREDENTIAL_VERIFIER],

            useFactory: (
                verifier: ICredentialVerifier,
            ): AuthenticateCustomer =>
                new AuthenticateCustomer(verifier),
        },

        {
            provide: APP_GUARD,
            useClass: AuthenticationGuard,
        },
    ],

    exports: [AUTHENTICATOR],
})
export class AuthModule { }
