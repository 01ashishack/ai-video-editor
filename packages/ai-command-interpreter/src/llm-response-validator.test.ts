import { describe, expect, it } from "vitest";
import { EDITING_INTENT_SCHEMA_VERSION } from "./intent-types.js";
import { validateLLMResponse } from "./llm-response-validator.js";
import type { LLMResponse } from "./llm-provider-types.js";

describe("validateLLMResponse", () => {
  it("accepts a valid response", () => {
    const response: LLMResponse = {
      content: JSON.stringify({
        intents: [
          {
            schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
            type: "clip.trim",
            payload: {
              clipId: "clip_001",
              duration: 1200
            }
          }
        ]
      })
    };

    expect(validateLLMResponse(response)).toEqual({
      valid: true,
      errors: [],
      content: {
        intents: [
          {
            schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
            type: "clip.trim",
            payload: {
              clipId: "clip_001",
              duration: 1200
            }
          }
        ]
      }
    });
  });

  it("rejects empty responses", () => {
    expect(
      validateLLMResponse({
        content: "   "
      })
    ).toEqual({
      valid: false,
      errors: ["LLM response content must be a non-empty string."],
      content: undefined
    });
  });

  it("rejects invalid JSON", () => {
    expect(
      validateLLMResponse({
        content: "{not-json"
      })
    ).toEqual({
      valid: false,
      errors: ["LLM response content must be valid JSON."],
      content: undefined
    });
  });

  it("rejects malformed structures", () => {
    const response: LLMResponse = {
      content: JSON.stringify({
        intents: [
          {
            schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
            type: "clip.trim",
            payload: {
              clipId: "clip_001",
              duration: 0
            }
          }
        ]
      })
    };

    expect(validateLLMResponse(response)).toEqual({
      valid: false,
      errors: [
        "/intents/0: /payload/duration: INVALID_NUMBER - duration must be a finite number greater than zero."
      ],
      content: {
        intents: [
          {
            schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
            type: "clip.trim",
            payload: {
              clipId: "clip_001",
              duration: 0
            }
          }
        ]
      }
    });
  });

  it("produces deterministic output", () => {
    const response: LLMResponse = {
      content: JSON.stringify([
        {
          schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
          type: "clip.delete",
          payload: {
            clipId: "clip_001"
          }
        }
      ])
    };

    expect(validateLLMResponse(response)).toEqual(validateLLMResponse(response));
  });

  it("does not mutate the response and returns immutable metadata", () => {
    const response: LLMResponse = {
      content: JSON.stringify([
        {
          schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
          type: "clip.delete",
          payload: {
            clipId: "clip_001"
          }
        }
      ])
    };
    const originalResponse = structuredClone(response);
    const result = validateLLMResponse(response);

    expect(response).toEqual(originalResponse);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.errors)).toBe(true);
    expect(Object.isFrozen(result.content)).toBe(true);
    expect(() => {
      (result.errors as string[]).push("changed");
    }).toThrow();
  });
});
