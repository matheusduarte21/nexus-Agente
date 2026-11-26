
import { sql } from 'drizzle-orm';

import {
    check,
    index,
    pgTable,
    text,
    timestamp,
    uuid,
    varchar,
} from 'drizzle-orm/pg-core';

export const auditEvents = pgTable(
    'audit_events',
    {
        id: uuid('id')
            .defaultRandom()
            .primaryKey(),

        actorId: varchar('actor_id', {
            length: 128,
        }).notNull(),

        action: varchar('action', {
            length: 100,
        }).notNull(),

        resourceType: varchar('resource_type', {
            length: 100,
        }).notNull(),

        resourceId: varchar('resource_id', {
            length: 128,
        }).notNull(),

        outcome: text('outcome', {
            enum: [
                'success',
                'denied',
                'failure',
            ],
        }).notNull(),

        correlationId: uuid('correlation_id')
            .notNull(),

        createdAt: timestamp('created_at', {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        index('audit_actor_created_idx')
            .on(
                table.actorId,
                table.createdAt,
            ),

        index('audit_correlation_idx')
            .on(table.correlationId),

        check(
            'audit_outcome_valid',
            sql`${table.outcome} IN (
        'success',
        'denied',
        'failure'
      )`,
        ),
    ],
);

export type AuditEvent =
    typeof auditEvents.$inferSelect;

export type NewAuditEvent =
    typeof auditEvents.$inferInsert;
