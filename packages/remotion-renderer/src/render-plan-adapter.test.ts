import { describe, expect, it } from "vitest";
import type { RenderPlan } from "@aide/core";
import { createRendererComposition } from "./render-plan-adapter.js";

function createRenderPlan(items: RenderPlan["items"] = []): RenderPlan {
  return {
    compositionId: "project_001_composition",
    durationInFrames: 120,
    fps: 30,
    width: 1920,
    height: 1080,
    items
  };
}

describe("createRendererComposition", () => {
  it("maps empty render plan", () => {
    const renderPlan = createRenderPlan();

    expect(createRendererComposition(renderPlan)).toEqual({
      compositionId: "project_001_composition",
      durationInFrames: 120,
      fps: 30,
      width: 1920,
      height: 1080,
      items: []
    });
  });

  it("maps single item", () => {
    const renderPlan = createRenderPlan([
      {
        id: "item_001",
        componentType: "Video",
        fromFrame: 0,
        durationInFrames: 30
      }
    ]);

    expect(createRendererComposition(renderPlan).items).toEqual([
      {
        id: "item_001",
        componentType: "Video",
        fromFrame: 0,
        durationInFrames: 30,
        assetId: undefined,
        sceneId: undefined
      }
    ]);
  });

  it("maps multiple items", () => {
    const renderPlan = createRenderPlan([
      {
        id: "item_001",
        componentType: "Video",
        fromFrame: 0,
        durationInFrames: 30
      },
      {
        id: "item_002",
        componentType: "Image",
        fromFrame: 30,
        durationInFrames: 60
      }
    ]);

    expect(
      createRendererComposition(renderPlan).items.map((item) => item.id)
    ).toEqual(["item_001", "item_002"]);
  });

  it("preserves assetId", () => {
    const renderPlan = createRenderPlan([
      {
        id: "item_001",
        componentType: "Video",
        fromFrame: 0,
        durationInFrames: 30,
        assetId: "asset_001"
      }
    ]);

    expect(createRendererComposition(renderPlan).items[0]?.assetId).toBe(
      "asset_001"
    );
  });

  it("preserves sceneId", () => {
    const renderPlan = createRenderPlan([
      {
        id: "item_001",
        componentType: "Video",
        fromFrame: 0,
        durationInFrames: 30,
        sceneId: "scene_001"
      }
    ]);

    expect(createRendererComposition(renderPlan).items[0]?.sceneId).toBe(
      "scene_001"
    );
  });

  it("creates deterministic output", () => {
    const renderPlan = createRenderPlan([
      {
        id: "item_001",
        componentType: "Video",
        fromFrame: 0,
        durationInFrames: 30
      }
    ]);

    expect(createRendererComposition(renderPlan)).toEqual(
      createRendererComposition(renderPlan)
    );
  });

  it("does not mutate input", () => {
    const renderPlan = createRenderPlan([
      {
        id: "item_001",
        componentType: "Video",
        fromFrame: 0,
        durationInFrames: 30,
        assetId: "asset_001",
        sceneId: "scene_001"
      }
    ]);
    const originalRenderPlan = structuredClone(renderPlan);
    const originalItems = renderPlan.items;

    createRendererComposition(renderPlan);

    expect(renderPlan).toEqual(originalRenderPlan);
    expect(renderPlan.items).toBe(originalItems);
  });
});
