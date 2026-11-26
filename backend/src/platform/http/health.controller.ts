
import {
  Controller,
  Get,
  Header,
} from '@nestjs/common';

import { Public } from '../../modules/auth';

@Controller('health')
export class HealthController {
    @Public()
    @Get('live')
    @Header('Cache-Control', 'no-store')
    public liveness(): { status: 'ok' } {
        return {
        status: 'ok',
        };
    }
}
