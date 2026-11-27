import { createHash, randomBytes } from 'node:crypto';

import { MockCredentialVerifier } from '../src/modules/auth/application/infrastructure/mock-credential-verifier';

describe('MockCredentialVerifier', () => {
  const tokenA = randomBytes(32).toString('base64url');

  const tokenB = randomBytes(32).toString('base64url');

  const unknownToken = randomBytes(32).toString('base64url');

  const hash = (token: string): string =>
    createHash('sha256').update(token).digest('hex');

  const credentials = [
    {
      customerId: 'customer-001',
      tokenHash: hash(tokenA),
    },
    {
      customerId: 'customer-002',
      tokenHash: hash(tokenB),
    },
  ];

  let verifier: MockCredentialVerifier;

  beforeEach(() => {
    verifier = new MockCredentialVerifier(credentials);
  });

  it('should authenticate the first customer', async () => {
    await expect(verifier.verify(tokenA)).resolves.toEqual({
      customerId: 'customer-001',
    });
  });

  it('should authenticate the second customer', async () => {
    await expect(verifier.verify(tokenB)).resolves.toEqual({
      customerId: 'customer-002',
    });
  });

  it('should reject an unknown token', async () => {
    await expect(verifier.verify(unknownToken)).resolves.toBeNull();
  });

  it('should reject customer IDs used as credentials', async () => {
    await expect(verifier.verify('customer-001')).resolves.toBeNull();
  });

  it('should reject authentication without configuration', async () => {
    const emptyVerifier = new MockCredentialVerifier([]);

    await expect(emptyVerifier.verify(tokenA)).resolves.toBeNull();
  });

  it('should reject duplicate credential hashes', () => {
    expect(
      () =>
        new MockCredentialVerifier([
          {
            customerId: 'customer-001',
            tokenHash: hash(tokenA),
          },
          {
            customerId: 'customer-002',
            tokenHash: hash(tokenA),
          },
        ]),
    ).toThrow('Duplicate demo credential configuration');
  });

  it('should reject malformed configured hashes', () => {
    expect(
      () =>
        new MockCredentialVerifier([
          {
            customerId: 'customer-001',
            tokenHash: 'invalid-hash',
          },
        ]),
    ).toThrow('Invalid demo credential configuration');
  });

  it('should return an immutable identity', async () => {
    const identity = await verifier.verify(tokenA);

    expect(identity).not.toBeNull();
    expect(Object.isFrozen(identity)).toBe(true);
  });
});
