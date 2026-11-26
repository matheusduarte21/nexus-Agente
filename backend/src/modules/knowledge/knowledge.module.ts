
import { Module } from '@nestjs/common';

import {
    ConfigModule,
    ConfigService,
} from '@nestjs/config';

import type {
    Environment,
} from '../../config/env.schema';

import {
    EMBEDDING_PROVIDER,
} from './application/ports/embedding-provider.port';

import type {
    EmbeddingProvider,
} from './application/ports/embedding-provider.port';

import {
    DocumentLoader,
} from './infrastructure/documents/document-loader';

import {
    DocumentChunker,
} from './infrastructure/documents/document-chunker';

import {
    OpenAIEmbeddingProvider,
} from './infrastructure/embeddings/openai-embedding.provider';

import {
    MockEmbeddingProvider,
} from './infrastructure/embeddings/mock-embedding.provider';

@Module({
    imports: [ConfigModule],

    providers: [
        DocumentLoader,

        DocumentChunker,

        {
            provide: EMBEDDING_PROVIDER,

            inject: [ConfigService],

            useFactory: (
                config: ConfigService<Environment, true>,
            ): EmbeddingProvider => {
                const environment = config.getOrThrow(
                    'NODE_ENV',
                    { infer: true },
                );

                const provider = config.getOrThrow(
                    'EMBEDDING_PROVIDER',
                    { infer: true },
                );

                if (
                    environment === 'test' ||
                    provider === 'mock'
                ) {
                    return new MockEmbeddingProvider();
                }

                const apiKey = config.get(
                    'OPENAI_API_KEY',
                    { infer: true },
                );

                if (!apiKey) {
                    throw new Error(
                        'OpenAI configuration is required',
                    );
                }

                return new OpenAIEmbeddingProvider(apiKey);
            },
        },
    ],

    exports: [EMBEDDING_PROVIDER],
})
export class KnowledgeModule { }
