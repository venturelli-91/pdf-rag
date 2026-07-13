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

export type GenerationProvider = "ollama" | "deepseek";

export interface DeepseekConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}
