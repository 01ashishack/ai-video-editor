import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode
} from "react";
import { Audio, Img, OffthreadVideo } from "remotion";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  resolveRendererComposition,
  type AssetResolver,
  type ResolvedRendererComposition
} from "../assets/index.js";
import { DocumentaryComposition } from "../composition/DocumentaryComposition.js";
import { RenderItem } from "../composition/RenderItem.js";
import { exportVideo } from "../export/index.js";
import type { RendererComposition, RendererItem } from "../renderer-types.js";

vi.mock("@remotion/bundler", () => ({
  bundle: vi.fn(async () => "mock-serve-url")
}));

vi.mock("@remotion/renderer", () => ({
  renderMedia: vi.fn(async () => undefined),
  selectComposition: vi.fn(async () => ({
    id: "project_001_composition",
    durationInFrames: 120,
    fps: 30,
    width: 1920,
    height: 1080
  }))
}));

vi.mock("remotion", () => ({
  Audio: ({ src }: { src: string }) => null,
  Composition: () => null,
  getInputProps: () => ({}),
  Img: ({ src }: { src: string }) => null,
  OffthreadVideo: ({ src }: { src: string }) => null,
  Sequence: ({ children }: { children: ReactNode }) => children
}));

interface SequenceProps {
  from: number;
  durationInFrames: number;
  children: ReactElement<{
    item: RendererItem & {
      src?: string;
    };
  }>;
}

function createAssetBackedComposition(): RendererComposition {
  return {
    compositionId: "project_001_composition",
    durationInFrames: 120,
    fps: 30,
    width: 1920,
    height: 1080,
    items: [
      {
        id: "video_clip_001",
        componentType: "Video",
        fromFrame: 0,
        durationInFrames: 30,
        assetId: "asset_video_001",
        sceneId: "scene_001"
      },
      {
        id: "image_clip_001",
        componentType: "Image",
        fromFrame: 30,
        durationInFrames: 45,
        assetId: "asset_image_001",
        sceneId: "scene_002"
      },
      {
        id: "audio_clip_001",
        componentType: "Audio",
        fromFrame: 75,
        durationInFrames: 45,
        assetId: "asset_audio_001",
        sceneId: "scene_003"
      }
    ]
  };
}

function createResolver(): AssetResolver {
  const sources = new Map<string, string>([
    ["asset_video_001", "C:/media/interview.mp4"],
    ["asset_image_001", "C:/media/location.png"],
    ["asset_audio_001", "C:/media/voiceover.wav"]
  ]);

  return {
    resolve: (assetId: string) => sources.get(assetId)
  };
}

function getSequenceElements(
  composition: ResolvedRendererComposition
): ReactElement<SequenceProps>[] {
  const element = DocumentaryComposition({
    composition
  }) as ReactElement<{
    children?: ReactNode;
  }>;

  return Children.toArray(element.props.children).filter(
    isValidElement
  ) as ReactElement<SequenceProps>[];
}

function getRenderItemElement(
  item: ResolvedRendererComposition["items"][number]
) {
  return RenderItem({
    item
  }) as ReactElement<{
    src?: string;
  }> | null;
}

describe("asset-backed MP4 export pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes resolved video src to OffthreadVideo", () => {
    const composition = createAssetBackedComposition();
    const resolved = resolveRendererComposition(composition, createResolver());
    const videoItem = resolved.items[0];

    const element = getRenderItemElement(videoItem);

    expect(videoItem).toMatchObject({
      assetId: "asset_video_001",
      sceneId: "scene_001",
      src: "C:/media/interview.mp4"
    });
    expect(element?.type).toBe(OffthreadVideo);
    expect(element?.props.src).toBe("C:/media/interview.mp4");
  });

  it("passes resolved image src to Img", () => {
    const composition = createAssetBackedComposition();
    const resolved = resolveRendererComposition(composition, createResolver());
    const imageItem = resolved.items[1];

    const element = getRenderItemElement(imageItem);

    expect(imageItem).toMatchObject({
      assetId: "asset_image_001",
      sceneId: "scene_002",
      src: "C:/media/location.png"
    });
    expect(element?.type).toBe(Img);
    expect(element?.props.src).toBe("C:/media/location.png");
  });

  it("passes resolved audio src to Audio", () => {
    const composition = createAssetBackedComposition();
    const resolved = resolveRendererComposition(composition, createResolver());
    const audioItem = resolved.items[2];

    const element = getRenderItemElement(audioItem);

    expect(audioItem).toMatchObject({
      assetId: "asset_audio_001",
      sceneId: "scene_003",
      src: "C:/media/voiceover.wav"
    });
    expect(element?.type).toBe(Audio);
    expect(element?.props.src).toBe("C:/media/voiceover.wav");
  });

  it("passes resolved src and asset metadata into the Remotion composition", () => {
    const composition = createAssetBackedComposition();
    const resolved = resolveRendererComposition(composition, createResolver());

    const items = getSequenceElements(resolved).map(
      (sequence) => sequence.props.children.props.item
    );

    expect(items).toEqual(resolved.items);
    expect(
      items.map((item) => ({
        id: item.id,
        assetId: item.assetId,
        sceneId: item.sceneId,
        src: item.src
      }))
    ).toEqual([
      {
        id: "video_clip_001",
        assetId: "asset_video_001",
        sceneId: "scene_001",
        src: "C:/media/interview.mp4"
      },
      {
        id: "image_clip_001",
        assetId: "asset_image_001",
        sceneId: "scene_002",
        src: "C:/media/location.png"
      },
      {
        id: "audio_clip_001",
        assetId: "asset_audio_001",
        sceneId: "scene_003",
        src: "C:/media/voiceover.wav"
      }
    ]);
  });

  it("passes the resolved composition through exportVideo", async () => {
    const composition = createAssetBackedComposition();
    const resolved = resolveRendererComposition(composition, createResolver());

    await exportVideo({
      composition: resolved,
      outputPath: "output.mp4"
    });

    expect(vi.mocked(selectComposition).mock.calls.at(-1)?.[0]).toMatchObject({
      id: "project-001-composition",
      inputProps: {
        composition: resolved
      }
    });
    expect(vi.mocked(renderMedia).mock.calls.at(-1)?.[0]).toMatchObject({
      outputLocation: "output.mp4",
      inputProps: {
        composition: resolved
      }
    });
  });

  it("preserves asset metadata across resolver, composition, and export", async () => {
    const composition = createAssetBackedComposition();
    const originalComposition = structuredClone(composition);
    const resolved = resolveRendererComposition(composition, createResolver());

    getSequenceElements(resolved);
    await exportVideo({
      composition: resolved,
      outputPath: "output.mp4"
    });

    const renderCall = vi.mocked(renderMedia).mock.calls.at(-1)?.[0] as
      | {
          inputProps: {
            composition: ResolvedRendererComposition;
          };
        }
      | undefined;
    const exportedComposition = renderCall?.inputProps.composition;

    expect(exportedComposition?.items).toEqual(resolved.items);
    expect(
      exportedComposition?.items.map((item) => ({
        assetId: item.assetId,
        sceneId: item.sceneId,
        src: item.src
      }))
    ).toEqual([
      {
        assetId: "asset_video_001",
        sceneId: "scene_001",
        src: "C:/media/interview.mp4"
      },
      {
        assetId: "asset_image_001",
        sceneId: "scene_002",
        src: "C:/media/location.png"
      },
      {
        assetId: "asset_audio_001",
        sceneId: "scene_003",
        src: "C:/media/voiceover.wav"
      }
    ]);
    expect(composition).toEqual(originalComposition);
  });
});
