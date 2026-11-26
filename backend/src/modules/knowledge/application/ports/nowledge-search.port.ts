import type {
    KnowledgeSearchResult,
} from '../../domain/knowledge-search-result';

export const KNOWLEDGE_SEARCH_REPOSITORY = Symbol(
    'KNOWLEDGE_SEARCH_REPOSITORY',
);

export interface KnowledgeSearchRepository {
    semanticSearch(
        embedding: number[],
        embeddingModel: string,
        limit: number,
    ): Promise<KnowledgeSearchResult[]>;

    lexicalSearch(
        query: string,
        embeddingModel: string,
        limit: number,
    ): Promise<KnowledgeSearchResult[]>;
}