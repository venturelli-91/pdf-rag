export type DocumentUploadErrorCode =
  | "EMPTY"
  | "TOO_LARGE"
  | "INVALID_TYPE"
  | "CORRUPT";

export class DocumentUploadError extends Error {
  code: DocumentUploadErrorCode;

  constructor(message: string, code: DocumentUploadErrorCode) {
    super(message);
    this.name = "DocumentUploadError";
    this.code = code;
  }
}

export class DocumentNotFoundError extends Error {
  constructor(documentId: string) {
    super(`Document not found: ${documentId}`);
    this.name = "DocumentNotFoundError";
  }
}
