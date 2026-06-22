export interface ChunkingConfig {
  chunkSize: number;
  chunkOverlap: number;
}

export interface RetrievalConfig {
  topK: number;
  scoreThreshold?: number;
}

export interface OllamaConfig {
  baseUrl: string;
  embeddingModel: string;
  generationModel: string;
}
