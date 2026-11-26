export interface KnowledgeSearchResult {
    readonly chunkId: string;
    readonly documentId: string;
    readonly sourceKey: string;
    readonly title: string;
    readonly version: number;
    readonly content: string;
    readonly chunkIndex: number;
    readonly pageNumber: number | null;
    readonly section: string | null;
    readonly score: number;
}