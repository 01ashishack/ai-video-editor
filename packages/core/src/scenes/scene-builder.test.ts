import { describe, expect, it } from "vitest";
import { buildScenesFromSrt } from "./scene-builder.js";
import type { SrtDocument } from "../srt/index.js";

const document: SrtDocument = {
  cues: [
    {
      index: 7,
      start: 1000,
      end: 3500,
      rawText: "The city wakes before sunrise."
    },
    {
      index: 8,
      start: 4000,
      end: 6250,
      rawText: "Workers arrive\nat the old textile mill."
    }
  ]
};

describe("buildScenesFromSrt", () => {
  it("creates one scene for one cue", () => {
    const scenes = buildScenesFromSrt({
      cues: [document.cues[0]!]
    });

    expect(scenes).toHaveLength(1);
    expect(scenes[0]?.text).toBe("The city wakes before sunrise.");
  });

  it("sets scene order from cue order", () => {
    const scenes = buildScenesFromSrt(document);

    expect(scenes.map((scene) => scene.order)).toEqual([1, 2]);
  });

  it("maps cue timing to narrativeRange", () => {
    const scenes = buildScenesFromSrt(document);

    expect(scenes[0]?.narrativeRange).toEqual({
      start: 1000,
      duration: 2500
    });
    expect(scenes[1]?.narrativeRange).toEqual({
      start: 4000,
      duration: 2250
    });
  });

  it("generates sourceRefs for originating cues", () => {
    const scenes = buildScenesFromSrt(document, {
      sourceId: "source_srt_001"
    });

    expect(scenes[0]?.sourceRefs).toEqual([
      {
        sourceId: "source_srt_001",
        kind: "srt-cue",
        refId: "cue_007",
        range: {
          start: 1000,
          duration: 2500
        }
      }
    ]);
  });

  it("generates deterministic scene ids", () => {
    const firstRun = buildScenesFromSrt(document);
    const secondRun = buildScenesFromSrt(document);

    expect(firstRun.map((scene) => scene.id)).toEqual(["scene_001", "scene_002"]);
    expect(secondRun.map((scene) => scene.id)).toEqual(
      firstRun.map((scene) => scene.id)
    );
  });
});
