
import type { Request } from 'express';
import type { CustomerIdentity } from '../../domain/customer-identity';

export interface IAuthenticatedRequest extends Request {
    authenticatedCustomer?: CustomerIdentity;
}
