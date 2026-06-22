import { chunkDocument } from "../chunking";
import { generateEmbeddings } from "../embeddings";
import { parsePdf } from "../pdf-parser";
import type { IndexableChunk } from "../vector-store";

export async function buildIndexableChunks(
  buffer: Buffer,
): Promise<IndexableChunk[]> {
  const parsed = await parsePdf(buffer);
  const chunks = chunkDocument(parsed);

  if (chunks.length === 0) {
    return [];
  }

  const vectors = await generateEmbeddings(chunks.map((chunk) => chunk.text));
  return chunks.map((chunk, i) => ({ ...chunk, vector: vectors[i] }));
}
