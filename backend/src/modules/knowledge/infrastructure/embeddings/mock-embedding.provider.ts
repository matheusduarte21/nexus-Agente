
import { createHash } from 'node:crypto';

import {
    EMBEDDING_DIMENSIONS,
    MOCK_EMBEDDING_MODEL,
} from '../../../../shared/embedding.constants';

import type {
    EmbeddingProvider,
} from '../../application/ports/embedding-provider.port';

import {
    validateEmbeddingInputs,
} from './embedding-validation';

export class MockEmbeddingProvider
    implements EmbeddingProvider {
    public readonly model = MOCK_EMBEDDING_MODEL;

    public readonly dimensions = EMBEDDING_DIMENSIONS;

    public embedDocuments(
        texts: string[],
    ): Promise<number[][]> {
        validateEmbeddingInputs(texts);

        const embeddings = texts.map(
            (text) => this.createEmbedding(text),
        );

        return Promise.resolve(embeddings);
    }

    public embedQuery(
        text: string,
    ): Promise<number[]> {
        validateEmbeddingInputs([text]);

        return Promise.resolve(
            this.createEmbedding(text),
        );
    }

    private createEmbedding(
        text: string,
    ): number[] {
        const vector = Array<number>(
            this.dimensions,
        ).fill(0);

        const normalized = text
            .normalize('NFKD')
            .replace(/\p{M}/gu, '')
            .toLowerCase()
            .trim();

        const tokens =
            normalized.match(/[\p{L}\p{N}]+/gu) ??
            [normalized || text];

        for (const token of tokens) {
            const hash = createHash('sha256')
                .update(token)
                .digest();

            const index =
                hash.readUInt32BE(0) % this.dimensions;

            vector[index] += 1;
        }

        const magnitude = Math.sqrt(
            vector.reduce(
                (sum, value) => sum + value * value,
                0,
            ),
        );

        return vector.map(
            (value) => value / magnitude,
        );
    }
}
