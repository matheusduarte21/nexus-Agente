
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseService } from '../database/database.service';
import { DatabaseHealthController } from './database-health.controller';

@Module({
    imports: [ConfigModule],

    controllers: [
        DatabaseHealthController,
    ],

    providers: [
        DatabaseService,
    ],

    exports: [
        DatabaseService,
    ],
})
export class DatabaseModule { }
