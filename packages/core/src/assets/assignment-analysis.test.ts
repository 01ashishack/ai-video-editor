import { describe, expect, it } from "vitest";
import type { Project, TimelineClip, Track } from "../index.js";
import { createProject } from "../project/index.js";
import { generateAssignmentAnalysis } from "./assignment-analysis.js";

function createBaseProject(): Project {
  return createProject({
    projectId: "project_001",
    name: "Test Project",
    createdAt: "2026-06-14T00:00:00.000Z"
  });
}

function createProjectWithScenes(sceneIds: string[]): Project {
  return {
    ...createBaseProject(),
    scenes: sceneIds.map((sceneId, index) => ({
      id: sceneId,
      order: index + 1,
      source: "manual",
      title: sceneId,
      text: sceneId,
      keywords: [],
      sourceRefs: [],
      status: "unassigned",
      constraints: {}
    }))
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

function createClip(sceneId: string, assetId?: string): TimelineClip {
  return {
    id: `clip_${sceneId}`,
    trackId: "track_001",
    sceneId,
    mediaType: assetId ? "video" : "placeholder",
    role: "placeholder",
    timelineRange: {
      start: 0,
      duration: 1000
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

describe("generateAssignmentAnalysis", () => {
  it("handles no scenes", () => {
    const analysis = generateAssignmentAnalysis(createBaseProject());

    expect(analysis).toEqual({
      sceneCount: 0,
      assignedSceneCount: 0,
      unassignedSceneCount: 0,
      coveragePercent: 0,
      assignedScenes: [],
      unassignedScenes: []
    });
  });

  it("reports all scenes assigned", () => {
    const project: Project = {
      ...createProjectWithScenes(["scene_001", "scene_002"]),
      timeline: {
        id: "project_001_timeline",
        tracks: [
          createTrack([
            createClip("scene_001", "asset_001"),
            createClip("scene_002", "asset_002")
          ])
        ],
        transitions: [],
        markers: []
      }
    };

    expect(generateAssignmentAnalysis(project)).toEqual({
      sceneCount: 2,
      assignedSceneCount: 2,
      unassignedSceneCount: 0,
      coveragePercent: 100,
      assignedScenes: ["scene_001", "scene_002"],
      unassignedScenes: []
    });
  });

  it("reports partially assigned scenes", () => {
    const project: Project = {
      ...createProjectWithScenes(["scene_001", "scene_002"]),
      timeline: {
        id: "project_001_timeline",
        tracks: [
          createTrack([
            createClip("scene_001", "asset_001"),
            createClip("scene_002")
          ])
        ],
        transitions: [],
        markers: []
      }
    };

    expect(generateAssignmentAnalysis(project)).toEqual({
      sceneCount: 2,
      assignedSceneCount: 1,
      unassignedSceneCount: 1,
      coveragePercent: 50,
      assignedScenes: ["scene_001"],
      unassignedScenes: ["scene_002"]
    });
  });

  it("reports no scenes assigned", () => {
    const project: Project = {
      ...createProjectWithScenes(["scene_001", "scene_002"]),
      timeline: {
        id: "project_001_timeline",
        tracks: [createTrack([createClip("scene_001"), createClip("scene_002")])],
        transitions: [],
        markers: []
      }
    };

    expect(generateAssignmentAnalysis(project)).toEqual({
      sceneCount: 2,
      assignedSceneCount: 0,
      unassignedSceneCount: 2,
      coveragePercent: 0,
      assignedScenes: [],
      unassignedScenes: ["scene_001", "scene_002"]
    });
  });
});
