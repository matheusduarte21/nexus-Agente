
import {
  Controller,
  Get,
  Header,
  ServiceUnavailableException,
} from '@nestjs/common';


import { DatabaseService } from '../database.service';
import { Public } from 'src/modules/auth/presentation/decorators/public.decorator';

@Controller('health')
export class DatabaseHealthController {
  constructor(
    private readonly database: DatabaseService,
  ) {}

  @Public()
  @Get('ready')
  @Header('Cache-Control', 'no-store')
  public async readiness():
    Promise<{ status: 'ok' }> {
    const ready =
      await this.database.isReady();

    if (!ready) {
      throw new ServiceUnavailableException();
    }

    return {
      status: 'ok',
    };
  }
}
