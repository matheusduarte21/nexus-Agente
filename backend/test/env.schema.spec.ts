import { validateEnvironment } from "src/config/env.schema";
import { describe } from "zod";
import { it } from "zod/locales";


describe('Environment configuration', () => {
    it('should load safe default values', () => {
        const config = validateEnvironment({});

        expect(config.NODE_ENV).toBe('development');
        expect(config.PORT).toBe(3000);
        expect(config.HOST).toBe('127.0.0.1');
    });

    it('should convert the port to a number', () => {
        const config = validateEnvironment({
            PORT: '4000',
        });

        expect(config.PORT).toBe(4000);
        expect(typeof config.PORT).toBe('number');
    });

    it.each(['0', '-1', '99999', 'invalid', ''])(
        'should reject invalid port: %s',
        (port) => {
            expect(() =>
                validateEnvironment({ PORT: port }),
            ).toThrow('Invalid environment configuration');
        },
    );

    it('should reject an invalid environment', () => {
        expect(() =>
            validateEnvironment({
                NODE_ENV: 'invalid',
            }),
        ).toThrow('NODE_ENV');
    });

    it('should reject a wildcard CORS origin', () => {
        expect(() =>
            validateEnvironment({
                CORS_ORIGIN: '*',
            }),
        ).toThrow('CORS_ORIGIN');
    });

    it('should accept a valid HTTP origin', () => {
        const config = validateEnvironment({
            CORS_ORIGIN: 'http://localhost:3001',
        });

        expect(config.CORS_ORIGIN).toBe(
            'http://localhost:3001',
        );
    });


it('should accept an application database URL', () => {
  const databaseUrl =
    'postgresql://nexus_app:test-password@localhost:5432/nexus';

  const config = validateEnvironment({
    DATABASE_URL: databaseUrl,
  });

  expect(config.DATABASE_URL).toBe(
    databaseUrl,
  );
});

it.each([
  'invalid-url',
  'https://localhost/database',
  'postgresql://nexus_admin:test@localhost:5432/nexus',
  'postgresql://nexus_migrator:test@localhost:5432/nexus',
  'postgresql://nexus_app@localhost:5432/nexus',
])(
  'should reject unsafe database configuration',
  (databaseUrl) => {
    expect(() =>
      validateEnvironment({
        DATABASE_URL: databaseUrl,
      }),
    ).toThrow('DATABASE_URL');
  },
);

it('should not expose database credentials in validation errors', () => {
  expect(() =>
    validateEnvironment({
      DATABASE_URL:
        'invalid-secret-test-value',
    }),
  ).toThrow(
    /^Invalid environment configuration: DATABASE_URL$/,
  );
});


    it('should reject invalid log levels', () => {
        expect(() =>
            validateEnvironment({
                LOG_LEVEL: 'invalid',
            }),
        ).toThrow('LOG_LEVEL');
    });

    it('should default to info logging', () => {
        const config = validateEnvironment({});

        expect(config.LOG_LEVEL).toBe('info');
    });

    it('should not expose invalid values in errors', () => {
        expect(() =>
            validateEnvironment({
                PORT: 'sensitive-value',
            }),
        ).toThrow(
            /^Invalid environment configuration: PORT$/,
        );
    });

    it('should discard unknown configuration fields', () => {
        const config = validateEnvironment({
            UNKNOWN_VARIABLE: 'unexpected',
        });

        expect(config).not.toHaveProperty(
            'UNKNOWN_VARIABLE',
        );
    });
});
