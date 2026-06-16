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
import { mkdir, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveRendererComposition } from "../assets/index.js";
import { createRendererComposition } from "../render-plan-adapter.js";

export interface RealRenderSmokeOptions {
  workingDirectory?: string;
  outputPath?: string;
  createdAt?: string;
}

export interface RealRenderSmokeResult {
  outputPath: string;
  outputFileSize: number;
  compositionId: string;
  assetIds: string[];
}

const DEFAULT_CREATED_AT = "2026-01-01T00:00:00.000Z";

export async function runRealRenderSmokeTest(
  options: RealRenderSmokeOptions = {}
): Promise<RealRenderSmokeResult> {
  await assertRealRenderDependencies();

  const workingDirectory =
    options.workingDirectory ?? join(tmpdir(), "aide-remotion-smoke");
  await mkdir(workingDirectory, {
    recursive: true
  });

  const outputPath =
    options.outputPath ?? join(workingDirectory, "smoke-output.mp4");
  const publicDirectory = dirname(outputPath);
  const imagePath = join(publicDirectory, "smoke-image.png");
  const audioPath = join(publicDirectory, "smoke-audio.wav");

  await mkdir(publicDirectory, {
    recursive: true
  });

  await writeFile(imagePath, createSmokePng());
  await writeFile(audioPath, createSmokeWav());

  const project = createSmokeProject({
    createdAt: options.createdAt ?? DEFAULT_CREATED_AT,
    imageUri: toPublicAssetPath(imagePath),
    audioUri: toPublicAssetPath(audioPath)
  });

  const remotionComposition = buildRemotionComposition(project, {
    fps: 30,
    width: 320,
    height: 180
  });
  const generatedComposition = generateCompositionGraph(remotionComposition);
  const renderPlan = buildRenderPlan(generatedComposition);
  const rendererComposition = createRendererComposition(renderPlan);
  const assetSources = new Map<string, string>(
    project.assets.map((asset) => [asset.id, asset.uri])
  );
  const resolvedComposition = resolveRendererComposition(rendererComposition, {
    resolve: (assetId: string) => assetSources.get(assetId)
  });
  const { exportVideo } = await import("../export/index.js");

  await exportVideo({
    composition: resolvedComposition,
    outputPath
  });

  const outputStats = await stat(outputPath);
  if (outputStats.size <= 0) {
    throw new Error(`Smoke render output is empty: ${outputPath}`);
  }

  return {
    outputPath,
    outputFileSize: outputStats.size,
    compositionId: resolvedComposition.compositionId,
    assetIds: project.assets.map((asset) => asset.id)
  };
}

async function assertRealRenderDependencies(): Promise<void> {
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
        "Real render smoke test cannot run because required Remotion dependencies are missing.",
        `Missing: ${missingDependencies.join(", ")}`,
        "Run npm install from the workspace root before running the smoke test."
      ].join(" ")
    );
  }
}

function createSmokeProject(options: {
  createdAt: string;
  imageUri: string;
  audioUri: string;
}): Project {
  const project = createProject({
    projectId: "smoke_project",
    name: "Real Render Smoke Test",
    createdAt: options.createdAt
  });
  const scene: Scene = {
    id: "scene_smoke_001",
    order: 1,
    source: "manual",
    title: "Smoke render scene",
    text: "Smoke render scene",
    keywords: ["smoke"],
    narrativeRange: {
      start: 0,
      duration: 2000
    },
    sourceRefs: [],
    status: "assigned",
    constraints: {}
  };
  const imageAsset: Asset = {
    id: "asset_smoke_image",
    kind: "image",
    uri: options.imageUri,
    displayName: "smoke-image.png",
    importedAt: options.createdAt,
    media: {
      width: 320,
      height: 180,
      container: "png"
    },
    tags: ["smoke"],
    status: "online"
  };
  const audioAsset: Asset = {
    id: "asset_smoke_audio",
    kind: "audio",
    uri: options.audioUri,
    displayName: "smoke-audio.wav",
    importedAt: options.createdAt,
    media: {
      duration: 2000,
      sampleRate: 44100,
      channels: 1,
      container: "wav",
      codec: "pcm_s16le"
    },
    tags: ["smoke"],
    status: "online"
  };
  const tracks: Track[] = [
    {
      id: "track_smoke_video",
      kind: "video",
      role: "primary-video",
      name: "Smoke Video",
      order: 1,
      clips: [
        {
          id: "clip_smoke_image",
          trackId: "track_smoke_video",
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
      id: "track_smoke_audio",
      kind: "audio",
      role: "voiceover",
      name: "Smoke Audio",
      order: 2,
      clips: [
        {
          id: "clip_smoke_audio",
          trackId: "track_smoke_audio",
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

function toPublicAssetPath(path: string): string {
  return `/public/${basename(path).replaceAll("\\", "/")}`;
}

function createSmokePng(): Buffer {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lL0dJwAAAABJRU5ErkJggg==",
    "base64"
  );
}

function createSmokeWav(): Buffer {
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
  runRealRenderSmokeTest()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
