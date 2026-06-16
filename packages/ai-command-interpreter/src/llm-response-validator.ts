import type { LLMResponse } from "./llm-provider-types.js";
import type { ValidatedLLMResponse } from "./llm-response-validator-types.js";
import {
  formatIntentValidationErrors,
  validateEditingIntent
} from "./intent-validation.js";

export function validateLLMResponse(
  response: LLMResponse
): ValidatedLLMResponse {
  if (!isRecord(response)) {
    return createResult(false, ["LLM response must be an object."], undefined);
  }

  if (typeof response.content !== "string" || response.content.trim().length === 0) {
    return createResult(
      false,
      ["LLM response content must be a non-empty string."],
      undefined
    );
  }

  const parsed = parseJsonContent(response.content);
  if (!parsed.valid) {
    return createResult(false, parsed.errors, undefined);
  }

  const intents = extractIntentArray(parsed.content);
  if (!intents.valid) {
    return createResult(false, intents.errors, freezeContent(parsed.content));
  }

  const schemaErrors = validateIntentStructures(intents.content);
  if (schemaErrors.length > 0) {
    return createResult(false, schemaErrors, freezeContent(parsed.content));
  }

  return createResult(true, [], freezeContent(parsed.content));
}

function parseJsonContent(
  content: string
): { valid: true; content: unknown } | { valid: false; errors: string[] } {
  try {
    return {
      valid: true,
      content: JSON.parse(content)
    };
  } catch {
    return {
      valid: false,
      errors: ["LLM response content must be valid JSON."]
    };
  }
}

function extractIntentArray(
  content: unknown
): { valid: true; content: unknown[] } | { valid: false; errors: string[] } {
  if (Array.isArray(content)) {
    return {
      valid: true,
      content
    };
  }

  if (isRecord(content) && Array.isArray(content.intents)) {
    return {
      valid: true,
      content: content.intents
    };
  }

  return {
    valid: false,
    errors: ["LLM response JSON must be an intent array or { intents: [...] }."]
  };
}

function validateIntentStructures(intents: readonly unknown[]): string[] {
  if (intents.length === 0) {
    return ["LLM response must contain at least one intent."];
  }

  return intents.flatMap((intent, index) => {
    const result = validateEditingIntent(intent);

    return result.valid
      ? []
      : [`/intents/${index}: ${formatIntentValidationErrors(result.errors)}`];
  });
}

function createResult(
  valid: boolean,
  errors: readonly string[],
  content: unknown
): ValidatedLLMResponse {
  return Object.freeze({
    valid,
    errors: Object.freeze([...errors]),
    content
  });
}

function freezeContent(content: unknown): unknown {
  if (Array.isArray(content)) {
    content.forEach(freezeContent);
    return Object.freeze(content);
  }

  if (isRecord(content)) {
    Object.values(content).forEach(freezeContent);
    return Object.freeze(content);
  }

  return content;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
