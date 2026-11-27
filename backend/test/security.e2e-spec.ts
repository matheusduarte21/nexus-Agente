import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Server } from 'node:http';

import request from 'supertest';

import { AppModule } from '../src/app.module';
import { configureHttp } from '../src/platform/http/configure-http';

describe('HTTP Security (e2e)', () => {
  let app: NestExpressApplication;
  let server: Server;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication<NestExpressApplication>({
      bodyParser: false,
    });

    configureHttp(app, 'http://localhost:3001');

    await app.init();

    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('should expose a minimal liveness endpoint', async () => {
    await request(server)
      .get('/health/live')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('should include security headers', async () => {
    await request(server)
      .get('/health/live')
      .expect('X-Content-Type-Options', 'nosniff');
  });

  it('should not expose the framework header', async () => {
    await request(server)
      .get('/health/live')
      .expect((response) => {
        expect(response.headers['x-powered-by']).toBeUndefined();
      });
  });

  it('should expose a sanitized 404 response', async () => {
    await request(server)
      .get('/non-existing-route')
      .expect(404)
      .expect((response) => {
        expect(response.body).toMatchObject({
          statusCode: 404,
          message: 'Not Found',
        });
        expect(response.body).toHaveProperty('correlationId');
      });
  });

  it('should accept the configured browser origin', async () => {
    await request(server)
      .get('/health/live')
      .set('Origin', 'http://localhost:3001')
      .expect('Access-Control-Allow-Origin', 'http://localhost:3001');
  });

  it('should generate a correlation ID', async () => {
    await request(server)
      .get('/health/live')
      .expect(200)
      .expect('x-correlation-id', /^[0-9a-f-]{36}$/i);
  });

  it('should not trust a client correlation ID', async () => {
    await request(server)
      .get('/health/live')
      .set('x-correlation-id', 'forged-identifier')
      .expect((response) => {
        expect(response.headers['x-correlation-id']).not.toBe(
          'forged-identifier',
        );
      });
  });

  it('should isolate concurrent request identifiers', async () => {
    const [first, second] = await Promise.all([
      request(server).get('/health/live'),
      request(server).get('/health/live'),
    ]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    expect(first.headers['x-correlation-id']).toBeDefined();

    expect(second.headers['x-correlation-id']).toBeDefined();

    expect(first.headers['x-correlation-id']).not.toBe(
      second.headers['x-correlation-id'],
    );
  });

  it('should correlate malformed JSON errors', async () => {
    await request(server)
      .post('/health/live')
      .set('Content-Type', 'application/json')
      .send('{"message":')
      .expect(400)
      .expect('x-correlation-id', /^[0-9a-f-]{36}$/i);
  });

  it('should correlate oversized payload errors', async () => {
    await request(server)
      .post('/health/live')
      .send({
        message: 'a'.repeat(40 * 1024),
      })
      .expect(413)
      .expect('x-correlation-id', /^[0-9a-f-]{36}$/i);
  });

  it('should not authorize an untrusted origin', async () => {
    await request(server)
      .get('/health/live')
      .set('Origin', 'https://unknown.example')
      .expect((response) => {
        expect(response.headers['access-control-allow-origin']).not.toBe(
          'https://unknown.example',
        );
      });
  });

  it('should reject oversized JSON payloads', async () => {
    await request(server)
      .post('/health/live')
      .send({
        message: 'a'.repeat(40 * 1024),
      })
      .expect(413);
  });

  it('should reject malformed JSON', async () => {
    await request(server)
      .post('/health/live')
      .set('Content-Type', 'application/json')
      .send('{"message":')
      .expect(400);
  });
});
