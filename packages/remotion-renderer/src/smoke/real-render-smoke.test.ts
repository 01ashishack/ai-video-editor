import { exportVideo } from "../export/index.js";
import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ResolvedRendererComposition } from "../assets/index.js";
import { runRealRenderSmokeTest } from "./real-render-smoke.js";

vi.mock("@remotion/bundler", () => ({
  bundle: vi.fn(async () => "mock-serve-url")
}));

vi.mock("@remotion/renderer", () => ({
  renderMedia: vi.fn(async () => undefined),
  selectComposition: vi.fn(async () => ({
    id: "smoke_project_composition",
    durationInFrames: 60,
    fps: 30,
    width: 320,
    height: 180
  }))
}));

vi.mock("../export/index.js", () => ({
  exportVideo: vi.fn()
}));

async function createWorkingDirectory(): Promise<string> {
  return mkdtemp(join(tmpdir(), "aide-real-render-smoke-test-"));
}

describe("runRealRenderSmokeTest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(exportVideo).mockImplementation(async ({ outputPath }) => {
      await writeFile(outputPath, "fake smoke mp4");

      return {
        outputPath
      };
    });
  });

  it("serves smoke assets through Remotion public paths", async () => {
    const workingDirectory = await createWorkingDirectory();
    const outputPath = join(workingDirectory, "smoke-output.mp4");

    await runRealRenderSmokeTest({
      workingDirectory,
      outputPath
    });

    const exportCall = vi.mocked(exportVideo).mock.calls.at(-1)?.[0];
    const composition =
      exportCall?.composition as ResolvedRendererComposition | undefined;

    expect(composition?.items).toEqual([
      expect.objectContaining({
        id: "clip_smoke_image",
        src: "/public/smoke-image.png"
      }),
      expect.objectContaining({
        id: "clip_smoke_audio",
        src: "/public/smoke-audio.wav"
      })
    ]);
  });

  it("writes smoke assets into the rendered output public directory", async () => {
    const workingDirectory = await createWorkingDirectory();
    const outputDirectory = join(workingDirectory, "served-public");
    const outputPath = join(outputDirectory, "smoke-output.mp4");

    await runRealRenderSmokeTest({
      workingDirectory,
      outputPath
    });

    await expect(stat(join(outputDirectory, "smoke-image.png"))).resolves.toMatchObject({
      size: expect.any(Number)
    });
    await expect(stat(join(outputDirectory, "smoke-audio.wav"))).resolves.toMatchObject({
      size: expect.any(Number)
    });
  });

  it("reports non-empty smoke output", async () => {
    const workingDirectory = await createWorkingDirectory();
    const outputPath = join(workingDirectory, "smoke-output.mp4");

    const result = await runRealRenderSmokeTest({
      workingDirectory,
      outputPath
    });
    const output = await readFile(outputPath, "utf8");

    expect(result.outputPath).toBe(outputPath);
    expect(result.outputFileSize).toBeGreaterThan(0);
    expect(output).toBe("fake smoke mp4");
  });
});
