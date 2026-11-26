
import {
    RecursiveCharacterTextSplitter,
} from '@langchain/textsplitters';

import type {
    DocumentChunk,
    KnowledgeDocumentSource,
} from '../../domain/knowledge-document';

export class DocumentChunker {
    private readonly splitter =
        new RecursiveCharacterTextSplitter({
            chunkSize: 1600,
            chunkOverlap: 240,
            separators: [
                '\n\n',
                '\n',
                '. ',
                ' ',
                '',
            ],
        });

    public async split(
        document: KnowledgeDocumentSource,
    ): Promise<DocumentChunk[]> {
        const chunks: DocumentChunk[] = [];

        for (const page of document.pages) {
            const sections = await this.splitter.splitText(
                page.content,
            );

            for (const section of sections) {
                const content = section.trim();

                if (!content) {
                    continue;
                }

                chunks.push({
                    chunkIndex: chunks.length,
                    content,
                    pageNumber: page.pageNumber,
                    section: null,
                });
            }
        }

        if (chunks.length === 0 || chunks.length > 1000) {
            throw new Error('Invalid document chunk count');
        }

        return chunks;
    }
}
