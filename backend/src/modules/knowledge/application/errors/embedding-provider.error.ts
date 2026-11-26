export class EmbeddingProviderError extends Error {
    constructor() {
        super('Embedding provider unavailable');
        this.name = 'EmbeddingProviderError';
    }
}