import { jest } from '@jest/globals';

import { GetOrderUseCase } from '../src/modules/orders/application/use-cases/get-order.use-case';

import { OrderAccessPolicy } from '../src/modules/orders/domain/policies/order-access.policy';

import type { IOrder } from '../src/modules/orders/domain/order';

import { InvalidOrderIdError } from '../src/modules/orders/application/errors/invalid-order-id.error';

describe('GetOrderUseCase', () => {
  const customer = {
    customerId: 'customer-001',
  };

  const order: IOrder = {
    id: '12345',
    customerId: 'customer-001',
    status: 'delayed',
    estimatedDelivery: '2026-11-25',
    total: 299.9,
    canCancel: true,
  };

  const policy = new OrderAccessPolicy();

  it('should return an authorized order', async () => {
    const findByIdForCustomer = jest.fn(() => Promise.resolve(order));

    const useCase = new GetOrderUseCase({ findByIdForCustomer }, policy);

    await expect(useCase.execute(customer, '12345')).resolves.toEqual({
      id: '12345',
      status: 'delayed',
      estimatedDelivery: '2026-11-25',
      total: 299.9,
      canCancel: true,
    });

    expect(findByIdForCustomer).toHaveBeenCalledWith('12345', 'customer-001');
  });

  it('should return null when the order does not exist', async () => {
    const useCase = new GetOrderUseCase(
      {
        findByIdForCustomer: jest.fn(() => Promise.resolve(null)),
      },
      policy,
    );

    await expect(useCase.execute(customer, '99999')).resolves.toBeNull();
  });

  it('should reject an order belonging to another customer even when the adapter returns it', async () => {
    const unauthorizedOrder: IOrder = {
      ...order,
      customerId: 'customer-002',
    };

    const useCase = new GetOrderUseCase(
      {
        findByIdForCustomer: jest.fn(() => Promise.resolve(unauthorizedOrder)),
      },
      policy,
    );

    await expect(useCase.execute(customer, '12345')).resolves.toBeNull();
  });

  it('should reject an unexpected order identifier', async () => {
    const unexpectedOrder: IOrder = {
      ...order,
      id: '67890',
    };

    const useCase = new GetOrderUseCase(
      {
        findByIdForCustomer: jest.fn(() => Promise.resolve(unexpectedOrder)),
      },
      policy,
    );

    await expect(useCase.execute(customer, '12345')).resolves.toBeNull();
  });

  it('should not query orders without a customer identity', async () => {
    const findByIdForCustomer = jest.fn(() => Promise.resolve(order));

    const useCase = new GetOrderUseCase({ findByIdForCustomer }, policy);

    await expect(
      useCase.execute({ customerId: '' }, '12345'),
    ).resolves.toBeNull();

    expect(findByIdForCustomer).not.toHaveBeenCalled();
  });

  it.each(['', '../12345', '12345 67890', '12345\n', 'a'.repeat(65)])(
    'should reject invalid identifiers before querying the adapter',
    async (orderId) => {
      const findByIdForCustomer = jest.fn(() => Promise.resolve(order));

      const useCase = new GetOrderUseCase({ findByIdForCustomer }, policy);

      await expect(useCase.execute(customer, orderId)).rejects.toBeInstanceOf(
        InvalidOrderIdError,
      );

      expect(findByIdForCustomer).not.toHaveBeenCalled();
    },
  );

  it('should propagate infrastructure failures instead of returning fabricated data', async () => {
    const useCase = new GetOrderUseCase(
      {
        findByIdForCustomer: jest.fn(() =>
          Promise.reject(new Error('Order provider unavailable')),
        ),
      },
      policy,
    );

    await expect(useCase.execute(customer, '12345')).rejects.toThrow(
      'Order provider unavailable',
    );
  });
});
