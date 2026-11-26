
import type { CustomerIdentity } from '../domain/customer-identity';

export const AUTHENTICATOR = Symbol('AUTHENTICATOR');

export interface Authenticator {
    authenticate(credential: string): Promise<CustomerIdentity | null>;
}
