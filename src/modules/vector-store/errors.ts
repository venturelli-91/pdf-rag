export type VectorStoreErrorCode =
  | "INVALID_DOCUMENT_ID"
  | "INDEX_FAILED"
  | "SEARCH_FAILED"
  | "DELETE_FAILED";

export class VectorStoreError extends Error {
  code: VectorStoreErrorCode;

  constructor(message: string, code: VectorStoreErrorCode) {
    super(message);
    this.name = "VectorStoreError";
    this.code = code;
  }
}
