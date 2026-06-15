import {
  createProject,
  type Asset,
  type Project,
  type Scene,
  type Track
} from "@aide/core";
import { describe, expect, it } from "vitest";
import { buildPreviewComposition } from "./preview-builder.js";

function createPreviewProject(): Project {
  const createdAt = "2026-01-01T00:00:00.000Z";
  const project = createProject({
    projectId: "preview_project",
    name: "Preview Project",
    createdAt
  });
  const scene: Scene = {
    id: "scene_001",
    order: 1,
    source: "manual",
    title: "Preview scene",
    text: "Preview scene",
    keywords: ["preview"],
    narrativeRange: {
      start: 0,
      duration: 2000
    },
    sourceRefs: [],
    status: "assigned",
    constraints: {}
  };
  const asset: Asset = {
    id: "asset_image_001",
    kind: "image",
    uri: "file:///C:/media/preview.png",
    displayName: "preview.png",
    importedAt: createdAt,
    media: {
      width: 1920,
      height: 1080,
      container: "png"
    },
    tags: ["preview"],
    status: "online"
  };
  const track: Track = {
    id: "track_video_001",
    kind: "video",
    role: "primary-video",
    name: "Primary Video",
    order: 1,
    clips: [
      {
        id: "clip_001",
        trackId: "track_video_001",
        sceneId: scene.id,
        mediaType: "image",
        role: "primary-visual",
        timelineRange: {
          start: 1000,
          duration: 2000
        },
        source: {
          assetId: asset.id
        },
        enabled: true,
        locked: false,
        links: [],
        render: {}
      }
    ]
  };

  return {
    ...project,
    assets: [asset],
    scenes: [scene],
    timeline: {
      ...project.timeline,
      tracks: [track]
    }
  };
}

describe("buildPreviewComposition", () => {
  it("builds a renderer composition from a project", () => {
    const project = createPreviewProject();

    const composition = buildPreviewComposition(project, {
      resolver: {
        resolve: () => "file:///C:/media/preview.png"
      }
    });

    expect(composition).toMatchObject({
      compositionId: "preview_project_composition",
      durationInFrames: 90,
      fps: 30,
      width: 1920,
      height: 1080
    });
    expect(composition.items).toHaveLength(1);
  });

  it("preserves composition metadata options", () => {
    const project = createPreviewProject();

    const composition = buildPreviewComposition(project, {
      resolver: {
        resolve: () => "file:///C:/media/preview.png"
      },
      fps: 24,
      width: 1280,
      height: 720
    });

    expect(composition).toMatchObject({
      compositionId: "preview_project_composition",
      durationInFrames: 72,
      fps: 24,
      width: 1280,
      height: 720
    });
  });

  it("flows resolved assets into preview composition", () => {
    const project = createPreviewProject();

    const composition = buildPreviewComposition(project, {
      resolver: {
        resolve: (assetId: string) =>
          assetId === "asset_image_001"
            ? "file:///C:/media/preview.png"
            : undefined
      }
    });

    expect(composition.items[0]).toMatchObject({
      id: "clip_001",
      componentType: "Image",
      assetId: "asset_image_001",
      sceneId: "scene_001",
      fromFrame: 30,
      durationInFrames: 60,
      src: "file:///C:/media/preview.png"
    });
  });

  it("keeps the preview layer read-only", () => {
    const project = createPreviewProject();
    const originalProject = structuredClone(project);

    buildPreviewComposition(project, {
      resolver: {
        resolve: () => "file:///C:/media/preview.png"
      }
    });

    expect(project).toEqual(originalProject);
  });

  it("creates deterministic output", () => {
    const project = createPreviewProject();
    const options = {
      resolver: {
        resolve: () => "file:///C:/media/preview.png"
      }
    };

    expect(buildPreviewComposition(project, options)).toEqual(
      buildPreviewComposition(project, options)
    );
  });
});
