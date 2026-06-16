import { describe, expect, it } from "vitest";
import { createClipDeleteIntent } from "./intent-builders.js";
import {
  assertEditingIntent,
  isEditingIntent,
  validateClipSplitIntentPayload,
  validateClipTrimIntentPayload,
  validateEditingIntent
} from "./intent-validation.js";

describe("editing intent validation", () => {
  it("accepts valid intents", () => {
    const intent = createClipDeleteIntent({
      clipId: "clip_001"
    });

    expect(validateEditingIntent(intent)).toEqual({
      valid: true,
      intent,
      errors: []
    });
    expect(isEditingIntent(intent)).toBe(true);
    expect(assertEditingIntent(intent)).toBe(intent);
  });

  it("rejects unsupported intent types", () => {
    expect(
      validateEditingIntent({
        schemaVersion: "0.1",
        type: "clip.fade",
        payload: {
          clipId: "clip_001"
        }
      })
    ).toEqual({
      valid: false,
      errors: [
        {
          code: "INVALID_INTENT_TYPE",
          message: "Editing intent type is not supported.",
          path: "/type"
        }
      ]
    });
  });

  it("rejects invalid schema versions", () => {
    expect(
      validateEditingIntent({
        schemaVersion: "0.2",
        type: "clip.delete",
        payload: {
          clipId: "clip_001"
        }
      })
    ).toEqual({
      valid: false,
      errors: [
        {
          code: "INVALID_SCHEMA_VERSION",
          message: "Editing intent schemaVersion must be 0.1.",
          path: "/schemaVersion"
        }
      ]
    });
  });

  it("rejects non-object payloads", () => {
    expect(
      validateEditingIntent({
        schemaVersion: "0.1",
        type: "clip.delete",
        payload: null
      })
    ).toEqual({
      valid: false,
      errors: [
        {
          code: "INVALID_PAYLOAD",
          message: "Editing intent payload must be an object.",
          path: "/payload"
        }
      ]
    });
  });

  it("rejects invalid trim durations", () => {
    expect(
      validateClipTrimIntentPayload({
        clipId: "clip_001",
        duration: 0
      })
    ).toEqual([
      {
        code: "INVALID_NUMBER",
        message: "duration must be a finite number greater than zero.",
        path: "/payload/duration"
      }
    ]);
  });

  it("rejects invalid split positions", () => {
    expect(
      validateClipSplitIntentPayload({
        clipId: "clip_001",
        splitAt: Number.POSITIVE_INFINITY
      })
    ).toEqual([
      {
        code: "INVALID_NUMBER",
        message: "splitAt must be a finite number greater than zero.",
        path: "/payload/splitAt"
      }
    ]);
  });
});
