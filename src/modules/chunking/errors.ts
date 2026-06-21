export type ChunkingErrorCode = "INVALID_OPTIONS";

export class ChunkingError extends Error {
  code: ChunkingErrorCode;

  constructor(message: string, code: ChunkingErrorCode) {
    super(message);
    this.name = "ChunkingError";
    this.code = code;
  }
}
