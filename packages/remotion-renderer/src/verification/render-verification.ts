import {
  buildRemotionComposition,
  buildRenderPlan,
  createProject,
  generateCompositionGraph,
  type Asset,
  type Project,
  type Scene,
  type Track
} from "@aide/core";
import { access, mkdir, stat, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveRendererComposition } from "../assets/index.js";
import { createRendererComposition } from "../render-plan-adapter.js";

export interface RenderVerificationOptions {
  workingDirectory?: string;
  outputPath?: string;
  reportPath?: string;
  createdAt?: string;
  createAssets?: boolean;
}

export interface RenderVerificationReport {
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
}

const DEFAULT_CREATED_AT = "2026-01-01T00:00:00.000Z";
const DEFAULT_WORKING_DIRECTORY = join(
  tmpdir(),
  "aide-render-verification"
);

export async function runRenderVerification(
  options: RenderVerificationOptions = {}
): Promise<RenderVerificationReport> {
  const startedAt = Date.now();
  const workingDirectory = options.workingDirectory ?? DEFAULT_WORKING_DIRECTORY;
  const outputPath =
    options.outputPath ?? join(workingDirectory, "verification-output.mp4");
  const reportPath =
    options.reportPath ?? join(workingDirectory, "verification-report.json");
  const createAssets = options.createAssets ?? true;
  let report = createInitialReport({
    outputPath,
    executionDurationMs: 0
  });

  await mkdir(workingDirectory, {
    recursive: true
  });

  try {
    const imagePath = join(workingDirectory, "verification-image.png");
    const audioPath = join(workingDirectory, "verification-audio.wav");

    if (createAssets) {
      await writeFile(imagePath, createVerificationPng());
      await writeFile(audioPath, createVerificationWav());
    }

    const project = createVerificationProject({
      createdAt: options.createdAt ?? DEFAULT_CREATED_AT,
      imageUri: toPublicAssetPath(imagePath),
      audioUri: toPublicAssetPath(audioPath)
    });
    const remotionComposition = buildRemotionComposition(project, {
      fps: 30,
      width: 320,
      height: 180
    });

    if (remotionComposition.clips.length === 0) {
      throw new Error("Composition missing: no clips were generated.");
    }

    const compositionGraph = generateCompositionGraph(remotionComposition);
    const renderPlan = buildRenderPlan(compositionGraph);
    const rendererComposition = createRendererComposition(renderPlan);
    const assetSources = new Map<string, string>(
      project.assets.map((asset) => [asset.id, asset.uri])
    );
    const resolvedComposition = resolveRendererComposition(
      rendererComposition,
      {
        resolve: (assetId: string) => assetSources.get(assetId)
      }
    );

    if (resolvedComposition.items.length === 0) {
      throw new Error("Composition missing: no renderer items were generated.");
    }

    report = {
      projectId: project.id,
      compositionId: resolvedComposition.compositionId,
      clipCount: resolvedComposition.items.length,
      assetCount: project.assets.length,
      outputPath,
      outputFileExists: false,
      outputFileSize: 0,
      executionDurationMs: Date.now() - startedAt,
      success: false
    };

    await assertFileExists(imagePath, `Asset missing: ${imagePath}`);
    await assertFileExists(audioPath, `Asset missing: ${audioPath}`);
    await assertRenderDependencies();

    const { exportVideo } = await import("../export/index.js");
    await exportVideo({
      composition: resolvedComposition,
      outputPath
    });

    const outputStats = await getOutputStats(outputPath);
    if (!outputStats.exists) {
      throw new Error(`Output file missing: ${outputPath}`);
    }

    if (outputStats.size <= 0) {
      throw new Error(`Output file is empty: ${outputPath}`);
    }

    report = {
      projectId: project.id,
      compositionId: resolvedComposition.compositionId,
      clipCount: resolvedComposition.items.length,
      assetCount: project.assets.length,
      outputPath,
      outputFileExists: outputStats.exists,
      outputFileSize: outputStats.size,
      executionDurationMs: Date.now() - startedAt,
      success: true
    };
    await writeVerificationReport(reportPath, report);

    return report;
  } catch (error: unknown) {
    const outputStats = await getOutputStats(outputPath);
    report = {
      ...report,
      outputFileExists: outputStats.exists,
      outputFileSize: outputStats.size,
      executionDurationMs: Date.now() - startedAt,
      success: false,
      failure: error instanceof Error ? error.message : String(error)
    };
    await writeVerificationReport(reportPath, report);
    throw error;
  }
}

function createInitialReport(options: {
  outputPath: string;
  executionDurationMs: number;
}): RenderVerificationReport {
  return {
    projectId: "",
    compositionId: "",
    clipCount: 0,
    assetCount: 0,
    outputPath: options.outputPath,
    outputFileExists: false,
    outputFileSize: 0,
    executionDurationMs: options.executionDurationMs,
    success: false
  };
}

async function assertRenderDependencies(): Promise<void> {
  const missingDependencies: string[] = [];

  for (const dependencyName of [
    "@remotion/bundler",
    "@remotion/renderer"
  ]) {
    try {
      await import(dependencyName);
    } catch {
      missingDependencies.push(dependencyName);
    }
  }

  if (missingDependencies.length > 0) {
    throw new Error(
      [
        "Render verification cannot run because required Remotion dependencies are missing.",
        `Missing: ${missingDependencies.join(", ")}`,
        "Run npm install from the workspace root before running verification."
      ].join(" ")
    );
  }
}

async function assertFileExists(path: string, message: string): Promise<void> {
  try {
    await access(path, constants.F_OK);
  } catch {
    throw new Error(message);
  }
}

async function getOutputStats(path: string): Promise<{
  exists: boolean;
  size: number;
}> {
  try {
    const outputStats = await stat(path);

    return {
      exists: true,
      size: outputStats.size
    };
  } catch {
    return {
      exists: false,
      size: 0
    };
  }
}

async function writeVerificationReport(
  reportPath: string,
  report: RenderVerificationReport
): Promise<void> {
  await mkdir(dirname(reportPath), {
    recursive: true
  });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function toPublicAssetPath(path: string): string {
  return `/public/${basename(path).replaceAll("\\", "/")}`;
}

function createVerificationProject(options: {
  createdAt: string;
  imageUri: string;
  audioUri: string;
}): Project {
  const project = createProject({
    projectId: "render_verification_project",
    name: "Render Verification Project",
    createdAt: options.createdAt
  });
  const scene: Scene = {
    id: "scene_verification_001",
    order: 1,
    source: "manual",
    title: "Render verification scene",
    text: "Render verification scene",
    keywords: ["verification"],
    narrativeRange: {
      start: 0,
      duration: 2000
    },
    sourceRefs: [],
    status: "assigned",
    constraints: {}
  };
  const imageAsset: Asset = {
    id: "asset_verification_image",
    kind: "image",
    uri: options.imageUri,
    displayName: "verification-image.png",
    importedAt: options.createdAt,
    media: {
      width: 320,
      height: 180,
      container: "png"
    },
    tags: ["verification"],
    status: "online"
  };
  const audioAsset: Asset = {
    id: "asset_verification_audio",
    kind: "audio",
    uri: options.audioUri,
    displayName: "verification-audio.wav",
    importedAt: options.createdAt,
    media: {
      duration: 2000,
      sampleRate: 44100,
      channels: 1,
      container: "wav",
      codec: "pcm_s16le"
    },
    tags: ["verification"],
    status: "online"
  };
  const tracks: Track[] = [
    {
      id: "track_verification_video",
      kind: "video",
      role: "primary-video",
      name: "Verification Video",
      order: 1,
      clips: [
        {
          id: "clip_verification_image",
          trackId: "track_verification_video",
          sceneId: scene.id,
          mediaType: "image",
          role: "primary-visual",
          timelineRange: {
            start: 0,
            duration: 2000
          },
          source: {
            assetId: imageAsset.id
          },
          enabled: true,
          locked: false,
          links: [],
          render: {
            fit: "cover"
          }
        }
      ]
    },
    {
      id: "track_verification_audio",
      kind: "audio",
      role: "voiceover",
      name: "Verification Audio",
      order: 2,
      clips: [
        {
          id: "clip_verification_audio",
          trackId: "track_verification_audio",
          sceneId: scene.id,
          mediaType: "audio",
          role: "voiceover",
          timelineRange: {
            start: 0,
            duration: 2000
          },
          source: {
            assetId: audioAsset.id
          },
          enabled: true,
          locked: false,
          links: [],
          render: {
            volume: 1
          }
        }
      ]
    }
  ];

  return {
    ...project,
    assets: [imageAsset, audioAsset],
    scenes: [scene],
    timeline: {
      ...project.timeline,
      tracks
    }
  };
}

function createVerificationPng(): Buffer {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lL0dJwAAAABJRU5ErkJggg==",
    "base64"
  );
}

function createVerificationWav(): Buffer {
  const sampleRate = 44100;
  const durationSeconds = 2;
  const channels = 1;
  const bitsPerSample = 16;
  const sampleCount = sampleRate * durationSeconds;
  const dataSize = sampleCount * channels * (bitsPerSample / 8);
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28);
  buffer.writeUInt16LE(channels * (bitsPerSample / 8), 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  runRenderVerification()
    .then((report) => {
      console.log(JSON.stringify(report, null, 2));
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
