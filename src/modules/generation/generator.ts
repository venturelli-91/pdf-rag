import { getOllamaConfig } from "../config";
import { buildGroundedPrompt } from "../prompt-builder";
import { GenerationError } from "./errors";
import type { ContextChunk, GeneratedAnswer, GenerationOptions } from "./types";

const INSUFFICIENT_EVIDENCE_ANSWER =
  "I don't have enough information in the provided documents to answer this question.";

export async function generateAnswer(
  query: string,
  chunks: ContextChunk[],
  options: GenerationOptions = {},
): Promise<GeneratedAnswer> {
  if (chunks.length === 0) {
    return { answer: INSUFFICIENT_EVIDENCE_ANSWER, grounded: false };
  }

  const ollamaConfig = getOllamaConfig();
  const model = options.model ?? ollamaConfig.generationModel;
  const prompt = buildGroundedPrompt(query, chunks);

  const response = await fetch(`${ollamaConfig.baseUrl}/api/generate`, {
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
