
import {
    Controller,
    Get,
} from '@nestjs/common';

import type { CustomerIdentity } from '../domain/customer-identity';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
    @Get('me')
    public me(@CurrentUser() customer: CustomerIdentity): CustomerIdentity {
        return {customerId: customer.customerId};
    }
}
