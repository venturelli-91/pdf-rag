import type { ChunkingConfig, OllamaConfig, RetrievalConfig } from "./types";

const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 200;
const DEFAULT_TOP_K = 5;
const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";
const DEFAULT_EMBEDDING_MODEL = "nomic-embed-text";
const DEFAULT_GENERATION_MODEL = "llama3.2";

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function parseNonNegativeInt(
  raw: string | undefined,
  fallback: number,
): number {
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function parseFiniteNumber(raw: string | undefined): number | undefined {
  if (raw === undefined) {
    return undefined;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

export function getChunkingConfig(): ChunkingConfig {
  return {
    chunkSize: parsePositiveInt(
      process.env.CHUNKING_CHUNK_SIZE,
      DEFAULT_CHUNK_SIZE,
    ),
    chunkOverlap: parseNonNegativeInt(
      process.env.CHUNKING_CHUNK_OVERLAP,
      DEFAULT_CHUNK_OVERLAP,
    ),
  };
}

export function getRetrievalConfig(): RetrievalConfig {
  return {
    topK: parsePositiveInt(process.env.RETRIEVAL_TOP_K, DEFAULT_TOP_K),
    scoreThreshold: parseFiniteNumber(process.env.RETRIEVAL_SCORE_THRESHOLD),
  };
}

export function getOllamaConfig(): OllamaConfig {
  return {
    baseUrl: process.env.OLLAMA_BASE_URL ?? DEFAULT_OLLAMA_BASE_URL,
    embeddingModel:
      process.env.OLLAMA_EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL,
    generationModel:
      process.env.OLLAMA_GENERATION_MODEL ?? DEFAULT_GENERATION_MODEL,
  };
}
