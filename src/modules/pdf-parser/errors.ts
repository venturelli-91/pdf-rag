export type PdfParsingErrorCode = "UNREADABLE";

export class PdfParsingError extends Error {
  code: PdfParsingErrorCode;

  constructor(message: string, code: PdfParsingErrorCode) {
    super(message);
    this.name = "PdfParsingError";
    this.code = code;
  }
}
