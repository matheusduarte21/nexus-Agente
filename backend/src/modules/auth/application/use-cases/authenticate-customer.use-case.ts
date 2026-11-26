
import type { CustomerIdentity } from '../../domain/customer-identity';
import type { Authenticator } from '../authenticator';
import type {ICredentialVerifier } from '../ports/credential-verifier.port';

export class AuthenticateCustomer implements Authenticator {
    constructor(
        private readonly credentialVerifier: ICredentialVerifier,
    ) {}

    public async authenticate(credential: string): Promise<CustomerIdentity | null> {
        if (credential.length === 0 || credential.length > 2048 || /[^\x21-\x7e]/.test(credential)) {
            return null;
        }

        return this.credentialVerifier.verify(credential);
    }
}
