import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

import { ZodValidationPipe } from '../src/platform/http/validation/zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const schema = z
    .object({
      message: z.string().min(1).max(100),
    })
    .strict();

  const pipe = new ZodValidationPipe(schema);

  it('should accept valid input', () => {
    expect(
      pipe.transform({
        message: 'Valid message',
      }),
    ).toEqual({
      message: 'Valid message',
    });
  });

  it.each([
    null,
    undefined,
    [],
    {},
    { message: '' },
    { message: 123 },
    { message: 'a'.repeat(101) },
  ])('should reject invalid input', (input) => {
    expect(() => pipe.transform(input)).toThrow(BadRequestException);
  });

  it('should reject unexpected properties', () => {
    expect(() =>
      pipe.transform({
        message: 'Valid message',
        isAdmin: true,
      }),
    ).toThrow(BadRequestException);
  });

  it('should reject identity manipulation fields', () => {
    expect(() =>
      pipe.transform({
        message: 'Valid message',
        userId: 'customer-002',
      }),
    ).toThrow(BadRequestException);
  });

  it('should not expose submitted values in validation errors', () => {
    expect(() =>
      pipe.transform({
        password: 'sensitive-test-value',
      }),
    ).toThrow('Bad Request');
  });
});
