
import { createHash } from 'node:crypto';
import { extname, basename } from 'node:path';
import { PDFParse } from 'pdf-parse';

import type {
    DocumentPage,
    KnowledgeDocumentSource,
} from '../../domain/knowledge-document';

export class DocumentLoader {
    private readonly maxFileSize = 5 * 1024 * 1024;
    private readonly maxPages = 100;
    private readonly maxTextLength = 500_000;

    public async load(
        filename: string,
        data: Buffer,
    ): Promise<KnowledgeDocumentSource> {
        if (
            !filename ||
            filename.length > 200 ||
            filename.includes('/') ||
            filename.includes('\\')
        ) {
            throw new Error('Invalid document filename');
        }

        if (
            data.byteLength === 0 ||
            data.byteLength > this.maxFileSize
        ) {
            throw new Error('Invalid document size');
        }

        const extension = extname(filename).toLowerCase();

        let pages: DocumentPage[];

        switch (extension) {
            case '.txt':
            case '.md':
                pages = this.loadText(data);
                break;

            case '.pdf':
                pages = await this.loadPdf(data);
                break;

            default:
                throw new Error('Unsupported document format');
        }

        const totalLength = pages.reduce(
            (total, page) => total + page.content.length,
            0,
        );

        if (
            totalLength === 0 ||
            totalLength > this.maxTextLength
        ) {
            throw new Error('Invalid extracted document content');
        }

        return {
            sourceKey: filename,
            title: basename(filename, extname(filename)),
            contentHash: createHash('sha256')
                .update(data)
                .digest('hex'),
            pages,
        };
    }

    private loadText(data: Buffer): DocumentPage[] {
        const content = new TextDecoder('utf-8', {
            fatal: true,
        })
            .decode(data)
            .trim();

        return [
            {
                content,
                pageNumber: null,
            },
        ];
    }

    private async loadPdf(
        data: Buffer,
    ): Promise<DocumentPage[]> {
        const parser = new PDFParse({
            data,
            isEvalSupported: false,
        });

        try {
            const info = await parser.getInfo();

            if (info.total > this.maxPages) {
                throw new Error('PDF page limit exceeded');
            }

            const result = await parser.getText();

            return result.pages
                .map((page) => ({
                    content: page.text.trim(),
                    pageNumber: page.num,
                }))
                .filter((page) => page.content.length > 0);
        } finally {
            await parser.destroy();
        }
    }
}
