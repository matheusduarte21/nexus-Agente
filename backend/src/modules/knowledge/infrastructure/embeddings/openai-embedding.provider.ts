
import OpenAI from 'openai';

import {
    EMBEDDING_DIMENSIONS,
    OPENAI_EMBEDDING_MODEL,
} from '../../../../shared/embedding.constants';

import type {
    EmbeddingProvider,
} from '../../application/ports/embedding-provider.port';

import {
    EmbeddingProviderError,
} from '../../application/errors/embedding-provider.error';

import {
    isValidEmbedding,
    validateEmbeddingInputs,
} from './embedding-validation';
import { observeGeneration } from 'src/platform/observability/telemetry';

export class OpenAIEmbeddingProvider
    implements EmbeddingProvider {
    public readonly model = OPENAI_EMBEDDING_MODEL;

    public readonly dimensions = EMBEDDING_DIMENSIONS;

    private readonly client: OpenAI;

    constructor(apiKey: string) {
        this.client = new OpenAI({
            apiKey,

            baseURL: 'https://api.openai.com/v1',

            timeout: 10_000,

            maxRetries: 0,

            logLevel: 'off',
        });
    }

    public async embedDocuments(
        texts: string[],
    ): Promise<number[][]> {
        validateEmbeddingInputs(texts);

        try {
            const response = await observeGeneration(
                'embedding',
                this.model,

                async (recordUsage) => {
                    const result =
                        await this.client.embeddings.create({
                            model: this.model,
                            input: texts,
                            dimensions: this.dimensions,
                            encoding_format: 'float',
                        });

                    recordUsage(
                        result.usage.prompt_tokens,
                        0,
                    );

                    return result;
                },
            );

            const results = [...response.data].sort(
                (first, second) =>
                    first.index - second.index,
            );

            if (
                results.length !== texts.length ||
                results.some(
                    (item, index) =>
                        item.index !== index ||
                        !isValidEmbedding(item.embedding),
                )
            ) {
                throw new EmbeddingProviderError();
            }

            return results.map(
                (item) => item.embedding,
            );
        } catch {
            throw new EmbeddingProviderError();
        }
    }

    public async embedQuery(
        text: string,
    ): Promise<number[]> {
        const [embedding] = await this.embedDocuments([
            text,
        ]);

        if (!embedding) {
            throw new EmbeddingProviderError();
        }

        return embedding;
    }
}
