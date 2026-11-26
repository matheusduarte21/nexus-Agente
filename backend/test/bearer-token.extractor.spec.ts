
import { extractBearerToken } from './bearer-token.extractor';

describe('extractBearerToken', () => {
  it('should extract a valid bearer credential', () => {
    expect(
      extractBearerToken(
        'Bearer example-token',
        ['Authorization', 'Bearer example-token'],
      ),
    ).toBe('example-token');
  });

  it('should accept a case-insensitive scheme', () => {
    expect(
      extractBearerToken(
        'bearer example-token',
        ['authorization', 'bearer example-token'],
      ),
    ).toBe('example-token');
  });

  it('should reject a missing authorization header', () => {
    expect(
      extractBearerToken(undefined, []),
    ).toBeNull();
  });

  it.each([
    '',
    'Bearer',
    'Basic example-token',
    'Bearer invalid token',
    'Bearer token-A, Bearer token-B',
    'Bearer token\n',
    `Bearer ${'a'.repeat(2065)}`,
  ])('should reject malformed authorization headers', (header) => {
    expect(
      extractBearerToken(
        header,
        ['Authorization', header],
      ),
    ).toBeNull();
  });

  it('should reject duplicate authorization headers', () => {
    expect(
      extractBearerToken(
        'Bearer token-A',
        [
          'Authorization',
          'Bearer token-A',
          'authorization',
          'Bearer token-B',
        ],
      ),
    ).toBeNull();
  });
});
