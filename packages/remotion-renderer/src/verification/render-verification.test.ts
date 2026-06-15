import { exportVideo } from "../export/index.js";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runRenderVerification } from "./render-verification.js";

vi.mock("@remotion/bundler", () => ({
  bundle: vi.fn(async () => "mock-serve-url")
}));

vi.mock("@remotion/renderer", () => ({
  renderMedia: vi.fn(async () => undefined),
  selectComposition: vi.fn(async () => ({
    id: "render_verification_project_composition",
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
  return mkdtemp(join(tmpdir(), "aide-render-verification-test-"));
}

async function readReport(reportPath: string) {
  return JSON.parse(await readFile(reportPath, "utf8")) as {
    projectId: string;
    compositionId: string;
    clipCount: number;
    assetCount: number;
    outputPath: string;
    outputFileExists: boolean;
    outputFileSize: number;
    executionDurationMs: number;
    success: boolean;
    failure?: string;
  };
}

describe("runRenderVerification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(exportVideo).mockImplementation(async ({ outputPath }) => {
      await writeFile(outputPath, "fake mp4");

      return {
        outputPath
      };
    });
  });

  it("creates verification-report.json on success", async () => {
    const workingDirectory = await createWorkingDirectory();
    const reportPath = join(workingDirectory, "verification-report.json");
    const outputPath = join(workingDirectory, "verification-output.mp4");

    const report = await runRenderVerification({
      workingDirectory,
      outputPath,
      reportPath
    });
    const persistedReport = await readReport(reportPath);

    expect(report).toMatchObject({
      projectId: "render_verification_project",
      compositionId: "render_verification_project_composition",
      clipCount: 2,
      assetCount: 2,
      outputPath,
      outputFileExists: true,
      success: true
    });
    expect(report.outputFileSize).toBeGreaterThan(0);
    expect(report.executionDurationMs).toBeGreaterThanOrEqual(0);
    expect(persistedReport).toEqual(report);
  });

  it("passes resolved renderer composition to exportVideo", async () => {
    const workingDirectory = await createWorkingDirectory();
    const outputPath = join(workingDirectory, "verification-output.mp4");

    await runRenderVerification({
      workingDirectory,
      outputPath
    });

    const exportCall = vi.mocked(exportVideo).mock.calls.at(-1)?.[0];

    expect(exportCall).toMatchObject({
      outputPath,
      composition: {
        compositionId: "render_verification_project_composition",
        durationInFrames: 60,
        fps: 30,
        width: 320,
        height: 180
      }
    });
    expect(exportCall?.composition.items).toEqual([
      expect.objectContaining({
        id: "clip_verification_image",
        componentType: "Image",
        assetId: "asset_verification_image",
        sceneId: "scene_verification_001",
        src: expect.stringContaining("verification-image.png")
      }),
      expect.objectContaining({
        id: "clip_verification_audio",
        componentType: "Audio",
        assetId: "asset_verification_audio",
        sceneId: "scene_verification_001",
        src: expect.stringContaining("verification-audio.wav")
      })
    ]);
  });

  it("fails loudly when an asset is missing", async () => {
    const workingDirectory = await createWorkingDirectory();
    const reportPath = join(workingDirectory, "verification-report.json");

    await expect(
      runRenderVerification({
        workingDirectory,
        reportPath,
        createAssets: false
      })
    ).rejects.toThrow("Asset missing:");

    const report = await readReport(reportPath);
    expect(report).toMatchObject({
      success: false,
      outputFileExists: false,
      outputFileSize: 0
    });
    expect(report.failure).toContain("Asset missing:");
  });

  it("fails loudly when export fails", async () => {
    const workingDirectory = await createWorkingDirectory();
    const reportPath = join(workingDirectory, "verification-report.json");
    vi.mocked(exportVideo).mockRejectedValueOnce(new Error("export failed"));

    await expect(
      runRenderVerification({
        workingDirectory,
        reportPath
      })
    ).rejects.toThrow("export failed");

    const report = await readReport(reportPath);
    expect(report).toMatchObject({
      success: false,
      outputFileExists: false,
      outputFileSize: 0,
      failure: "export failed"
    });
  });

  it("fails loudly when output file is missing", async () => {
    const workingDirectory = await createWorkingDirectory();
    const reportPath = join(workingDirectory, "verification-report.json");
    const outputPath = join(workingDirectory, "verification-output.mp4");
    vi.mocked(exportVideo).mockResolvedValueOnce({
      outputPath
    });

    await expect(
      runRenderVerification({
        workingDirectory,
        outputPath,
        reportPath
      })
    ).rejects.toThrow(`Output file missing: ${outputPath}`);

    const report = await readReport(reportPath);
    expect(report).toMatchObject({
      success: false,
      outputFileExists: false,
      outputFileSize: 0,
      failure: `Output file missing: ${outputPath}`
    });
  });

  it("fails loudly when output file is empty", async () => {
    const workingDirectory = await createWorkingDirectory();
    const reportPath = join(workingDirectory, "verification-report.json");
    const outputPath = join(workingDirectory, "verification-output.mp4");
    vi.mocked(exportVideo).mockImplementationOnce(async () => {
      await writeFile(outputPath, "");

      return {
        outputPath
      };
    });

    await expect(
      runRenderVerification({
        workingDirectory,
        outputPath,
        reportPath
      })
    ).rejects.toThrow(`Output file is empty: ${outputPath}`);

    const report = await readReport(reportPath);
    expect(report).toMatchObject({
      success: false,
      outputFileExists: true,
      outputFileSize: 0,
      failure: `Output file is empty: ${outputPath}`
    });
  });
});
