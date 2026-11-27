import express from 'express';
import request from 'supertest';

import { createIpRateLimitMiddleware } from '../src/platform/http/security/ip-rate-limit.middleware';

describe('IP rate limiting (e2e)', () => {
  it('should reject requests over the configured limit without caching the response', async () => {
    const app = express();
    app.use(createIpRateLimitMiddleware(1));
    app.get('/resource', (_request, response) => {
      response.json({ status: 'ok' });
    });

    await request(app).get('/resource').expect(200).expect({ status: 'ok' });

    const response = await request(app).get('/resource').expect(429);

    expect(response.body).toEqual({
      statusCode: 429,
      message: 'Too Many Requests',
    });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers.ratelimit).toBeDefined();
  });
});
