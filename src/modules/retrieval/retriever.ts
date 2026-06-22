import { getRetrievalConfig } from "../config";
import { generateEmbedding } from "../embeddings";
import { searchChunks } from "../vector-store";
import { RetrievalError } from "./errors";
import type { RetrievalOptions, RetrievedChunk } from "./types";

export async function retrieveRelevantChunks(
  query: string,
  options: RetrievalOptions = {},
): Promise<RetrievedChunk[]> {
  if (query.trim().length === 0) {
    return [];
  }

  const defaults = getRetrievalConfig();
  const topK = options.topK ?? defaults.topK;

  let queryVector: number[];
  try {
    queryVector = await generateEmbedding(query);
  } catch {
    throw new RetrievalError(
      "Failed to embed the query for retrieval.",
      "EMBEDDING_FAILED",
    );
  }

  let results: Awaited<ReturnType<typeof searchChunks>>;
  try {
    results = await searchChunks(queryVector, {
      limit: topK,
      documentId: options.documentId,
    });
  } catch {
    throw new RetrievalError(
      "Failed to search the vector store for relevant chunks.",
      "SEARCH_FAILED",
    );
  }

  const chunks: RetrievedChunk[] = results.map((result) => ({
    text: result.text,
    documentId: result.documentId,
    documentName: result.documentName,
    pageNumber: result.pageNumber,
    chunkIndex: result.chunkIndex,
    score: result.distance,
  }));

  const scoreThreshold = options.scoreThreshold ?? defaults.scoreThreshold;
  if (scoreThreshold === undefined) {
    return chunks;
  }

  return chunks.filter((chunk) => chunk.score <= scoreThreshold);
}
