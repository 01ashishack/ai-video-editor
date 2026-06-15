import { describe, expect, it } from "vitest";
import type { GeneratedComposition } from "./composition-generator.js";
import { buildRenderPlan } from "./render-plan.js";

function createComposition(
  nodes: GeneratedComposition["nodes"] = []
): GeneratedComposition {
  return {
    compositionId: "project_001_composition",
    durationInFrames: 120,
    fps: 30,
    width: 1920,
    height: 1080,
    nodes
  };
}

describe("buildRenderPlan", () => {
  it("builds empty composition", () => {
    const composition = createComposition();

    expect(buildRenderPlan(composition)).toEqual({
      compositionId: "project_001_composition",
      durationInFrames: 120,
      fps: 30,
      width: 1920,
      height: 1080,
      items: []
    });
  });

  it("maps video node", () => {
    const composition = createComposition([
      {
        id: "node_001",
        type: "video",
        fromFrame: 0,
        durationInFrames: 30
      }
    ]);

    expect(buildRenderPlan(composition).items[0]?.componentType).toBe("Video");
  });

  it("maps image node", () => {
    const composition = createComposition([
      {
        id: "node_001",
        type: "image",
        fromFrame: 0,
        durationInFrames: 30
      }
    ]);

    expect(buildRenderPlan(composition).items[0]?.componentType).toBe("Image");
  });

  it("maps audio node", () => {
    const composition = createComposition([
      {
        id: "node_001",
        type: "audio",
        fromFrame: 0,
        durationInFrames: 30
      }
    ]);

    expect(buildRenderPlan(composition).items[0]?.componentType).toBe("Audio");
  });

  it("maps placeholder node", () => {
    const composition = createComposition([
      {
        id: "node_001",
        type: "placeholder",
        fromFrame: 0,
        durationInFrames: 30
      }
    ]);

    expect(buildRenderPlan(composition).items[0]?.componentType).toBe(
      "Placeholder"
    );
  });

  it("preserves assetId", () => {
    const composition = createComposition([
      {
        id: "node_001",
        type: "video",
        fromFrame: 0,
        durationInFrames: 30,
        assetId: "asset_001"
      }
    ]);

    expect(buildRenderPlan(composition).items[0]?.assetId).toBe("asset_001");
  });

  it("preserves sceneId", () => {
    const composition = createComposition([
      {
        id: "node_001",
        type: "video",
        fromFrame: 0,
        durationInFrames: 30,
        sceneId: "scene_001"
      }
    ]);

    expect(buildRenderPlan(composition).items[0]?.sceneId).toBe("scene_001");
  });

  it("preserves multiple nodes", () => {
    const composition = createComposition([
      {
        id: "node_001",
        type: "video",
        fromFrame: 0,
        durationInFrames: 30
      },
      {
        id: "node_002",
        type: "image",
        fromFrame: 30,
        durationInFrames: 60
      }
    ]);

    expect(buildRenderPlan(composition).items).toEqual([
      {
        id: "node_001",
        componentType: "Video",
        fromFrame: 0,
        durationInFrames: 30,
        assetId: undefined,
        sceneId: undefined
      },
      {
        id: "node_002",
        componentType: "Image",
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
        id: "node_001",
        type: "video",
        fromFrame: 0,
        durationInFrames: 30
      }
    ]);

    expect(buildRenderPlan(composition)).toEqual(buildRenderPlan(composition));
  });

  it("does not mutate input", () => {
    const composition = createComposition([
      {
        id: "node_001",
        type: "video",
        fromFrame: 0,
        durationInFrames: 30,
        assetId: "asset_001",
        sceneId: "scene_001"
      }
    ]);
    const originalComposition = structuredClone(composition);
    const originalNodes = composition.nodes;

    buildRenderPlan(composition);

    expect(composition).toEqual(originalComposition);
    expect(composition.nodes).toBe(originalNodes);
  });
});
