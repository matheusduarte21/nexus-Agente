
import {
    readFile,
    readdir,
    stat,
} from 'node:fs/promises';

import { resolve, extname } from 'node:path';

import { parse } from 'dotenv';
import { z } from 'zod';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

import * as schema from '../../platform/database/schema';

import { DocumentLoader } from './infrastructure/documents/document-loader';

import { DocumentChunker } from './infrastructure/documents/document-chunker';

import { MockEmbeddingProvider } from './infrastructure/embeddings/mock-embedding.provider';

import { OpenAIEmbeddingProvider } from './infrastructure/embeddings/openai-embedding.provider';

import { PostgresKnowledgeWriter } from './infrastructure/persistence/postgres-knowledge-writer';

import { IngestKnowledgeUseCase } from './application/use-cases/ingest-knowledge.use-case';

const ingestionConfigSchema = z.object({
    INGESTION_DATABASE_URL: z.string().refine((value) => {
        try {
            const url = new URL(value);

            return (
                url.protocol === 'postgresql:' &&
                url.username === 'nexus_ingestor' &&
                url.hostname === '127.0.0.1' &&
                url.password.length > 0 &&
                url.pathname === '/nexus' &&
                !url.search &&
                !url.hash
            );
        } catch {
            return false;
        }
    }),

    EMBEDDING_PROVIDER: z
        .enum(['mock', 'openai'])
        .default('mock'),

    OPENAI_API_KEY: z.string().trim().min(1).optional(),
});

async function main(): Promise<void> {
    const environmentFile = await readFile(
        resolve('.env.ingestion'),
    );

    const config = ingestionConfigSchema.parse(
        parse(environmentFile),
    );

    const embeddingProvider =
        config.EMBEDDING_PROVIDER === 'openai'
            ? new OpenAIEmbeddingProvider(
                getRequiredApiKey(config.OPENAI_API_KEY),
            )
            : new MockEmbeddingProvider();

    const pool = new Pool({
        connectionString: config.INGESTION_DATABASE_URL,
        max: 2,
        connectionTimeoutMillis: 2000,
        statement_timeout: 15000,
        application_name: 'nexus-knowledge-ingestion',
    });

    try {
        const database = drizzle(pool, { schema });

        const loader = new DocumentLoader();

        const chunker = new DocumentChunker();

        const writer = new PostgresKnowledgeWriter(database);

        const useCase = new IngestKnowledgeUseCase(
            writer,
            embeddingProvider,
        );

        const directory = resolve('knowledge-base');

        const supportedExtensions = new Set([
            '.pdf',
            '.txt',
            '.md',
        ]);

        const files = (
            await readdir(directory, {
                withFileTypes: true,
            })
        ).filter(
            (entry) =>
                entry.isFile() &&
                supportedExtensions.has(
                    extname(entry.name).toLowerCase(),
                ),
        );

        if (files.length === 0 || files.length > 100) {
            throw new Error('Invalid knowledge base file count');
        }

        for (const file of files) {
            const path = resolve(directory, file.name);

            const metadata = await stat(path);

            if (metadata.size > 5 * 1024 * 1024) {
                throw new Error('Document size limit exceeded');
            }

            const data = await readFile(path);

            const document = await loader.load(
                file.name,
                data,
            );

            const chunks = await chunker.split(document);

            const result = await useCase.execute(
                document,
                chunks,
            );

            process.stdout.write(
                `${JSON.stringify(result)}\n`,
            );
        }
    } finally {
        await pool.end();
    }
}

function getRequiredApiKey(
    apiKey: string | undefined,
): string {
    if (!apiKey) {
        throw new Error('OpenAI configuration is required');
    }

    return apiKey;
}

void main().catch(() => {
    process.stderr.write(
        'Knowledge ingestion failed. Verify configuration and documents.\n',
    );

    process.exitCode = 1;
});
