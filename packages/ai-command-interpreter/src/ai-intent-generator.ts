import type { AIIntentGeneratorResult } from "./ai-intent-generator-types.js";
import { normalizeEditingIntent } from "./intent-builders.js";
import type { EditingIntent } from "./intent-types.js";
import type { LLMProvider } from "./llm-provider-types.js";

export async function generateEditingIntents(
  request: string,
  provider: LLMProvider
): Promise<AIIntentGeneratorResult> {
  validateRequest(request);

  const response = await provider.generate({
    prompt: request
  });
  const generatedIntents = parseGeneratedIntentResponse(response.content).map(
    (intent) => normalizeEditingIntent(intent)
  );

  return Object.freeze([...generatedIntents]) as EditingIntent[];
}

function parseGeneratedIntentResponse(content: string): unknown[] {
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("Generated intent response must be a non-empty JSON string.");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Generated intent response must be valid JSON.");
  }

  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (isRecord(parsed) && Array.isArray(parsed.intents)) {
    return parsed.intents;
  }

  throw new Error("Generated intent response must be an array of editing intents.");
}

function validateRequest(request: string): void {
  if (typeof request !== "string" || request.trim().length === 0) {
    throw new Error("AI intent generator request must be a non-empty string.");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export type { AIIntentGeneratorResult };
