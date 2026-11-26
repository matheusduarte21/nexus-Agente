
import { AuthenticateCustomer } from './authenticate-customer.use-case';
import type { CredentialVerifier } from '../ports/credential-verifier.port';
import type { CustomerIdentity } from '../../domain/customer-identity';

describe('AuthenticateCustomer', () => {
    const identity: CustomerIdentity = {
        customerId: 'customer-001',
    };

    it('should return a verified customer identity', async () => {
        const verify = jest.fn(() =>
            Promise.resolve(identity),
        );

        const verifier: CredentialVerifier = {
            verify,
        };

        const useCase = new AuthenticateCustomer(
            verifier,
        );

        await expect(
            useCase.authenticate('example-credential'),
        ).resolves.toEqual(identity);

        expect(verify).toHaveBeenCalledWith(
            'example-credential',
        );
    });

    it('should reject an invalid credential', async () => {
        const verifier: CredentialVerifier = {
            verify: jest.fn(() =>
                Promise.resolve(null),
            ),
        };

        const useCase = new AuthenticateCustomer(
            verifier,
        );

        await expect(
            useCase.authenticate('invalid-credential'),
        ).resolves.toBeNull();
    });

    it.each([
        '',
        ' ',
        'invalid credential',
        'invalid\ncredential',
        'a'.repeat(2049),
    ])(
        'should reject malformed credentials before verification',
        async (credential) => {
            const verify = jest.fn(() =>
                Promise.resolve(identity),
            );

            const useCase = new AuthenticateCustomer({
                verify,
            });

            await expect(
                useCase.authenticate(credential),
            ).resolves.toBeNull();

            expect(verify).not.toHaveBeenCalled();
        },
    );

    it('should propagate verification failures', async () => {
        const verifier: CredentialVerifier = {
            verify: jest.fn(() =>
                Promise.reject(
                    new Error('Authentication service unavailable'),
                ),
            ),
        };

        const useCase = new AuthenticateCustomer(
            verifier,
        );

        await expect(
            useCase.authenticate('example-credential'),
        ).rejects.toThrow(
            'Authentication service unavailable',
        );
    });
});
