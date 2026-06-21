import { buildGroundedPrompt } from "../prompt-builder";
import { GenerationError } from "./errors";
import type { ContextChunk, GeneratedAnswer, GenerationOptions } from "./types";

const DEFAULT_MODEL = "llama3.2";
const INSUFFICIENT_EVIDENCE_ANSWER =
  "I don't have enough information in the provided documents to answer this question.";

function getBaseUrl(): string {
  return process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
}

function getDefaultModel(): string {
  return process.env.OLLAMA_GENERATION_MODEL ?? DEFAULT_MODEL;
}

export async function generateAnswer(
  query: string,
  chunks: ContextChunk[],
  options: GenerationOptions = {},
): Promise<GeneratedAnswer> {
  if (chunks.length === 0) {
    return { answer: INSUFFICIENT_EVIDENCE_ANSWER, grounded: false };
  }

  const model = options.model ?? getDefaultModel();
  const prompt = buildGroundedPrompt(query, chunks);

  const response = await fetch(`${getBaseUrl()}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      system: prompt.system,
      prompt: prompt.user,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new GenerationError(
      `Ollama generation request failed with status ${response.status}.`,
      "REQUEST_FAILED",
    );
  }

  const data = await response.json();
  if (typeof data.response !== "string") {
    throw new GenerationError(
      "Ollama response did not include generated text.",
      "INVALID_RESPONSE",
    );
  }

  return { answer: data.response.trim(), grounded: true };
}
