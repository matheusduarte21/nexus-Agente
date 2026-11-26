
import { OrderAccessPolicy } from './order-access.policy';
import type { Order } from '../order';

describe('OrderAccessPolicy', () => {
  const policy = new OrderAccessPolicy();

  const order: Order = {
    id: '12345',
    customerId: 'customer-001',
    status: 'delayed',
    estimatedDelivery: '2026-11-25',
    total: 299.9,
    canCancel: true,
  };

  it('should allow the owner to read the order', () => {
    expect(
      policy.canRead('customer-001', order),
    ).toBe(true);
  });

  it('should deny access to another customer', () => {
    expect(
      policy.canRead('customer-002', order),
    ).toBe(false);
  });

  it('should deny access without a customer identity', () => {
    expect(
      policy.canRead('', order),
    ).toBe(false);
  });
});
