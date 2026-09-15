export class IndexerValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IndexerValidationError";
  }
}
