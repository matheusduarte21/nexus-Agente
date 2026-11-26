
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'nexus:auth:is-public';

export const Public = (): MethodDecorator =>
    SetMetadata(IS_PUBLIC_KEY, true);
