import { describe, expect, it } from "vitest";
import { analyzeIntentConfidence } from "./intent-confidence.js";
import { createClipTrimIntent, createSceneReplaceIntent } from "./intent-builders.js";
import { EDITING_INTENT_SCHEMA_VERSION, type EditingIntent } from "./intent-types.js";

describe("analyzeIntentConfidence", () => {
  it("returns high confidence for stable intent references", () => {
    const intent = createSceneReplaceIntent({
      sceneId: "scene_001",
      text: "A clearer replacement scene."
    });

    expect(analyzeIntentConfidence(intent)).toEqual({
      confidence: 0.95,
      ambiguityReasons: [],
      requiresClarification: false
    });
  });

  it("returns medium confidence for unresolved numeric references", () => {
    const intent = createSceneReplaceIntent({
      sceneNumber: 2
    });

    expect(analyzeIntentConfidence(intent)).toEqual({
      confidence: 0.7,
      ambiguityReasons: ["Scene number must be resolved to a sceneId."],
      requiresClarification: false
    });
  });

  it("returns low confidence for missing references", () => {
    const intent = {
      schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
      type: "clip.delete",
      payload: {}
    } as unknown as EditingIntent;

    expect(analyzeIntentConfidence(intent)).toEqual({
      confidence: 0.25,
      ambiguityReasons: ["Clip reference is missing."],
      requiresClarification: true
    });
  });

  it("requires clarification for missing target references", () => {
    const intent = {
      schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
      type: "clip.move",
      payload: {
        clipId: "clip_001",
        placement: "after"
      }
    } as unknown as EditingIntent;

    expect(analyzeIntentConfidence(intent)).toEqual({
      confidence: 0.25,
      ambiguityReasons: ["Clip move target reference is missing."],
      requiresClarification: true
    });
  });

  it("requires clarification for multiple possible references", () => {
    const intent = {
      schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
      type: "clip.trim",
      payload: {
        clipIds: ["clip_001", "clip_002"],
        duration: 1000
      }
    } as unknown as EditingIntent;

    expect(analyzeIntentConfidence(intent)).toEqual({
      confidence: 0.25,
      ambiguityReasons: ["Multiple possible references were generated."],
      requiresClarification: true
    });
  });

  it("produces deterministic immutable output without mutating the intent", () => {
    const intent = createClipTrimIntent({
      clipId: "clip_001",
      duration: 1200
    });
    const originalIntent = structuredClone(intent);
    const result = analyzeIntentConfidence(intent);

    expect(result).toEqual(analyzeIntentConfidence(intent));
    expect(intent).toEqual(originalIntent);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.ambiguityReasons)).toBe(true);
    expect(() => {
      (result.ambiguityReasons as string[]).push("changed");
    }).toThrow();
  });
});
