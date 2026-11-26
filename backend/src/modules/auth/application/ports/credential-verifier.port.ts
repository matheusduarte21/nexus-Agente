
import type { CustomerIdentity } from '../../domain/customer-identity';

export interface ICredentialVerifier {
    verify(credential: string): Promise<CustomerIdentity | null>;
}
