
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

describe('Order Authorization (e2e)', () => {
  let app: NestExpressApplication;
  let server: Server;

  const tokenA = 'a'.repeat(43);
  const tokenB = 'b'.repeat(43);

  const authenticator: Authenticator = {
    authenticate(
      credential: string,
    ): Promise<CustomerIdentity | null> {
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

      return Promise.resolve(null);
    },
  };

  beforeAll(async () => {
    const moduleRef =
      await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(AUTHENTICATOR)
        .useValue(authenticator)
        .compile();

    app =
      moduleRef.createNestApplication<NestExpressApplication>({
        bodyParser: false,
      });

    configureHttp(
      app,
      'http://localhost:3001',
    );

    await app.init();

    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('should reject unauthenticated access', async () => {
    await request(server)
      .get('/orders/12345')
      .expect(401);
  });

  it('should allow customer A to access their order', async () => {
    await request(server)
      .get('/orders/12345')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200)
      .expect({
        id: '12345',
        status: 'delayed',
        estimatedDelivery: '2026-11-25',
        total: 299.9,
        canCancel: true,
      });
  });

  it('should allow customer B to access their order', async () => {
    await request(server)
      .get('/orders/67890')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200)
      .expect({
        id: '67890',
        status: 'shipped',
        estimatedDelivery: '2026-11-28',
        total: 599.9,
        canCancel: false,
      });
  });

  it('should prevent customer A from accessing customer B orders', async () => {
    await request(server)
      .get('/orders/67890')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404);
  });

  it('should prevent customer B from accessing customer A orders', async () => {
    await request(server)
      .get('/orders/12345')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);
  });

  it('should not distinguish missing orders from unauthorized orders in the response body', async () => {
    const responses = await Promise.all([
      request(server)
        .get('/orders/67890')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404),

      request(server)
        .get('/orders/99999')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404),
    ]);

    for (const response of responses) {
      const payload: unknown = response.body;

      expect(payload).toEqual({
        statusCode: 404,
        message: 'Not Found',
        correlationId: expect.any(String),
      });
    }
  });

  it('should prevent identity manipulation through headers and query parameters', async () => {
    await request(server)
      .get('/orders/67890')
      .query({
        customerId: 'customer-002',
        userId: 'customer-002',
      })
      .set('x-user-id', 'customer-002')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404);
  });

  it('should reject malformed order identifiers', async () => {
    await request(server)
      .get('/orders/invalid%20id')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(400);
  });

  it('should reject unexpected identity query parameters', async () => {
    await request(server)
      .get('/orders/67890')
      .query({
        customerId: 'customer-002',
        userId: 'customer-002',
      })
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(400);
  });

  it('should prevent identity spoofing through headers', async () => {
    await request(server)
      .get('/orders/67890')
      .set('x-user-id', 'customer-002')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404);
  });


  it('should isolate concurrent customer requests', async () => {
    await Promise.all([
      request(server)
        .get('/orders/12345')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200),

      request(server)
        .get('/orders/12345')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404),

      request(server)
        .get('/orders/67890')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200),

      request(server)
        .get('/orders/67890')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404),
    ]);
  });
});
