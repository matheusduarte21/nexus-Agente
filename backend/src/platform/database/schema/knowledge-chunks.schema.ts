
import { sql } from 'drizzle-orm';

import {
    check,
    index,
    integer,
    pgTable,
    text,
    timestamp,
    unique,
    uuid,
    vector,
} from 'drizzle-orm/pg-core';

import {
    knowledgeDocuments,
} from './knowledge-documents.schema';
import {
    EMBEDDING_DIMENSIONS,
} from '../../../shared/embedding.constants';
export {
    EMBEDDING_DIMENSIONS,
} from '../../../shared/embedding.constants';

export const knowledgeChunks = pgTable(
    'knowledge_chunks',
    {
        id: uuid('id')
            .defaultRandom()
            .primaryKey(),

        documentId: uuid('document_id')
            .notNull()
            .references(
                () => knowledgeDocuments.id,
                { onDelete: 'restrict' },
            ),

        chunkIndex: integer('chunk_index')
            .notNull(),

        content: text('content')
            .notNull(),

        embedding: vector('embedding', {
            dimensions: EMBEDDING_DIMENSIONS,
        }).notNull(),

        embeddingModel: text('embedding_model')
            .notNull(),

        section: text('section'),

        pageNumber: integer('page_number'),

        createdAt: timestamp('created_at', {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        unique('knowledge_chunk_position_unique')
            .on(table.documentId, table.chunkIndex),

        check(
            'knowledge_chunk_index_nonnegative',
            sql`${table.chunkIndex} >= 0`,
        ),

        check(
            'knowledge_chunk_content_not_empty',
            sql`length(btrim(${table.content})) > 0`,
        ),

        check(
            'knowledge_chunk_page_positive',
            sql`${table.pageNumber} > 0`,
        ),
        index('knowledge_chunks_fts_idx')
            .using(
                'gin',
                sql`to_tsvector('portuguese', ${table.content})`,
            ),
    ],
);

export type KnowledgeChunk =
    typeof knowledgeChunks.$inferSelect;

export type NewKnowledgeChunk =
    typeof knowledgeChunks.$inferInsert;
