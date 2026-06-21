import type { ContextChunk, GroundedPrompt } from "./types";

const SYSTEM_PROMPT = `You are a question-answering assistant. Answer using only the provided context — do not use outside knowledge.
If the context does not contain enough information to answer, say you don't know rather than guessing.
Answer concisely and reference the source document and page when relevant.`;

function formatChunk(chunk: ContextChunk): string {
  return `- (${chunk.documentName}, p.${chunk.pageNumber}): ${chunk.text}`;
}

function formatContext(chunks: ContextChunk[]): string {
  if (chunks.length === 0) {
    return "No relevant context was found.";
  }
  return chunks.map(formatChunk).join("\n");
}

export function buildGroundedPrompt(
  query: string,
  chunks: ContextChunk[],
): GroundedPrompt {
  const user = `Context:\n${formatContext(chunks)}\n\nQuestion: ${query}`;

  return { system: SYSTEM_PROMPT, user };
}
