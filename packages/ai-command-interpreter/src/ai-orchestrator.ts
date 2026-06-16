import { generateEditingIntents } from "./ai-intent-generator.js";
import type { AIOrchestratorResult } from "./ai-orchestrator-types.js";
import type { EditingIntent } from "./intent-types.js";
import type { LLMProvider } from "./llm-provider-types.js";
import { parseEditingIntents } from "./multi-intent-parser.js";
import { parseEditingIntent } from "./parser.js";

export async function orchestrateEditingRequest(
  request: string,
  provider?: LLMProvider
): Promise<AIOrchestratorResult> {
  validateRequest(request);

  const singleIntent = tryParseSingleIntent(request);
  if (singleIntent) {
    return Object.freeze([singleIntent]) as EditingIntent[];
  }

  const multiIntent = tryParseMultipleIntents(request);
  if (multiIntent) {
    return multiIntent;
  }

  if (!provider) {
    throw new Error("AI provider is required when rule parsing fails.");
  }

  return generateEditingIntents(request, provider);
}

function tryParseSingleIntent(request: string): EditingIntent | undefined {
  try {
    return parseEditingIntent(request);
  } catch {
    return undefined;
  }
}

function tryParseMultipleIntents(request: string): EditingIntent[] | undefined {
  try {
    return parseEditingIntents(request);
  } catch {
    return undefined;
  }
}

function validateRequest(request: string): void {
  if (typeof request !== "string" || request.trim().length === 0) {
    throw new Error("AI orchestrator request must be a non-empty string.");
  }
}
