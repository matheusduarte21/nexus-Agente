export class OrderProviderUnavailableError extends Error {
    constructor() {
        super('Order provider unavailable');
        this.name = 'OrderProviderUnavailableError';
    }
}