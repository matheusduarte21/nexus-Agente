const { createServer } = require('node:http');
const { timingSafeEqual } = require('node:crypto');
const orders = require('./fixtures/orders.json');

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });

  response.end(JSON.stringify(data));
}

function createOrderServer(serviceToken) {
  if (
    typeof serviceToken !== 'string' ||
    !/^[a-f0-9]{64}$/.test(serviceToken)
  ) {
    throw new Error('Invalid Order API configuration');
  }

  const expectedAuthorization = Buffer.from(`Bearer ${serviceToken}`);

  const cancellationKeys = new Map();

  const cancelledOrders = new Map();

  return createServer(
    {
      requestTimeout: 5000,
      headersTimeout: 5000,
      maxHeaderSize: 8192,
    },
    (request, response) => {
      const authorization = Buffer.from(request.headers.authorization ?? '');

      const authorized =
        authorization.length === expectedAuthorization.length &&
        timingSafeEqual(authorization, expectedAuthorization);

      if (!authorized) {
        response.setHeader('WWW-Authenticate', 'Bearer realm="order-api"');

        return sendJson(response, 401, {
          message: 'Unauthorized',
        });
      }

      const customerId = request.headers['x-customer-id'];

      if (
        typeof customerId !== 'string' ||
        !/^[A-Za-z0-9_-]{1,128}$/.test(customerId)
      ) {
        return sendJson(response, 400, {
          message: 'Bad Request',
        });
      }

      const readMatch = /^\/orders\/([A-Za-z0-9_-]{1,64})$/.exec(
        request.url ?? '',
      );

      const cancelMatch =
        /^\/orders\/([A-Za-z0-9_-]{1,64})\/cancellation-request$/.exec(
          request.url ?? '',
        );

      const isRead = request.method === 'GET' && readMatch;

      const isCancellation = request.method === 'POST' && cancelMatch;

      if (!isRead && !isCancellation) {
        return sendJson(response, 404, {
          message: 'Not Found',
        });
      }

      const orderId = isRead ? readMatch[1] : cancelMatch[1];

      const order = orders.find(
        (item) => item.id === orderId && item.customerId === customerId,
      );

      if (!order) {
        return sendJson(response, 404, {
          message: 'Not Found',
        });
      }

      if (isRead) {
        return sendJson(response, 200, order);
      }

      const idempotencyKey = request.headers['idempotency-key'];

      if (
        typeof idempotencyKey !== 'string' ||
        !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
          idempotencyKey,
        )
      ) {
        return sendJson(response, 400, {
          message: 'Invalid idempotency key',
        });
      }

      const scopedKey = JSON.stringify([customerId, idempotencyKey]);

      const scopedOrder = JSON.stringify([customerId, orderId]);

      const existing = cancellationKeys.get(scopedKey);

      if (existing) {
        if (existing.orderId !== orderId) {
          return sendJson(response, 409, {
            message: 'Idempotency conflict',
          });
        }

        return sendJson(response, 202, existing);
      }

      if (!order.canCancel || cancelledOrders.has(scopedOrder)) {
        return sendJson(response, 409, {
          message: 'Cancellation unavailable',
        });
      }

      const result = {
        orderId,

        status: 'cancellation_requested',
      };

      cancellationKeys.set(scopedKey, result);

      cancelledOrders.set(scopedOrder, idempotencyKey);

      return sendJson(response, 202, result);
    },
  );
}

if (require.main === module) {
  const server = createOrderServer(process.env.ORDER_API_TOKEN);

  server.listen(3002, '127.0.0.1', () => {
    console.log('Mock Order API listening on port 3002');
  });

  process.once('SIGTERM', () => server.close());
  process.once('SIGINT', () => server.close());
}

module.exports = { createOrderServer };
