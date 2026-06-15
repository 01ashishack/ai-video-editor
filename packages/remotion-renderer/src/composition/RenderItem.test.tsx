import type { ReactElement } from "react";
import { Audio, Img, OffthreadVideo } from "remotion";
import { describe, expect, it, vi } from "vitest";
import type { RendererItem } from "../renderer-types.js";
import { RenderItem } from "./RenderItem.js";

vi.mock("remotion", () => ({
  Audio: ({ src }: { src: string }) => null,
  Img: ({ src }: { src: string }) => null,
  OffthreadVideo: ({ src }: { src: string }) => null
}));

type RenderableItem = RendererItem & {
  src?: string;
};

function createItem(
  componentType: RendererItem["componentType"],
  src?: string
): RenderableItem {
  return {
    id: "item_001",
    componentType,
    fromFrame: 0,
    durationInFrames: 30,
    assetId: "asset_001",
    sceneId: "scene_001",
    src
  };
}

function summarizeElement(item: RenderableItem) {
  const element = RenderItem({
    item
  }) as ReactElement<{
    src?: string;
  }> | null;

  return element
    ? {
        type: element.type,
        src: element.props.src
      }
    : null;
}

describe("RenderItem", () => {
  it("renders video using OffthreadVideo", () => {
    const element = RenderItem({
      item: createItem("Video", "video.mp4")
    }) as ReactElement<{
      src: string;
    }>;

    expect(element.type).toBe(OffthreadVideo);
    expect(element.props).toMatchObject({
      src: "video.mp4"
    });
  });

  it("renders image using Img", () => {
    const element = RenderItem({
      item: createItem("Image", "image.png")
    }) as ReactElement<{
      src: string;
    }>;

    expect(element.type).toBe(Img);
    expect(element.props).toMatchObject({
      src: "image.png"
    });
  });

  it("renders audio using Audio", () => {
    const element = RenderItem({
      item: createItem("Audio", "voiceover.wav")
    }) as ReactElement<{
      src: string;
    }>;

    expect(element.type).toBe(Audio);
    expect(element.props).toMatchObject({
      src: "voiceover.wav"
    });
  });

  it("renders placeholder as null", () => {
    expect(
      RenderItem({
        item: createItem("Placeholder")
      })
    ).toBeNull();
  });

  it("returns null when src is missing", () => {
    expect(
      RenderItem({
        item: createItem("Video")
      })
    ).toBeNull();
  });

  it("creates deterministic output", () => {
    const item = createItem("Video", "video.mp4");

    expect(summarizeElement(item)).toEqual(summarizeElement(item));
  });

  it("does not mutate input", () => {
    const item = createItem("Video", "video.mp4");
    const originalItem = structuredClone(item);

    RenderItem({
      item
    });

    expect(item).toEqual(originalItem);
  });
});
