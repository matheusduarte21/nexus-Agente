
import { sql } from 'drizzle-orm';

import type {
    NodePgDatabase,
} from 'drizzle-orm/node-postgres';

import type {
    CustomerIdentity,
} from '../../modules/auth';

import type * as schema from './schema';

export type Database = NodePgDatabase<typeof schema>;

export type DatabaseTransaction = Parameters<
    Parameters<Database['transaction']>[0]
>[0];

export function withCustomerTransaction<T>(
    database: Database,

    customer: CustomerIdentity,

    work: (
        transaction: DatabaseTransaction,
    ) => Promise<T>,
): Promise<T> {
    if (
        !customer.customerId ||
        customer.customerId.length > 128
    ) {
        throw new Error(
            'Trusted customer context is required',
        );
    }

    return database.transaction(
        async (transaction) => {
            await transaction.execute(
                sql`
          SELECT set_config(
            'nexus.customer_id',
            ${customer.customerId},
            true
          )
        `,
            );

            return work(transaction);
        },
    );
}
