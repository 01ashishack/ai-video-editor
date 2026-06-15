import { describe, expect, it } from "vitest";
import type { Asset, Project } from "../index.js";
import { buildProjectFromSrt } from "../project/index.js";
import type { SrtDocument } from "../srt/index.js";
import { buildTimelineFromScenes } from "../timeline/index.js";
import { assignAssetsToScenes } from "./asset-assignment.js";

const document: SrtDocument = {
  cues: [
    {
      index: 1,
      start: 0,
      end: 2500,
      rawText: "Factory workers arrive."
    }
  ]
};

function createProjectWithTimeline(assets: Asset[]): Project {
  const project = buildProjectFromSrt(document, {
    projectId: "project_001",
    name: "Test Project",
    createdAt: "2026-06-14T00:00:00.000Z",
    sourceId: "source_srt_001",
    sourceUri: "test.srt"
  });

  return buildTimelineFromScenes({
    ...project,
    assets
  });
}

function createAsset(
  id: string,
  tags: string[],
  kind: "video" | "audio" | "image" = "video"
): Asset {
  return {
    id,
    kind,
    uri: `${id}.mp4`,
    displayName: id,
    importedAt: "2026-06-14T00:00:00.000Z",
    media: {},
    tags,
    status: "online"
  };
}

describe("assignAssetsToScenes", () => {
  it("matches asset by keyword", () => {
    const project = createProjectWithTimeline([
      createAsset("asset_001", ["factory"])
    ]);

    const nextProject = assignAssetsToScenes(project);
    const clip = nextProject.timeline.tracks[0]?.clips[0];

    expect(clip?.source).toEqual({
      assetId: "asset_001"
    });
    expect(clip?.mediaType).toBe("video");
    expect(clip?.sceneId).toBe("scene_001");
  });

  it("chooses asset with highest tag overlap", () => {
    const project = createProjectWithTimeline([
      createAsset("asset_001", ["factory"]),
      createAsset("asset_002", ["factory", "workers"])
    ]);

    const nextProject = assignAssetsToScenes(project);

    expect(nextProject.timeline.tracks[0]?.clips[0]?.source).toEqual({
      assetId: "asset_002"
    });
  });

  it("leaves placeholder when no asset matches", () => {
    const project = createProjectWithTimeline([
      createAsset("asset_001", ["sunrise"])
    ]);

    const nextProject = assignAssetsToScenes(project);
    const clip = nextProject.timeline.tracks[0]?.clips[0];

    expect(clip?.source).toBeUndefined();
    expect(clip?.mediaType).toBe("placeholder");
  });

  it("does not mutate the original project", () => {
    const project = createProjectWithTimeline([
      createAsset("asset_001", ["factory"])
    ]);
    const originalTimeline = project.timeline;
    const originalClip = project.timeline.tracks[0]?.clips[0];

    const nextProject = assignAssetsToScenes(project);

    expect(project.timeline).toBe(originalTimeline);
    expect(project.timeline.tracks[0]?.clips[0]).toBe(originalClip);
    expect(project.timeline.tracks[0]?.clips[0]?.source).toBeUndefined();
    expect(nextProject).not.toBe(project);
    expect(nextProject.timeline).not.toBe(originalTimeline);
  });
});
