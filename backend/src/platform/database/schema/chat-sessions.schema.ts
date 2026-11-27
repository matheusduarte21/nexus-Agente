
import {
    pgTable,
    primaryKey,
    timestamp,
    varchar,
} from 'drizzle-orm/pg-core';

export const chatSessions = pgTable(
    'chat_sessions',
    {
        id: varchar('id', {
            length: 128,
        }).notNull(),

        lastOrderId: varchar('last_order_id', {
            length: 64,
        }),
        
        customerId: varchar('customer_id', {
            length: 128,
        }).notNull(),

        createdAt: timestamp('created_at', {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),

        updatedAt: timestamp('updated_at', {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        primaryKey({
            name: 'chat_sessions_pk',

            columns: [
                table.customerId,
                table.id,
            ],
        }),
    ],
);

export type ChatSession =
    typeof chatSessions.$inferSelect;

export type NewChatSession =
    typeof chatSessions.$inferInsert;
