export type EmbeddingErrorCode = "REQUEST_FAILED" | "INVALID_RESPONSE";

export class EmbeddingError extends Error {
  code: EmbeddingErrorCode;

  constructor(message: string, code: EmbeddingErrorCode) {
    super(message);
    this.name = "EmbeddingError";
    this.code = code;
  }
}
