
import { sql } from 'drizzle-orm';

import {
    check,
    foreignKey,
    index,
    pgTable,
    text,
    timestamp,
    uuid,
    varchar,
} from 'drizzle-orm/pg-core';

import { chatSessions } from './chat-sessions.schema';

export const chatMessages = pgTable(
    'chat_messages',
    {
        id: uuid('id')
            .defaultRandom()
            .primaryKey(),

        customerId: varchar('customer_id', {
            length: 128,
        }).notNull(),

        sessionId: varchar('session_id', {
            length: 128,
        }).notNull(),

        role: text('role', {
            enum: ['user', 'assistant'],
        }).notNull(),

        content: text('content')
            .notNull(),

        createdAt: timestamp('created_at', {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        foreignKey({
            name: 'chat_messages_session_fk',

            columns: [
                table.customerId,
                table.sessionId,
            ],

            foreignColumns: [
                chatSessions.customerId,
                chatSessions.id,
            ],
        }).onDelete('restrict'),

        index('chat_messages_history_idx')
            .on(
                table.customerId,
                table.sessionId,
                table.createdAt,
            ),

        check(
            'chat_message_role_valid',
            sql`${table.role} IN ('user', 'assistant')`,
        ),

        check(
            'chat_message_content_not_empty',
            sql`length(btrim(${table.content})) > 0`,
        ),
    ],
);

export type ChatMessage =
    typeof chatMessages.$inferSelect;

export type NewChatMessage =
    typeof chatMessages.$inferInsert;
