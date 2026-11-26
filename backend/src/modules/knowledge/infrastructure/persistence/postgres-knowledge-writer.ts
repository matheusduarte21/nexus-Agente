
import {
    and,
    desc,
    eq,
    sql,
} from 'drizzle-orm';

import type {
    NodePgDatabase,
} from 'drizzle-orm/node-postgres';

import * as schema from '../../../../platform/database/schema';

import type {
    KnowledgeDocumentSource,
} from '../../domain/knowledge-document';

import type {
    EmbeddedChunk,
    IngestionResult,
    KnowledgeWriter,
} from '../../application/ports/knowledge-writer.port';

type Database = NodePgDatabase<typeof schema>;

const {
    knowledgeDocuments,
    knowledgeChunks,
} = schema;

export class PostgresKnowledgeWriter
    implements KnowledgeWriter {
    constructor(
        private readonly database: Database,
    ) { }

    public async findCurrentVersion(
        sourceKey: string,
        contentHash: string,
        embeddingModel: string,
    ): Promise<number | null> {
        return this.findMatchingVersion(
            this.database,
            sourceKey,
            contentHash,
            embeddingModel,
        );
    }

    public async save(
        document: KnowledgeDocumentSource,
        chunks: EmbeddedChunk[],
        embeddingModel: string,
    ): Promise<IngestionResult> {
        return this.database.transaction(
            async (tx) => {
                await tx.execute(sql`
          SELECT pg_advisory_xact_lock(
            hashtext(${document.sourceKey})::bigint
          )
        `);

                const currentVersion =
                    await this.findMatchingVersion(
                        tx,
                        document.sourceKey,
                        document.contentHash,
                        embeddingModel,
                    );

                if (currentVersion !== null) {
                    return {
                        sourceKey: document.sourceKey,
                        version: currentVersion,
                        status: 'skipped',
                    };
                }

                const [latest] = await tx
                    .select({
                        version: knowledgeDocuments.version,
                    })
                    .from(knowledgeDocuments)
                    .where(
                        eq(
                            knowledgeDocuments.sourceKey,
                            document.sourceKey,
                        ),
                    )
                    .orderBy(
                        desc(knowledgeDocuments.version),
                    )
                    .limit(1);

                const version = (latest?.version ?? 0) + 1;

                const [created] = await tx
                    .insert(knowledgeDocuments)
                    .values({
                        sourceKey: document.sourceKey,
                        title: document.title,
                        contentHash: document.contentHash,
                        version,
                        isActive: false,
                    })
                    .returning({
                        id: knowledgeDocuments.id,
                    });

                if (!created) {
                    throw new Error('Document creation failed');
                }

                for (
                    let offset = 0;
                    offset < chunks.length;
                    offset += 32
                ) {
                    const batch = chunks.slice(
                        offset,
                        offset + 32,
                    );

                    await tx
                        .insert(knowledgeChunks)
                        .values(
                            batch.map((chunk) => ({
                                documentId: created.id,
                                chunkIndex: chunk.chunkIndex,
                                content: chunk.content,
                                embedding: chunk.embedding,
                                embeddingModel,
                                pageNumber: chunk.pageNumber,
                                section: chunk.section,
                            })),
                        );
                }

                await tx
                    .update(knowledgeDocuments)
                    .set({
                        isActive: false,
                    })
                    .where(
                        and(
                            eq(
                                knowledgeDocuments.sourceKey,
                                document.sourceKey,
                            ),
                            eq(knowledgeDocuments.isActive, true),
                        ),
                    );

                await tx
                    .update(knowledgeDocuments)
                    .set({
                        isActive: true,
                    })
                    .where(
                        eq(knowledgeDocuments.id, created.id),
                    );

                return {
                    sourceKey: document.sourceKey,
                    version,
                    status: 'ingested',
                };
            },
        );
    }

    private async findMatchingVersion(
        database: Pick<Database, 'select'>,
        sourceKey: string,
        contentHash: string,
        embeddingModel: string,
    ): Promise<number | null> {
        const [document] = await database
            .select({
                version: knowledgeDocuments.version,
            })
            .from(knowledgeDocuments)
            .innerJoin(
                knowledgeChunks,
                eq(
                    knowledgeChunks.documentId,
                    knowledgeDocuments.id,
                ),
            )
            .where(
                and(
                    eq(knowledgeDocuments.sourceKey, sourceKey),
                    eq(knowledgeDocuments.contentHash, contentHash),
                    eq(knowledgeDocuments.isActive, true),
                    eq(knowledgeChunks.embeddingModel, embeddingModel),
                ),
            )
            .limit(1);

        return document?.version ?? null;
    }
}
