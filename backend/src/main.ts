
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import {
  disableExternalTracing,
} from './config/disable-external-tracing';

import { AppModule } from './app.module';
import type { Environment } from './config/env.schema';
import { configureHttp } from './platform/http/configure-http';

async function bootstrap(): Promise<void> {
  disableExternalTracing();
  const app =
    await NestFactory.create<NestExpressApplication>(
      AppModule,
      {
        bodyParser: false,
        bufferLogs: true,
      },
    );

  app.useLogger(app.get(Logger));

  const config =
    app.get<ConfigService<Environment, true>>(
      ConfigService,
    );

  const port = config.getOrThrow('PORT', {
    infer: true,
  });

  const host = config.getOrThrow('HOST', {
    infer: true,
  });

  const corsOrigin = config.get('CORS_ORIGIN', {
    infer: true,
  });

  configureHttp(app, corsOrigin);

  app.enableShutdownHooks();

  await app.listen(port, host);
}

bootstrap();
