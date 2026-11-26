
export class InvalidOrderIdError extends Error {
    constructor() {
        super('Invalid order identifier');
        this.name = 'InvalidOrderIdError';
    }
}
