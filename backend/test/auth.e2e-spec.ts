
import { Controller, Get } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Server } from 'node:http';

import request from 'supertest';

import { AppModule } from '../src/app.module';
import { configureHttp } from '../src/platform/http/configure-http';

import { AUTHENTICATOR } from '../src/modules/auth';
import type {
  Authenticator,
  CustomerIdentity,
} from '../src/modules/auth';

@Controller('auth-probe')
class ProtectedProbeController {
  @Get()
  public probe(): { status: string } {
    return { status: 'protected' };
  }
}

describe('Authentication (e2e)', () => {
  let app: NestExpressApplication;
  let server: Server;

  const tokenA = 'a'.repeat(43);
  const tokenB = 'b'.repeat(43);
  const unavailableToken = 'c'.repeat(43);

  const authenticate = jest.fn(
    (credential: string): Promise<CustomerIdentity | null> => {
      if (credential === tokenA) {
        return Promise.resolve({
          customerId: 'customer-001',
        });
      }

      if (credential === tokenB) {
        return Promise.resolve({
          customerId: 'customer-002',
        });
      }

      if (credential === unavailableToken) {
        return Promise.reject(
          new Error('Sensitive internal provider failure'),
        );
      }

      return Promise.resolve(null);
    },
  );

  const authenticator: Authenticator = {
    authenticate,
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ProtectedProbeController],
    })
      .overrideProvider(AUTHENTICATOR)
      .useValue(authenticator)
      .compile();

    app =
      moduleRef.createNestApplication<NestExpressApplication>({
        bodyParser: false,
      });

    configureHttp(app, 'http://localhost:3001');

    await app.init();

    server = app.getHttpServer() as Server;
  });

  beforeEach(() => {
    authenticate.mockClear();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('should allow public health checks', async () => {
    await request(server)
      .get('/health/live')
      .expect(200)
      .expect({ status: 'ok' });

    expect(authenticate).not.toHaveBeenCalled();
  });

  it('should reject unauthenticated requests', async () => {
    await request(server)
      .get('/auth/me')
      .expect(401)
      .expect(
        'WWW-Authenticate',
        'Bearer realm="nexus-commerce"',
      );

    expect(authenticate).not.toHaveBeenCalled();
  });

  it('should reject invalid credentials', async () => {
    await request(server)
      .get('/auth/me')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  it('should reject invalid authentication schemes', async () => {
    await request(server)
      .get('/auth/me')
      .set('Authorization', 'Basic example-token')
      .expect(401);

    expect(authenticate).not.toHaveBeenCalled();
  });

  it('should authenticate customer A', async () => {
    await request(server)
      .get('/auth/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200)
      .expect({
        customerId: 'customer-001',
      });

    expect(authenticate).toHaveBeenCalledWith(tokenA);
  });

  it('should authenticate customer B', async () => {
    await request(server)
      .get('/auth/me')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200)
      .expect({
        customerId: 'customer-002',
      });
  });

  it('should prevent identity spoofing through headers and query parameters', async () => {
    await request(server)
      .get('/auth/me')
      .query({ userId: 'customer-002' })
      .set('x-user-id', 'customer-002')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200)
      .expect({
        customerId: 'customer-001',
      });
  });

  it('should not authenticate a customer through identity headers alone', async () => {
    await request(server)
      .get('/auth/me')
      .set('x-user-id', 'customer-001')
      .expect(401);
  });

  it('should protect new endpoints by default', async () => {
    await request(server)
      .get('/auth-probe')
      .expect(401);
  });

  it('should allow authenticated access to protected endpoints', async () => {
    await request(server)
      .get('/auth-probe')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200)
      .expect({
        status: 'protected',
      });
  });

  it('should fail closed when authentication is unavailable', async () => {
    await request(server)
      .get('/auth/me')
      .set('Authorization', `Bearer ${unavailableToken}`)
      .expect(503)
      .expect((response) => {
        expect(response.text).not.toContain(
          'Sensitive internal provider failure',
        );
      });
  });

  it('should prevent caching authenticated responses', async () => {
    await request(server)
      .get('/auth/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200)
      .expect('Cache-Control', 'no-store');
  });

  it('should preserve identity isolation between concurrent requests', async () => {
    await Promise.all([
      request(server)
        .get('/auth/me')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200)
        .expect({
          customerId: 'customer-001',
        }),

      request(server)
        .get('/auth/me')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200)
        .expect({
          customerId: 'customer-002',
        }),
    ]);
  });
});
