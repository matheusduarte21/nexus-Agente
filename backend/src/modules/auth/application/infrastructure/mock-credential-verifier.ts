
import {
    createHash,
    timingSafeEqual,
} from 'node:crypto';
import { CustomerIdentity } from '../../domain/customer-identity';
import { ICredentialVerifier } from '../ports/credential-verifier.port';


export interface DemoCredential {
    readonly customerId: string;
    readonly tokenHash: string;
}

interface StoredCredential {
    readonly identity: CustomerIdentity;
    readonly hash: Buffer;
}

export class MockCredentialVerifier implements ICredentialVerifier {
    private readonly credentials: readonly StoredCredential[];

    constructor(credentials: readonly DemoCredential[]) {
        const hashes = new Set<string>();

        this.credentials = credentials.map((credential) => {
            if (
                credential.tokenHash.length !== 64 ||
                !/^[a-f0-9]{64}$/.test(credential.tokenHash)
            ) {
                throw new Error('Invalid demo credential configuration');
            }

            if (hashes.has(credential.tokenHash)) {
                throw new Error('Duplicate demo credential configuration');
            }

            hashes.add(credential.tokenHash);

            return {
                identity: Object.freeze({
                    customerId: credential.customerId,
                }),

                hash: Buffer.from(
                    credential.tokenHash,
                    'hex',
                ),
            };
        });
    }

    public async verify(credential: string): Promise<CustomerIdentity | null> {
        if (credential.length !== 43 ||!/^[A-Za-z0-9_-]{43}$/.test(credential) ) {
            return null;
        }

        const incomingHash = createHash('sha256').update(credential).digest();

        let identity: CustomerIdentity | null = null;

        for (const stored of this.credentials) {
            if (
                timingSafeEqual(
                    incomingHash,
                    stored.hash,
                )
            ) {
                identity = stored.identity;
            }
        }

        return identity;
    }
}
