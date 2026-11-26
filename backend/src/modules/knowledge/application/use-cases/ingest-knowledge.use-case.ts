
import type {
    DocumentChunk,
    KnowledgeDocumentSource,
} from '../../domain/knowledge-document';

import type {
    EmbeddingProvider,
} from '../ports/embedding-provider.port';

import type {
    EmbeddedChunk,
    IngestionResult,
    KnowledgeWriter,
} from '../ports/knowledge-writer.port';

import {
    EMBEDDING_BATCH_SIZE,
} from '../../../../shared/embedding.constants';

export class IngestKnowledgeUseCase {
    constructor(
        private readonly writer: KnowledgeWriter,
        private readonly embeddingProvider: EmbeddingProvider,
    ) { }

    public async execute(
        document: KnowledgeDocumentSource,
        chunks: DocumentChunk[],
    ): Promise<IngestionResult> {
        if (chunks.length === 0 || chunks.length > 1000) {
            throw new Error('Invalid document chunks');
        }

        const currentVersion =
            await this.writer.findCurrentVersion(
                document.sourceKey,
                document.contentHash,
                this.embeddingProvider.model,
            );

        if (currentVersion !== null) {
            return {
                sourceKey: document.sourceKey,
                version: currentVersion,
                status: 'skipped',
            };
        }

        const embeddedChunks: EmbeddedChunk[] = [];

        for (
            let offset = 0;
            offset < chunks.length;
            offset += EMBEDDING_BATCH_SIZE
        ) {
            const batch = chunks.slice(
                offset,
                offset + EMBEDDING_BATCH_SIZE,
            );

            const embeddings =
                await this.embeddingProvider.embedDocuments(
                    batch.map((chunk) => chunk.content),
                );

            if (embeddings.length !== batch.length) {
                throw new Error('Invalid embedding batch');
            }

            for (const [index, chunk] of batch.entries()) {
                const embedding = embeddings[index];

                if (
                    !embedding ||
                    embedding.length !== this.embeddingProvider.dimensions ||
                    !embedding.every(Number.isFinite) ||
                    !embedding.some((value) => value !== 0)
                ) {
                    throw new Error('Invalid chunk embedding');
                }

                embeddedChunks.push({
                    ...chunk,
                    embedding,
                });
            }
        }

        return this.writer.save(
            document,
            embeddedChunks,
            this.embeddingProvider.model,
        );
    }
}
