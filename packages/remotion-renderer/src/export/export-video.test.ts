import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RendererComposition } from "../renderer-types.js";
import { exportVideo } from "./export-video.js";

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
  Audio: () => null,
  Composition: () => null,
  getInputProps: () => ({}),
  Img: () => null,
  OffthreadVideo: () => null,
  Sequence: ({ children }: { children: unknown }) => children
}));

function createComposition(): RendererComposition {
  return {
    compositionId: "project_001_composition",
    durationInFrames: 120,
    fps: 30,
    width: 1920,
    height: 1080,
    items: [
      {
        id: "item_001",
        componentType: "Video",
        fromFrame: 0,
        durationInFrames: 30
      }
    ]
  };
}

describe("exportVideo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls render pipeline", async () => {
    const composition = createComposition();

    await exportVideo({
      composition,
      outputPath: "output.mp4"
    });

    expect(bundle).toHaveBeenCalledTimes(1);
    expect(selectComposition).toHaveBeenCalledTimes(1);
    expect(renderMedia).toHaveBeenCalledTimes(1);
  });

  it("calls selectComposition with composition id", async () => {
    const composition = createComposition();

    await exportVideo({
      composition,
      outputPath: "output.mp4"
    });

    expect(vi.mocked(selectComposition).mock.calls.at(-1)?.[0]).toMatchObject({
      id: "project-001-composition"
    });
  });

  it("passes discovered composition into renderMedia", async () => {
    const composition = createComposition();
    const discoveredComposition = {
      id: "project_001_composition",
      durationInFrames: 120,
      fps: 30,
      width: 1920,
      height: 1080
    } as Awaited<ReturnType<typeof selectComposition>>;
    vi.mocked(selectComposition).mockResolvedValueOnce(discoveredComposition);

    await exportVideo({
      composition,
      outputPath: "output.mp4"
    });

    expect(vi.mocked(renderMedia).mock.calls.at(-1)?.[0]).toMatchObject({
      composition: discoveredComposition
    });
  });

  it("passes output path", async () => {
    const composition = createComposition();

    await exportVideo({
      composition,
      outputPath: "final-output.mp4"
    });

    expect(vi.mocked(renderMedia).mock.calls.at(-1)?.[0]).toMatchObject({
      outputLocation: "final-output.mp4"
    });
  });

  it("returns ExportVideoResult", async () => {
    const composition = createComposition();

    await expect(
      exportVideo({
        composition,
        outputPath: "output.mp4"
      })
    ).resolves.toEqual({
      outputPath: "output.mp4"
    });
  });

  it("creates deterministic invocation behavior", async () => {
    const composition = createComposition();
    const options = {
      composition,
      outputPath: "output.mp4"
    };

    await exportVideo(options);
    const firstCall = vi.mocked(renderMedia).mock.calls.at(-1)?.[0];
    await exportVideo(options);
    const secondCall = vi.mocked(renderMedia).mock.calls.at(-1)?.[0];

    expect(secondCall).toEqual(firstCall);
  });

  it("does not mutate inputs", async () => {
    const composition = createComposition();
    const originalComposition = structuredClone(composition);
    const originalItems = composition.items;

    await exportVideo({
      composition,
      outputPath: "output.mp4"
    });

    expect(composition).toEqual(originalComposition);
    expect(composition.items).toBe(originalItems);
  });
});
