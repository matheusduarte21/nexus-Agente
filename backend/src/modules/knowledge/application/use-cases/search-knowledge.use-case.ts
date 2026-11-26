
import {
    MOCK_EMBEDDING_MODEL,
} from '../../../../shared/embedding.constants';
import { InvalidKnowledgeQueryError } from '../errors/invalid.knowledge-query.error';

import type {
    KnowledgeQuery,
    KnowledgeEvidence,
    KnowledgeSearchResponse,
} from '../knowledge-query';

import type {
    EmbeddingProvider,
} from '../ports/embedding-provider.port';
import { KnowledgeSearchRepository } from '../ports/nowledge-search.port';


import {
    reciprocalRankFusion,
} from '../services/reciprocal-rank-fusion';

const SEARCH_LIMIT = 20;
const MAX_EVIDENCE = 5;
const MAX_QUERY_LENGTH = 2000;
const MAX_CONTEXT_LENGTH = 8000;

export class SearchKnowledgeUseCase
    implements KnowledgeQuery {
    constructor(
        private readonly repository: KnowledgeSearchRepository,
        private readonly embeddingProvider: EmbeddingProvider,
    ) { }

    public async execute(
        query: string,
    ): Promise<KnowledgeSearchResponse> {
        if (
            typeof query !== 'string' ||
            query.length > MAX_QUERY_LENGTH ||
            !query.trim()
        ) {
            throw new InvalidKnowledgeQueryError();
        }

        const normalizedQuery = query.trim();

        try {
            const embedding =
                await this.embeddingProvider.embedQuery(
                    normalizedQuery,
                );

            const model = this.embeddingProvider.model;

            const [semanticResults, lexicalResults] =
                await Promise.all([
                    this.repository.semanticSearch(
                        embedding,
                        model,
                        SEARCH_LIMIT,
                    ),

                    this.repository.lexicalSearch(
                        normalizedQuery,
                        model,
                        SEARCH_LIMIT,
                    ),
                ]);

            const minimumSimilarity =
                model === MOCK_EMBEDDING_MODEL
                    ? 0.2
                    : 0.45;

            const relevantSemantic = semanticResults.filter(
                (chunk:any) =>
                    Number.isFinite(chunk.score) &&
                    chunk.score >= minimumSimilarity,
            );

            const relevantLexical = lexicalResults.filter(
                (chunk:any) =>
                    Number.isFinite(chunk.score) &&
                    chunk.score > 0,
            );

            const ranked = reciprocalRankFusion([
                relevantSemantic,
                relevantLexical,
            ]);

            const evidence: KnowledgeEvidence[] = [];

            let contextLength = 0;

            for (const { chunk } of ranked) {
                if (evidence.length >= MAX_EVIDENCE) {
                    break;
                }

                if (
                    !chunk.content.trim() ||
                    contextLength + chunk.content.length >
                    MAX_CONTEXT_LENGTH
                ) {
                    continue;
                }

                evidence.push({
                    content: chunk.content,

                    citation: {
                        chunkId: chunk.chunkId,
                        documentId: chunk.documentId,
                        sourceKey: chunk.sourceKey,
                        title: chunk.title,
                        version: chunk.version,
                        chunkIndex: chunk.chunkIndex,
                        pageNumber: chunk.pageNumber,
                        section: chunk.section,
                    },
                });

                contextLength += chunk.content.length;
            }

            if (evidence.length === 0) {
                return {
                    status: 'no_evidence',
                    evidence: [],
                };
            }

            return {
                status: 'found',
                evidence,
            };
        } catch {
            return {
                status: 'unavailable',
                evidence: [],
            };
        }
    }
}
