export class InvalidKnowledgeQueryError extends Error {
  constructor() {
    super('Invalid knowledge query');
    this.name = 'InvalidKnowledgeQueryError';
  }
}