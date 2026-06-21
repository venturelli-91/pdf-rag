import type { RetrievedChunk } from "../retrieval";

export interface GroundedPrompt {
  system: string;
  user: string;
}

export type ContextChunk = RetrievedChunk;
