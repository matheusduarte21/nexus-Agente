
import {
    Injectable,
    Logger,
    OnApplicationShutdown,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import type {
    CustomerIdentity,
} from '../../modules/auth';

import {
    withCustomerTransaction,
} from './customer-transaction';

import type {
    DatabaseTransaction,
} from './customer-transaction';
import { drizzle } from 'drizzle-orm/node-postgres';

import type {
    NodePgDatabase,
} from 'drizzle-orm/node-postgres';

import { sql } from 'drizzle-orm';
import { Pool } from 'pg';

import type {
    Environment,
} from '../../config/env.schema';

import * as schema from './schema';

@Injectable()
export class DatabaseService
    implements OnApplicationShutdown {
    private readonly logger = new Logger(
        DatabaseService.name,
    );

    private readonly pool: Pool | null;

    private readonly database:
        NodePgDatabase<typeof schema> | null;

    constructor(
        config: ConfigService<Environment, true>,
    ) {
        const databaseUrl = config.get(
            'DATABASE_URL',
            { infer: true },
        );


        const environment = config.getOrThrow(
            'NODE_ENV',
            { infer: true },
        );

        if (!databaseUrl) {
            if (environment !== 'test') {
                throw new Error(
                    'Database configuration is required',
                );
            }

            this.pool = null;
            this.database = null;

            return;
        }

        this.pool = new Pool({
            connectionString: databaseUrl,

            max: 5,

            idleTimeoutMillis: 10_000,

            connectionTimeoutMillis: 2_000,

            statement_timeout: 5_000,

            query_timeout: 6_000,

            application_name: 'nexus-commerce-api',
        });

        this.pool.on('error', () => {
            this.logger.error(
                'An idle database connection failed',
            );
        });

        this.database = drizzle(
            this.pool,
            {
                schema,
            },
        );
    }

    public withCustomer<T>(
        customer: CustomerIdentity,

        work: (
            transaction: DatabaseTransaction,
        ) => Promise<T>,
    ): Promise<T> {
        return withCustomerTransaction(
            this.db,
            customer,
            work,
        );
    }


    public get db(): NodePgDatabase<typeof schema> {
        if (!this.database) {
            throw new Error(
                'Database connection is not configured',
            );
        }

        return this.database;
    }

    public async isReady(): Promise<boolean> {

        if (!this.database) {
            return false;
        }

        try {
            await this.database
                .select({
                    id: schema.knowledgeChunks.id,
                })
                .from(schema.knowledgeChunks)
                .limit(1);

            await this.database.execute(
                sql`
          SELECT
            '[1,0]'::vector
            <=>
            '[1,0]'::vector
        `,
            );

            return true;
        } catch {
            this.logger.warn(
                'Database readiness check failed',
            );

            return false;
        }
    }

    public async onApplicationShutdown():
        Promise<void> {
        if (this.pool) {
            await this.pool.end();
        }
    }
}
