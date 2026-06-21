export interface ChunkingOptions {
  chunkSize?: number;
  chunkOverlap?: number;
}

export interface Chunk {
  text: string;
  pageNumber: number;
  chunkIndex: number;
}
