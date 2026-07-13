import {
  getDeepseekConfig,
  getGenerationProvider,
  getOllamaConfig,
} from "../config";
import { type GroundedPrompt, buildGroundedPrompt } from "../prompt-builder";
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

  const prompt = buildGroundedPrompt(query, chunks);

  return getGenerationProvider() === "deepseek"
    ? generateWithDeepseek(prompt, options)
    : generateWithOllama(prompt, options);
}

async function generateWithOllama(
  prompt: GroundedPrompt,
  options: GenerationOptions,
): Promise<GeneratedAnswer> {
  const ollamaConfig = getOllamaConfig();
  const model = options.model ?? ollamaConfig.generationModel;

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

async function generateWithDeepseek(
  prompt: GroundedPrompt,
  options: GenerationOptions,
): Promise<GeneratedAnswer> {
  const deepseekConfig = getDeepseekConfig();
  if (!deepseekConfig.apiKey) {
    throw new GenerationError(
      "DEEPSEEK_API_KEY is not set.",
      "MISSING_API_KEY",
    );
  }
  const model = options.model ?? deepseekConfig.model;

  const response = await fetch(`${deepseekConfig.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${deepseekConfig.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new GenerationError(
      `DeepSeek generation request failed with status ${response.status}.`,
      "REQUEST_FAILED",
    );
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new GenerationError(
      "DeepSeek response did not include generated text.",
      "INVALID_RESPONSE",
    );
  }

  return { answer: content.trim(), grounded: true };
}
