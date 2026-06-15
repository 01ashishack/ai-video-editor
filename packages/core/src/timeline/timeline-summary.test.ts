import { describe, expect, it } from "vitest";
import type { Asset, Project, TimelineClip, Track } from "../index.js";
import { createProject } from "../project/index.js";
import { generateTimelineSummary } from "./timeline-summary.js";

function createBaseProject(): Project {
  return createProject({
    projectId: "project_001",
    name: "Test Project",
    createdAt: "2026-06-14T00:00:00.000Z"
  });
}

function createClip(
  id: string,
  start: number,
  duration: number,
  assetId?: string
): TimelineClip {
  return {
    id,
    trackId: "track_001",
    mediaType: assetId ? "video" : "placeholder",
    role: "placeholder",
    timelineRange: {
      start,
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

function createTrack(id: string, clips: TimelineClip[]): Track {
  return {
    id,
    kind: "video",
    role: "primary-video",
    name: id,
    order: 1,
    clips
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

describe("generateTimelineSummary", () => {
  it("summarizes an empty timeline", () => {
    const summary = generateTimelineSummary(createBaseProject());

    expect(summary).toEqual({
      trackCount: 0,
      clipCount: 0,
      assignedClipCount: 0,
      placeholderClipCount: 0,
      sceneCount: 0,
      assetCount: 0,
      totalDuration: 0
    });
  });

  it("summarizes timeline with placeholders", () => {
    const project: Project = {
      ...createBaseProject(),
      scenes: [
        {
          id: "scene_001",
          order: 1,
          source: "manual",
          title: "Scene One",
          text: "Scene one.",
          keywords: [],
          sourceRefs: [],
          status: "unassigned",
          constraints: {}
        }
      ],
      timeline: {
        id: "project_001_timeline",
        tracks: [
          createTrack("track_001", [
            createClip("clip_001", 0, 1000),
            createClip("clip_002", 1000, 2000)
          ])
        ],
        transitions: [],
        markers: []
      }
    };

    const summary = generateTimelineSummary(project);

    expect(summary).toMatchObject({
      trackCount: 1,
      clipCount: 2,
      assignedClipCount: 0,
      placeholderClipCount: 2,
      sceneCount: 1,
      assetCount: 0
    });
  });

  it("summarizes timeline with assigned assets", () => {
    const project: Project = {
      ...createBaseProject(),
      assets: [createAsset("asset_001")],
      timeline: {
        id: "project_001_timeline",
        tracks: [
          createTrack("track_001", [
            createClip("clip_001", 0, 1000, "asset_001"),
            createClip("clip_002", 1000, 2000)
          ])
        ],
        transitions: [],
        markers: []
      }
    };

    const summary = generateTimelineSummary(project);

    expect(summary).toMatchObject({
      clipCount: 2,
      assignedClipCount: 1,
      placeholderClipCount: 1,
      assetCount: 1
    });
  });

  it("calculates total duration from max track end time", () => {
    const project: Project = {
      ...createBaseProject(),
      timeline: {
        id: "project_001_timeline",
        tracks: [
          createTrack("track_001", [createClip("clip_001", 0, 1000)]),
          createTrack("track_002", [createClip("clip_002", 500, 2500)])
        ],
        transitions: [],
        markers: []
      }
    };

    const summary = generateTimelineSummary(project);

    expect(summary.totalDuration).toBe(3000);
  });
});
