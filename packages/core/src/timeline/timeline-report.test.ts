import { describe, expect, it } from "vitest";
import type { Asset, Project, TimelineClip, Track } from "../index.js";
import { createProject } from "../project/index.js";
import { generateTimelineReport } from "./timeline-report.js";

function createBaseProject(): Project {
  return {
    ...createProject({
      projectId: "project_001",
      name: "Test Project",
      createdAt: "2026-06-14T00:00:00.000Z"
    }),
    scenes: [
      {
        id: "scene_002",
        order: 2,
        source: "manual",
        title: "Second Scene",
        text: "Second scene.",
        keywords: [],
        sourceRefs: [],
        status: "unassigned",
        constraints: {}
      },
      {
        id: "scene_001",
        order: 1,
        source: "manual",
        title: "First Scene",
        text: "First scene.",
        keywords: [],
        sourceRefs: [],
        status: "unassigned",
        constraints: {}
      }
    ]
  };
}

function createAsset(id: string, displayName: string): Asset {
  return {
    id,
    kind: "video",
    uri: `${id}.mp4`,
    displayName,
    importedAt: "2026-06-14T00:00:00.000Z",
    media: {},
    tags: [],
    status: "online"
  };
}

function createClip(
  id: string,
  sceneId: string | undefined,
  duration: number,
  assetId?: string
): TimelineClip {
  return {
    id,
    trackId: "track_001",
    sceneId,
    mediaType: assetId ? "video" : "placeholder",
    role: "placeholder",
    timelineRange: {
      start: 0,
      duration
    },
    source: assetId
      ? {
          assetId
        }
      : undefined,
    enabled: true,
    locked: false,
    links: [],
    render: {}
  };
}

function createTrack(clips: TimelineClip[]): Track {
  return {
    id: "track_001",
    kind: "video",
    role: "primary-video",
    name: "Primary Video",
    order: 1,
    clips
  };
}

describe("generateTimelineReport", () => {
  it("reports scene with assigned asset", () => {
    const project: Project = {
      ...createBaseProject(),
      assets: [createAsset("asset_001", "Factory Shot")],
      timeline: {
        id: "project_001_timeline",
        tracks: [createTrack([createClip("clip_001", "scene_001", 2500, "asset_001")])],
        transitions: [],
        markers: []
      }
    };

    expect(generateTimelineReport(project)).toEqual({
      scenes: [
        {
          sceneId: "scene_001",
          title: "First Scene",
          clipId: "clip_001",
          assetId: "asset_001",
          assetName: "Factory Shot",
          duration: 2500,
          assigned: true
        }
      ]
    });
  });

  it("reports scene without asset", () => {
    const project: Project = {
      ...createBaseProject(),
      timeline: {
        id: "project_001_timeline",
        tracks: [createTrack([createClip("clip_001", "scene_001", 2500)])],
        transitions: [],
        markers: []
      }
    };

    expect(generateTimelineReport(project)).toEqual({
      scenes: [
        {
          sceneId: "scene_001",
          title: "First Scene",
          clipId: "clip_001",
          assetId: undefined,
          assetName: undefined,
          duration: 2500,
          assigned: false
        }
      ]
    });
  });

  it("preserves scene order for multiple scenes", () => {
    const project: Project = {
      ...createBaseProject(),
      timeline: {
        id: "project_001_timeline",
        tracks: [
          createTrack([
            createClip("clip_002", "scene_002", 2000),
            createClip("clip_001", "scene_001", 1000)
          ])
        ],
        transitions: [],
        markers: []
      }
    };

    expect(generateTimelineReport(project).scenes.map((scene) => scene.sceneId)).toEqual([
      "scene_001",
      "scene_002"
    ]);
  });

  it("ignores clips without sceneId", () => {
    const project: Project = {
      ...createBaseProject(),
      timeline: {
        id: "project_001_timeline",
        tracks: [
          createTrack([
            createClip("clip_001", "scene_001", 1000),
            createClip("clip_orphan", undefined, 500)
          ])
        ],
        transitions: [],
        markers: []
      }
    };

    expect(generateTimelineReport(project).scenes).toHaveLength(1);
    expect(generateTimelineReport(project).scenes[0]?.clipId).toBe("clip_001");
  });
});
