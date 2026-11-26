
import { sql } from 'drizzle-orm';

import {
    boolean,
    check,
    integer,
    pgTable,
    text,
    timestamp,
    unique,
    uniqueIndex,
    uuid,
} from 'drizzle-orm/pg-core';

export const knowledgeDocuments = pgTable(
    'knowledge_documents',
    {
        id: uuid('id')
            .defaultRandom()
            .primaryKey(),

        sourceKey: text('source_key')
            .notNull(),

        title: text('title')
            .notNull(),

        version: integer('version')
            .default(1)
            .notNull(),

        contentHash: text('content_hash'),

        isActive: boolean('is_active')
            .default(false)
            .notNull(),

        createdAt: timestamp('created_at', {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        unique('knowledge_document_version_unique')
            .on(table.sourceKey, table.version),

        uniqueIndex('knowledge_document_active_unique')
            .on(table.sourceKey)
            .where(sql`${table.isActive} = true`),

        check(
            'knowledge_document_version_positive',
            sql`${table.version} > 0`,
        ),

        check(
            'knowledge_document_hash_format',
            sql`${table.contentHash} ~ '^[a-f0-9]{64}$'`,
        ),

        check(
            'knowledge_document_active_requires_hash',
            sql`NOT ${table.isActive}
        OR ${table.contentHash} IS NOT NULL`,
        ),
    ],
);

export type KnowledgeDocument =
    typeof knowledgeDocuments.$inferSelect;

export type NewKnowledgeDocument =
    typeof knowledgeDocuments.$inferInsert;
