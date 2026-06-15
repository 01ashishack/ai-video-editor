import type { ReactElement, ReactNode } from "react";
import { Player } from "@remotion/player";
import { describe, expect, it, vi } from "vitest";
import { DocumentaryComposition } from "../composition/index.js";
import type { ResolvedRendererComposition } from "../assets/index.js";
import type { RendererComposition } from "../renderer-types.js";
import { PreviewPlayer } from "./PreviewPlayer.js";

vi.mock("@remotion/player", () => ({
  Player: () => null
}));

vi.mock("remotion", () => ({
  Audio: () => null,
  Img: () => null,
  OffthreadVideo: () => null,
  Sequence: ({ children }: { children: ReactNode }) => children
}));

interface PlayerProps {
  component: typeof DocumentaryComposition;
  durationInFrames: number;
  fps: number;
  compositionWidth: number;
  compositionHeight: number;
  inputProps: {
    composition: RendererComposition;
  };
  controls: boolean;
  autoPlay: boolean;
  loop: boolean;
}

function createComposition(): RendererComposition {
  return {
    compositionId: "preview_project_composition",
    durationInFrames: 120,
    fps: 30,
    width: 1920,
    height: 1080,
    items: [
      {
        id: "clip_001",
        componentType: "Video",
        fromFrame: 0,
        durationInFrames: 120,
        assetId: "asset_video_001",
        sceneId: "scene_001"
      }
    ]
  };
}

function createResolvedComposition(): ResolvedRendererComposition {
  return {
    compositionId: "preview_project_composition",
    durationInFrames: 120,
    fps: 30,
    width: 1920,
    height: 1080,
    items: [
      {
        id: "clip_001",
        componentType: "Video",
        fromFrame: 0,
        durationInFrames: 120,
        assetId: "asset_video_001",
        sceneId: "scene_001",
        src: "file:///C:/media/interview.mp4"
      }
    ]
  };
}

function renderPreview(
  composition: RendererComposition
): ReactElement<PlayerProps> {
  return PreviewPlayer({
    composition
  }) as ReactElement<PlayerProps>;
}

describe("PreviewPlayer", () => {
  it("accepts a RendererComposition", () => {
    const composition = createComposition();

    const element = renderPreview(composition);

    expect(element.type).toBe(Player);
    expect(element.props.inputProps.composition).toBe(composition);
  });

  it("preserves composition metadata", () => {
    const composition = createComposition();

    const element = renderPreview(composition);

    expect(element.props).toMatchObject({
      durationInFrames: 120,
      fps: 30,
      compositionWidth: 1920,
      compositionHeight: 1080
    });
    expect(element.props.component).toBe(DocumentaryComposition);
  });

  it("flows resolved assets into preview", () => {
    const composition = createResolvedComposition();

    const element = renderPreview(composition);

    expect(element.props.inputProps.composition.items[0]).toMatchObject({
      assetId: "asset_video_001",
      sceneId: "scene_001",
      src: "file:///C:/media/interview.mp4"
    });
  });

  it("keeps preview read-only", () => {
    const composition = createResolvedComposition();
    const originalComposition = structuredClone(composition);

    renderPreview(composition);

    expect(composition).toEqual(originalComposition);
  });

  it("creates deterministic output", () => {
    const composition = createResolvedComposition();

    expect(renderPreview(composition).props).toEqual(
      renderPreview(composition).props
    );
  });
});
