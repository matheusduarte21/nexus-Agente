
export const SEARCH_KNOWLEDGE = Symbol(
    'SEARCH_KNOWLEDGE',
);

export interface KnowledgeCitation {
    readonly chunkId: string;
    readonly documentId: string;
    readonly sourceKey: string;
    readonly title: string;
    readonly version: number;
    readonly chunkIndex: number;
    readonly pageNumber: number | null;
    readonly section: string | null;
}

export interface KnowledgeEvidence {
    readonly content: string;
    readonly citation: KnowledgeCitation;
}

export type KnowledgeSearchResponse =
    | {
        readonly status: 'found';
        readonly evidence: readonly KnowledgeEvidence[];
    }
    | {
        readonly status: 'no_evidence' | 'unavailable';
        readonly evidence: readonly [];
    };

export interface KnowledgeQuery {
    execute(
        query: string,
    ): Promise<KnowledgeSearchResponse>;
}
