export type DocumentUploadErrorCode = "EMPTY" | "TOO_LARGE" | "INVALID_TYPE";

export class DocumentUploadError extends Error {
  code: DocumentUploadErrorCode;

  constructor(message: string, code: DocumentUploadErrorCode) {
    super(message);
    this.name = "DocumentUploadError";
    this.code = code;
  }
}
