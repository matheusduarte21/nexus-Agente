import type {
    DocumentChunk,
    KnowledgeDocumentSource,
} from '../../domain/knowledge-document';

export interface EmbeddedChunk extends DocumentChunk {
    readonly embedding: number[];
}

export interface IngestionResult {
    readonly sourceKey: string;
    readonly version: number;
    readonly status: 'ingested' | 'skipped';
}

export interface KnowledgeWriter {
    findCurrentVersion(
        sourceKey: string,
        contentHash: string,
        embeddingModel: string,
    ): Promise<number | null>;

    save(
        document: KnowledgeDocumentSource,
        chunks: EmbeddedChunk[],
        embeddingModel: string,
    ): Promise<IngestionResult>;
}