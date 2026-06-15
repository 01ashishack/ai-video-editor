import { describe, expect, it } from "vitest";
import type { RendererComposition, RendererItem } from "../renderer-types.js";
import type { AssetResolver } from "./asset-resolver.js";
import { resolveRendererComposition } from "./asset-resolver.js";

function createComposition(items: RendererItem[] = []): RendererComposition {
  return {
    compositionId: "project_001_composition",
    durationInFrames: 120,
    fps: 30,
    width: 1920,
    height: 1080,
    items
  };
}

function createItem(
  id: string,
  componentType: RendererItem["componentType"],
  assetId?: string
): RendererItem {
  return {
    id,
    componentType,
    fromFrame: id === "item_001" ? 0 : 30,
    durationInFrames: id === "item_001" ? 30 : 60,
    assetId,
    sceneId: `${id}_scene`
  };
}

function createResolver(sources: Record<string, string>): AssetResolver {
  return {
    resolve(assetId: string): string | undefined {
      return sources[assetId];
    }
  };
}

describe("resolveRendererComposition", () => {
  it("resolves empty composition", () => {
    const composition = createComposition();
    const resolver = createResolver({});

    expect(resolveRendererComposition(composition, resolver)).toEqual({
      compositionId: "project_001_composition",
      durationInFrames: 120,
      fps: 30,
      width: 1920,
      height: 1080,
      items: []
    });
  });

  it("resolves video asset", () => {
    const composition = createComposition([
      createItem("item_001", "Video", "asset_video_001")
    ]);
    const resolver = createResolver({
      asset_video_001: "video.mp4"
    });

    expect(resolveRendererComposition(composition, resolver).items[0]?.src).toBe(
      "video.mp4"
    );
  });

  it("resolves image asset", () => {
    const composition = createComposition([
      createItem("item_001", "Image", "asset_image_001")
    ]);
    const resolver = createResolver({
      asset_image_001: "image.png"
    });

    expect(resolveRendererComposition(composition, resolver).items[0]?.src).toBe(
      "image.png"
    );
  });

  it("resolves audio asset", () => {
    const composition = createComposition([
      createItem("item_001", "Audio", "asset_audio_001")
    ]);
    const resolver = createResolver({
      asset_audio_001: "voiceover.wav"
    });

    expect(resolveRendererComposition(composition, resolver).items[0]?.src).toBe(
      "voiceover.wav"
    );
  });

  it("leaves missing asset src undefined", () => {
    const composition = createComposition([
      createItem("item_001", "Video", "asset_missing")
    ]);
    const resolver = createResolver({});

    expect(
      resolveRendererComposition(composition, resolver).items[0]?.src
    ).toBeUndefined();
  });

  it("preserves ordering", () => {
    const composition = createComposition([
      createItem("item_001", "Video", "asset_video_001"),
      createItem("item_002", "Image", "asset_image_001")
    ]);
    const resolver = createResolver({
      asset_video_001: "video.mp4",
      asset_image_001: "image.png"
    });

    expect(
      resolveRendererComposition(composition, resolver).items.map(
        (item) => item.id
      )
    ).toEqual(["item_001", "item_002"]);
  });

  it("preserves timing", () => {
    const composition = createComposition([
      createItem("item_001", "Video", "asset_video_001"),
      createItem("item_002", "Image", "asset_image_001")
    ]);
    const resolver = createResolver({
      asset_video_001: "video.mp4",
      asset_image_001: "image.png"
    });

    expect(
      resolveRendererComposition(composition, resolver).items.map((item) => ({
        fromFrame: item.fromFrame,
        durationInFrames: item.durationInFrames
      }))
    ).toEqual([
      {
        fromFrame: 0,
        durationInFrames: 30
      },
      {
        fromFrame: 30,
        durationInFrames: 60
      }
    ]);
  });

  it("creates deterministic output", () => {
    const composition = createComposition([
      createItem("item_001", "Video", "asset_video_001")
    ]);
    const resolver = createResolver({
      asset_video_001: "video.mp4"
    });

    expect(resolveRendererComposition(composition, resolver)).toEqual(
      resolveRendererComposition(composition, resolver)
    );
  });

  it("does not mutate input", () => {
    const composition = createComposition([
      createItem("item_001", "Video", "asset_video_001")
    ]);
    const originalComposition = structuredClone(composition);
    const originalItems = composition.items;
    const resolver = createResolver({
      asset_video_001: "video.mp4"
    });

    resolveRendererComposition(composition, resolver);

    expect(composition).toEqual(originalComposition);
    expect(composition.items).toBe(originalItems);
  });
});
