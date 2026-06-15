import { describe, expect, it } from "vitest";
import type { Project, TimelineClip } from "../index.js";
import { createProject } from "../project/index.js";
import { buildRemotionComposition } from "./remotion-adapter.js";

function createClip(
  id: string,
  start: number,
  duration: number,
  overrides: Partial<TimelineClip> = {}
): TimelineClip {
  return {
    id,
    trackId: "track_001",
    sceneId: "scene_001",
    mediaType: "video",
    role: "primary-visual",
    timelineRange: {
      start,
      duration
    },
    enabled: true,
    locked: false,
    links: [],
    render: {},
    ...overrides
  };
}

function createTestProject(clips: TimelineClip[] = []): Project {
  return {
    ...createProject({
      projectId: "project_001",
      name: "Test Project",
      createdAt: "2026-06-15T00:00:00.000Z"
    }),
    timeline: {
      id: "project_001_timeline",
      tracks: [
        {
          id: "track_001",
          kind: "video",
          role: "primary-video",
          name: "Primary Video",
          order: 1,
          clips
        }
      ],
      transitions: [],
      markers: []
    }
  };
}

describe("buildRemotionComposition", () => {
  it("converts empty timeline", () => {
    const project = createTestProject();

    expect(buildRemotionComposition(project)).toEqual({
      compositionId: "project_001_composition",
      durationInFrames: 0,
      fps: 30,
      width: 1920,
      height: 1080,
      clips: []
    });
  });

  it("converts one clip", () => {
    const project = createTestProject([createClip("clip_001", 1000, 2000)]);
    const composition = buildRemotionComposition(project);

    expect(composition.clips).toEqual([
      {
        id: "clip_001",
        assetId: undefined,
        sceneId: "scene_001",
        fromFrame: 30,
        durationInFrames: 60,
        mediaType: "video"
      }
    ]);
  });

  it("converts multiple clips", () => {
    const project = createTestProject([
      createClip("clip_001", 0, 1000),
      createClip("clip_002", 1000, 2000, {
        mediaType: "image",
        sceneId: "scene_002"
      })
    ]);
    const composition = buildRemotionComposition(project);

    expect(composition.clips.map((clip) => clip.id)).toEqual([
      "clip_001",
      "clip_002"
    ]);
    expect(composition.clips[1]).toMatchObject({
      id: "clip_002",
      sceneId: "scene_002",
      fromFrame: 30,
      durationInFrames: 60,
      mediaType: "image"
    });
  });

  it("converts frames correctly", () => {
    const project = createTestProject([createClip("clip_001", 1250, 2750)]);
    const composition = buildRemotionComposition(project, {
      fps: 24
    });

    expect(composition.clips[0]?.fromFrame).toBe(30);
    expect(composition.clips[0]?.durationInFrames).toBe(66);
  });

  it("sets composition duration to max clip end frame", () => {
    const project = createTestProject([
      createClip("clip_001", 0, 1000),
      createClip("clip_002", 5000, 2000)
    ]);
    const composition = buildRemotionComposition(project);

    expect(composition.durationInFrames).toBe(210);
  });

  it("preserves assigned asset", () => {
    const project = createTestProject([
      createClip("clip_001", 0, 1000, {
        source: {
          assetId: "asset_001"
        }
      })
    ]);
    const composition = buildRemotionComposition(project);

    expect(composition.clips[0]?.assetId).toBe("asset_001");
  });

  it("preserves sceneId", () => {
    const project = createTestProject([
      createClip("clip_001", 0, 1000, {
        sceneId: "scene_123"
      })
    ]);
    const composition = buildRemotionComposition(project);

    expect(composition.clips[0]?.sceneId).toBe("scene_123");
  });

  it("creates deterministic output", () => {
    const project = createTestProject([createClip("clip_001", 1000, 2000)]);

    expect(buildRemotionComposition(project)).toEqual(
      buildRemotionComposition(project)
    );
  });

  it("does not mutate the original project", () => {
    const project = createTestProject([createClip("clip_001", 1000, 2000)]);
    const originalProject = structuredClone(project);
    const originalTimeline = project.timeline;
    const originalClips = project.timeline.tracks[0]?.clips;

    buildRemotionComposition(project);

    expect(project).toEqual(originalProject);
    expect(project.timeline).toBe(originalTimeline);
    expect(project.timeline.tracks[0]?.clips).toBe(originalClips);
  });
});
