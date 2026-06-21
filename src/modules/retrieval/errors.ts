export type RetrievalErrorCode = "EMBEDDING_FAILED" | "SEARCH_FAILED";

export class RetrievalError extends Error {
  code: RetrievalErrorCode;

  constructor(message: string, code: RetrievalErrorCode) {
    super(message);
    this.name = "RetrievalError";
    this.code = code;
  }
}
