
import { Module } from '@nestjs/common';

import {
    ConfigModule,
    ConfigService,
} from '@nestjs/config';

import type {
    Environment,
} from '../../config/env.schema';

import {
    DatabaseModule,
} from '../../platform/database/database.module';

import {
    DatabaseService,
} from '../../platform/database/database.service';

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
import { SEARCH_KNOWLEDGE } from './application/knowledge-query';



import {
    SearchKnowledgeUseCase,
} from './application/use-cases/search-knowledge.use-case';
import {
    PostgresKnowledgeRepository,
} from './infrastructure/persistence/postgres-knowledge.repository';
import { KNOWLEDGE_SEARCH_REPOSITORY, KnowledgeSearchRepository } from './application/ports/nowledge-search.port';

@Module({
    imports: [
        ConfigModule,
        DatabaseModule,
    ],

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

                if (environment === 'test') {
                    return new MockEmbeddingProvider();
                }

                const provider = config.getOrThrow(
                    'EMBEDDING_PROVIDER',
                    { infer: true },
                );

                if (provider === 'mock') {
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

        {
            provide: KNOWLEDGE_SEARCH_REPOSITORY,

            inject: [DatabaseService],

            useFactory: (
                database: DatabaseService,
            ): PostgresKnowledgeRepository =>
                new PostgresKnowledgeRepository(database),
        },
        {
            provide: SEARCH_KNOWLEDGE,

            inject: [
                KNOWLEDGE_SEARCH_REPOSITORY,
                EMBEDDING_PROVIDER,
            ],

            useFactory: (
                repository: KnowledgeSearchRepository,
                embeddingProvider: EmbeddingProvider,
            ): SearchKnowledgeUseCase =>
                new SearchKnowledgeUseCase(
                    repository,
                    embeddingProvider,
                ),
        },
    ],

    exports: [
        EMBEDDING_PROVIDER,
    ],
})
export class KnowledgeModule { }
