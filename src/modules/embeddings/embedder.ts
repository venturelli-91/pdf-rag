import { EmbeddingError } from "./errors";
import type { EmbeddingOptions, EmbeddingVector } from "./types";

const DEFAULT_MODEL = "nomic-embed-text";

function getBaseUrl(): string {
  return process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
}

function getDefaultModel(): string {
  return process.env.OLLAMA_EMBEDDING_MODEL ?? DEFAULT_MODEL;
}

export async function generateEmbeddings(
  texts: string[],
  options: EmbeddingOptions = {},
): Promise<EmbeddingVector[]> {
  if (texts.length === 0) {
    return [];
  }

  const model = options.model ?? getDefaultModel();

  const response = await fetch(`${getBaseUrl()}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, input: texts }),
  });

  if (!response.ok) {
    throw new EmbeddingError(
      `Ollama embeddings request failed with status ${response.status}.`,
      "REQUEST_FAILED",
    );
  }

  const data = await response.json();
  if (!Array.isArray(data.embeddings)) {
    throw new EmbeddingError(
      "Ollama response did not include embeddings.",
      "INVALID_RESPONSE",
    );
  }

  return data.embeddings;
}

// Routes through generateEmbeddings so queries and documents always share
// the same model/dimensionality (FR05 acceptance criterion).
export async function generateEmbedding(
  text: string,
  options: EmbeddingOptions = {},
): Promise<EmbeddingVector> {
  const [embedding] = await generateEmbeddings([text], options);
  return embedding;
}
