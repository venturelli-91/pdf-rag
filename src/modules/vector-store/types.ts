export interface IndexableChunk {
  text: string;
  pageNumber: number;
  chunkIndex: number;
  vector: number[];
}

export interface ChunkRecord {
  vector: number[];
  text: string;
  documentId: string;
  documentName: string;
  pageNumber: number;
  chunkIndex: number;
}

export interface SearchOptions {
  limit?: number;
  documentId?: string;
}

export interface SearchResult {
  text: string;
  documentId: string;
  documentName: string;
  pageNumber: number;
  chunkIndex: number;
  distance: number;
}
