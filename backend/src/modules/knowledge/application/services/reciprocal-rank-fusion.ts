
import type {
    KnowledgeSearchResult,
} from '../../domain/knowledge-search-result';

const RRF_K = 60;

export interface RankedChunk {
    readonly chunk: KnowledgeSearchResult;
    readonly score: number;
}

export function reciprocalRankFusion(
    rankings: ReadonlyArray<
        readonly KnowledgeSearchResult[]
    >,
): RankedChunk[] {
    const results = new Map<string, RankedChunk>();

    for (const ranking of rankings) {
        const seen = new Set<string>();

        for (const [index, chunk] of ranking.entries()) {
            if (seen.has(chunk.chunkId)) {
                continue;
            }

            seen.add(chunk.chunkId);

            const contribution = 1 / (RRF_K + index + 1);

            const existing = results.get(chunk.chunkId);

            results.set(chunk.chunkId, {
                chunk: existing?.chunk ?? chunk,

                score: (existing?.score ?? 0) + contribution,
            });
        }
    }

    return [...results.values()].sort(
        (first, second) =>
            second.score - first.score ||
            first.chunk.chunkId.localeCompare(
                second.chunk.chunkId,
            ),
    );
}
