import { describe, expect, it } from "vitest";
import type { RemotionComposition } from "./remotion-adapter.js";
import { generateCompositionGraph } from "./composition-generator.js";

function createComposition(
  clips: RemotionComposition["clips"] = []
): RemotionComposition {
  return {
    compositionId: "project_001_composition",
    durationInFrames: 120,
    fps: 30,
    width: 1920,
    height: 1080,
    clips
  };
}

describe("generateCompositionGraph", () => {
  it("generates empty composition", () => {
    const composition = createComposition([]);

    expect(generateCompositionGraph(composition)).toEqual({
      compositionId: "project_001_composition",
      durationInFrames: 120,
      fps: 30,
      width: 1920,
      height: 1080,
      nodes: []
    });
  });

  it("maps video clip", () => {
    const composition = createComposition([
      {
        id: "clip_001",
        fromFrame: 0,
        durationInFrames: 30,
        mediaType: "video"
      }
    ]);

    expect(generateCompositionGraph(composition).nodes[0]?.type).toBe("video");
  });

  it("maps image clip", () => {
    const composition = createComposition([
      {
        id: "clip_001",
        fromFrame: 0,
        durationInFrames: 30,
        mediaType: "image"
      }
    ]);

    expect(generateCompositionGraph(composition).nodes[0]?.type).toBe("image");
  });

  it("maps audio clip", () => {
    const composition = createComposition([
      {
        id: "clip_001",
        fromFrame: 0,
        durationInFrames: 30,
        mediaType: "audio"
      }
    ]);

    expect(generateCompositionGraph(composition).nodes[0]?.type).toBe("audio");
  });

  it("maps unknown mediaType to placeholder", () => {
    const composition = createComposition([
      {
        id: "clip_001",
        fromFrame: 0,
        durationInFrames: 30,
        mediaType: "subtitle"
      }
    ]);

    expect(generateCompositionGraph(composition).nodes[0]?.type).toBe(
      "placeholder"
    );
  });

  it("preserves assetId", () => {
    const composition = createComposition([
      {
        id: "clip_001",
        assetId: "asset_001",
        fromFrame: 0,
        durationInFrames: 30,
        mediaType: "video"
      }
    ]);

    expect(generateCompositionGraph(composition).nodes[0]?.assetId).toBe(
      "asset_001"
    );
  });

  it("preserves sceneId", () => {
    const composition = createComposition([
      {
        id: "clip_001",
        sceneId: "scene_001",
        fromFrame: 0,
        durationInFrames: 30,
        mediaType: "video"
      }
    ]);

    expect(generateCompositionGraph(composition).nodes[0]?.sceneId).toBe(
      "scene_001"
    );
  });

  it("preserves multiple clips", () => {
    const composition = createComposition([
      {
        id: "clip_001",
        fromFrame: 0,
        durationInFrames: 30,
        mediaType: "video"
      },
      {
        id: "clip_002",
        fromFrame: 30,
        durationInFrames: 60,
        mediaType: "image"
      }
    ]);

    expect(generateCompositionGraph(composition).nodes).toEqual([
      {
        id: "clip_001",
        type: "video",
        fromFrame: 0,
        durationInFrames: 30,
        assetId: undefined,
        sceneId: undefined
      },
      {
        id: "clip_002",
        type: "image",
        fromFrame: 30,
        durationInFrames: 60,
        assetId: undefined,
        sceneId: undefined
      }
    ]);
  });

  it("creates deterministic output", () => {
    const composition = createComposition([
      {
        id: "clip_001",
        fromFrame: 0,
        durationInFrames: 30,
        mediaType: "video"
      }
    ]);

    expect(generateCompositionGraph(composition)).toEqual(
      generateCompositionGraph(composition)
    );
  });

  it("does not mutate input", () => {
    const composition = createComposition([
      {
        id: "clip_001",
        assetId: "asset_001",
        sceneId: "scene_001",
        fromFrame: 0,
        durationInFrames: 30,
        mediaType: "video"
      }
    ]);
    const originalComposition = structuredClone(composition);
    const originalClips = composition.clips;

    generateCompositionGraph(composition);

    expect(composition).toEqual(originalComposition);
    expect(composition.clips).toBe(originalClips);
  });
});
