export type GenerationErrorCode = "REQUEST_FAILED" | "INVALID_RESPONSE";

export class GenerationError extends Error {
  code: GenerationErrorCode;

  constructor(message: string, code: GenerationErrorCode) {
    super(message);
    this.name = "GenerationError";
    this.code = code;
  }
}
