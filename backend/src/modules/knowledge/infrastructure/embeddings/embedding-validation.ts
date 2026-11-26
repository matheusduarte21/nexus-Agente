
import {
    EMBEDDING_DIMENSIONS,
    EMBEDDING_BATCH_SIZE,
} from '../../../../shared/embedding.constants';

export function validateEmbeddingInputs(
    texts: string[],
): void {
    if (
        texts.length === 0 ||
        texts.length > EMBEDDING_BATCH_SIZE
    ) {
        throw new Error('Invalid embedding batch size');
    }

    for (const text of texts) {
        if (
            !text.trim() ||
            Buffer.byteLength(text, 'utf8') > 8000
        ) {
            throw new Error('Invalid embedding input');
        }
    }
}

export function isValidEmbedding(
    embedding: number[],
): boolean {
    return (
        embedding.length === EMBEDDING_DIMENSIONS &&
        embedding.every(Number.isFinite) &&
        embedding.some((value) => value !== 0)
    );
}
