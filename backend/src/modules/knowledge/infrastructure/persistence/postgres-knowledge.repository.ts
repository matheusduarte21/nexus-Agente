
import {
    and,
    asc,
    desc,
    eq,
    sql,
    cosineDistance,
} from 'drizzle-orm';

import type {
    DatabaseService,
} from '../../../../platform/database/database.service';

import {
    knowledgeChunks,
    knowledgeDocuments,
} from '../../../../platform/database/schema';


import type {
    KnowledgeSearchResult,
} from '../../domain/knowledge-search-result';

import {
    isValidEmbedding,
} from '../embeddings/embedding-validation';
import { KnowledgeSearchRepository } from '../../application/ports/nowledge-search.port';

const searchFields = {
    chunkId: knowledgeChunks.id,
    documentId: knowledgeDocuments.id,
    sourceKey: knowledgeDocuments.sourceKey,
    title: knowledgeDocuments.title,
    version: knowledgeDocuments.version,
    content: knowledgeChunks.content,
    chunkIndex: knowledgeChunks.chunkIndex,
    pageNumber: knowledgeChunks.pageNumber,
    section: knowledgeChunks.section,
};

export class PostgresKnowledgeRepository
    implements KnowledgeSearchRepository {
    constructor(
        private readonly database: Pick<DatabaseService, 'db'>,
    ) { }

    public async semanticSearch(
        embedding: number[],
        embeddingModel: string,
        limit: number,
    ): Promise<KnowledgeSearchResult[]> {
        this.validateLimit(limit);

        if (!isValidEmbedding(embedding)) {
            throw new Error('Invalid query embedding');
        }

        const distance = cosineDistance(
            knowledgeChunks.embedding,
            embedding,
        );

        const score = sql<number>`
      1 - (${distance})
    `;

        return this.database.db
            .select({
                ...searchFields,
                score,
            })
            .from(knowledgeChunks)
            .innerJoin(
                knowledgeDocuments,
                eq(
                    knowledgeChunks.documentId,
                    knowledgeDocuments.id,
                ),
            )
            .where(
                and(
                    eq(knowledgeDocuments.isActive, true),
                    eq(
                        knowledgeChunks.embeddingModel,
                        embeddingModel,
                    ),
                ),
            )
            .orderBy(
                asc(distance),
                asc(knowledgeChunks.id),
            )
            .limit(limit);
    }

    public async lexicalSearch(
        query: string,
        embeddingModel: string,
        limit: number,
    ): Promise<KnowledgeSearchResult[]> {
        this.validateLimit(limit);

        const normalizedQuery = query.trim();

        if (
            !normalizedQuery ||
            normalizedQuery.length > 2000
        ) {
            throw new Error('Invalid search query');
        }

        const searchVector = sql`
      to_tsvector(
        'portuguese',
        ${knowledgeChunks.content}
      )
    `;

        const searchQuery = sql`
      websearch_to_tsquery(
        'portuguese',
        ${normalizedQuery}
      )
    `;

        const score = sql<number>`
      ts_rank(
        ${searchVector},
        ${searchQuery}
      )
    `;

        return this.database.db
            .select({
                ...searchFields,
                score,
            })
            .from(knowledgeChunks)
            .innerJoin(
                knowledgeDocuments,
                eq(
                    knowledgeChunks.documentId,
                    knowledgeDocuments.id,
                ),
            )
            .where(
                and(
                    eq(knowledgeDocuments.isActive, true),
                    eq(
                        knowledgeChunks.embeddingModel,
                        embeddingModel,
                    ),
                    sql`${searchVector} @@ ${searchQuery}`,
                ),
            )
            .orderBy(
                desc(score),
                asc(knowledgeChunks.id),
            )
            .limit(limit);
    }

    private validateLimit(limit: number): void {
        if (
            !Number.isInteger(limit) ||
            limit < 1 ||
            limit > 50
        ) {
            throw new Error('Invalid search limit');
        }
    }
}
