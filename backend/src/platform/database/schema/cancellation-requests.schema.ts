
import { sql } from 'drizzle-orm';

import {
    check,
    foreignKey,
    index,
    pgTable,
    text,
    timestamp,
    unique,
    uniqueIndex,
    uuid,
    varchar,
} from 'drizzle-orm/pg-core';

import { chatSessions } from './chat-sessions.schema';

export const cancellationStatuses = [
    'awaiting_confirmation',
    'confirmed',
    'processing',
    'requested',
    'rejected',
    'expired',
    'failed',
] as const;

export const cancellationRequests = pgTable(
    'cancellation_requests',
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

        orderId: varchar('order_id', {
            length: 64,
        }).notNull(),

        idempotencyKey: uuid('idempotency_key')
            .notNull(),

        status: text('status', {
            enum: cancellationStatuses,
        })
            .default('awaiting_confirmation')
            .notNull(),

        expiresAt: timestamp('expires_at', {
            withTimezone: true,
        }).notNull(),

        confirmedAt: timestamp('confirmed_at', {
            withTimezone: true,
        }),

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
        foreignKey({
            name: 'cancellation_session_fk',

            columns: [
                table.customerId,
                table.sessionId,
            ],

            foreignColumns: [
                chatSessions.customerId,
                chatSessions.id,
            ],
        }).onDelete('restrict'),
            uniqueIndex('cancellation_active_session_unique')
            .on(
                table.customerId,
                table.sessionId,
            )
            .where(sql`${table.status} IN (
                'awaiting_confirmation',
                'confirmed',
                'processing'
            )`),

        uniqueIndex('cancellation_active_order_unique')
            .on(
                table.customerId,
                table.orderId,
            )
            .where(sql`${table.status} IN (
                'awaiting_confirmation',
                'confirmed',
                'processing',
                'requested'
            )`),
        unique('cancellation_idempotency_unique')
            .on(
                table.customerId,
                table.idempotencyKey,
            ),

        index('cancellation_session_idx')
            .on(
                table.customerId,
                table.sessionId,
            ),

        index('cancellation_order_idx')
            .on(
                table.customerId,
                table.orderId,
            ),

        check(
            'cancellation_status_valid',
            sql`${table.status} IN (
        'awaiting_confirmation',
        'confirmed',
        'processing',
        'requested',
        'rejected',
        'expired',
        'failed'
      )`,
        ),

        check(
            'cancellation_expiration_valid',
            sql`${table.expiresAt} > ${table.createdAt}`,
        ),

        check(
            'cancellation_confirmation_required',
            sql`(
        ${table.status} IN (
            'confirmed',
            'processing',
            'requested',
            'failed'
        )
        AND ${table.confirmedAt} IS NOT NULL
        ) OR (
            ${table.status} IN (
            'awaiting_confirmation',
            'rejected',
            'expired'
            )
            AND ${table.confirmedAt} IS NULL
        )`,
        ),

        check(
            'cancellation_confirmation_time_valid',
            sql`${table.confirmedAt} >= ${table.createdAt}
        AND ${table.confirmedAt} <= ${table.expiresAt}`,
        ),
    ],
);

export type CancellationRequest =
    typeof cancellationRequests.$inferSelect;

export type NewCancellationRequest =
    typeof cancellationRequests.$inferInsert;
