import { describe, expect, it } from "vitest";
import type { Asset, Project, Scene, TimelineClip } from "../index.js";
import { createProject } from "../project/index.js";
import { validateTimeline } from "./timeline-validator.js";

function createScene(id: string): Scene {
  return {
    id,
    order: Number(id.replace("scene_", "")),
    source: "manual",
    title: id,
    text: id,
    keywords: [],
    sourceRefs: [],
    status: "unassigned",
    constraints: {}
  };
}

function createAsset(id: string): Asset {
  return {
    id,
    kind: "video",
    uri: `${id}.mp4`,
    displayName: id,
    importedAt: "2026-06-14T00:00:00.000Z",
    media: {},
    tags: [],
    status: "online"
  };
}

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
    source: {
      assetId: "asset_001"
    },
    enabled: true,
    locked: false,
    links: [],
    render: {},
    ...overrides
  };
}

function createTestProject(clips: TimelineClip[]): Project {
  return {
    ...createProject({
      projectId: "project_001",
      name: "Test Project",
      createdAt: "2026-06-14T00:00:00.000Z"
    }),
    scenes: [createScene("scene_001"), createScene("scene_002")],
    assets: [createAsset("asset_001"), createAsset("asset_002")],
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

describe("validateTimeline", () => {
  it("passes valid timeline", () => {
    const project = createTestProject([
      createClip("clip_001", 0, 1000),
      createClip("clip_002", 1000, 1000, {
        sceneId: "scene_002",
        source: {
          assetId: "asset_002"
        }
      })
    ]);

    expect(validateTimeline(project)).toEqual({
      valid: true,
      errors: [],
      warnings: []
    });
  });

  it("rejects duplicate clip ids", () => {
    const project = createTestProject([
      createClip("clip_001", 0, 1000),
      createClip("clip_001", 1000, 1000)
    ]);

    expect(validateTimeline(project).errors).toContainEqual({
      code: "DUPLICATE_TIMELINE_CLIP_ID",
      message: "Duplicate timeline clip id. clip_001",
      path: "/timeline/tracks"
    });
  });

  it("rejects negative start", () => {
    const project = createTestProject([createClip("clip_001", -1, 1000)]);

    expect(validateTimeline(project).errors).toContainEqual({
      code: "NEGATIVE_CLIP_START",
      message: "Clip start must be >= 0. clip_001",
      path: "/timeline/tracks"
    });
  });

  it("rejects zero duration", () => {
    const project = createTestProject([createClip("clip_001", 0, 0)]);

    expect(validateTimeline(project).errors).toContainEqual({
      code: "INVALID_CLIP_DURATION",
      message: "Clip duration must be > 0. clip_001",
      path: "/timeline/tracks"
    });
  });

  it("rejects negative duration", () => {
    const project = createTestProject([createClip("clip_001", 0, -1)]);

    expect(validateTimeline(project).errors).toContainEqual({
      code: "INVALID_CLIP_DURATION",
      message: "Clip duration must be > 0. clip_001",
      path: "/timeline/tracks"
    });
  });

  it("rejects overlapping clips", () => {
    const project = createTestProject([
      createClip("clip_001", 0, 5000),
      createClip("clip_002", 4000, 3000)
    ]);

    expect(validateTimeline(project).errors).toContainEqual({
      code: "OVERLAPPING_CLIPS",
      message: "Overlapping clips on track track_001",
      path: "/timeline/tracks"
    });
  });

  it("rejects orphaned scene", () => {
    const project = createTestProject([
      createClip("clip_001", 0, 1000, {
        sceneId: "scene_missing"
      })
    ]);

    expect(validateTimeline(project).errors).toContainEqual({
      code: "ORPHANED_SCENE_REFERENCE",
      message: "Scene not found. scene_missing",
      path: "/timeline/tracks"
    });
  });

  it("rejects orphaned asset", () => {
    const project = createTestProject([
      createClip("clip_001", 0, 1000, {
        source: {
          assetId: "asset_missing"
        }
      })
    ]);

    expect(validateTimeline(project).errors).toContainEqual({
      code: "ORPHANED_ASSET_REFERENCE",
      message: "Asset not found. asset_missing",
      path: "/timeline/tracks"
    });
  });

  it("collects multiple errors", () => {
    const project = createTestProject([
      createClip("clip_001", -1, 0, {
        sceneId: "scene_missing",
        source: {
          assetId: "asset_missing"
        }
      }),
      createClip("clip_001", 0, 1000)
    ]);
    const result = validateTimeline(project);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "NEGATIVE_CLIP_START",
          message: "Clip start must be >= 0. clip_001",
          path: "/timeline/tracks"
        },
        {
          code: "INVALID_CLIP_DURATION",
          message: "Clip duration must be > 0. clip_001",
          path: "/timeline/tracks"
        },
        {
          code: "ORPHANED_SCENE_REFERENCE",
          message: "Scene not found. scene_missing",
          path: "/timeline/tracks"
        },
        {
          code: "ORPHANED_ASSET_REFERENCE",
          message: "Asset not found. asset_missing",
          path: "/timeline/tracks"
        },
        {
          code: "DUPLICATE_TIMELINE_CLIP_ID",
          message: "Duplicate timeline clip id. clip_001",
          path: "/timeline/tracks"
        }
      ])
    );
  });

  it("does not mutate the original project", () => {
    const project = createTestProject([
      createClip("clip_001", 0, 1000),
      createClip("clip_002", 1000, 1000)
    ]);
    const originalTimeline = project.timeline;
    const originalTracks = project.timeline.tracks;
    const originalClips = project.timeline.tracks[0]?.clips;

    validateTimeline(project);

    expect(project.timeline).toBe(originalTimeline);
    expect(project.timeline.tracks).toBe(originalTracks);
    expect(project.timeline.tracks[0]?.clips).toBe(originalClips);
    expect(project.timeline.tracks[0]?.clips.map((clip) => clip.id)).toEqual([
      "clip_001",
      "clip_002"
    ]);
  });
});
