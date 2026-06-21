import type { RetrievedChunk } from "../retrieval";

export interface GenerationOptions {
  model?: string;
}

export interface GeneratedAnswer {
  answer: string;
  grounded: boolean;
}

export type ContextChunk = RetrievedChunk;
