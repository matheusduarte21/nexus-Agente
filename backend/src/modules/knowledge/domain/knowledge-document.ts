export interface DocumentPage {
    readonly content: string;
    readonly pageNumber: number | null;
}

export interface KnowledgeDocumentSource {
    readonly sourceKey: string;
    readonly title: string;
    readonly contentHash: string;
    readonly pages: readonly DocumentPage[];
}

export interface DocumentChunk {
    readonly chunkIndex: number;
    readonly content: string;
    readonly pageNumber: number | null;
    readonly section: string | null;
}