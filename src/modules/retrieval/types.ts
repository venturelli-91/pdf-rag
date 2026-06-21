export interface RetrievalOptions {
  topK?: number;
  documentId?: string;
  scoreThreshold?: number;
}

export interface RetrievedChunk {
  text: string;
  documentId: string;
  documentName: string;
  pageNumber: number;
  chunkIndex: number;
  score: number;
}
