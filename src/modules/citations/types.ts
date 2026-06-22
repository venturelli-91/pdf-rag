import type { GeneratedAnswer } from "../generation";
import type { RetrievedChunk } from "../retrieval";

export interface Citation {
  documentName: string;
  pageNumber: number;
  passages: string[];
}

export interface AnswerWithCitations extends GeneratedAnswer {
  citations: Citation[];
}

export type CitedChunk = RetrievedChunk;
