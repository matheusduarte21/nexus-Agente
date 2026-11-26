
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './modules/auth';
import { AppService } from './app.service';
import { KnowledgeModule } from './modules/knowledge';
import { AgentModule } from './modules/agent';
import {
  Environment,
  validateEnvironment,
} from './config/env.schema';
import { GlobalExceptionFilter } from './platform/http/global-exception.filter';
import { HealthController } from './platform/http/health.controller';
import { createLoggerOptions } from './platform/logging/logger.config';
import { OrdersModule } from './modules/orders';
import { DatabaseModule } from './platform/database/schema/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      skipProcessEnv: true,
      validate: validateEnvironment,
    }),

    LoggerModule.forRootAsync({
      inject: [ConfigService],

      useFactory: (
        config: ConfigService<Environment, true>,
      ) => ({
        pinoHttp: {
          ...createLoggerOptions(
            config.getOrThrow('LOG_LEVEL', {
              infer: true,
            }),
          ),

          autoLogging: false,

          quietReqLogger: true,
          quietResLogger: true,

          customAttributeKeys: {
            reqId: 'correlationId',
          },
        },
      }),
    }),
    AuthModule,
    DatabaseModule,
    OrdersModule,
    KnowledgeModule,
    AgentModule,
  ],

  controllers: [
    HealthController,
  ],

  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
