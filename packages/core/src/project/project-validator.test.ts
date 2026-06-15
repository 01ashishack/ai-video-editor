import { describe, expect, it } from "vitest";
import type { Project, TimelineClip, Track } from "../index.js";
import { createProject } from "./project-factory.js";
import { validateProject } from "./project-validator.js";

function createValidProject(): Project {
  return {
    ...createProject({
      projectId: "project_001",
      name: "Test Project",
      createdAt: "2026-06-14T00:00:00.000Z"
    }),
    sources: [
      {
        id: "source_001",
        kind: "srt",
        uri: "test.srt",
        importedAt: "2026-06-14T00:00:00.000Z"
      }
    ],
    scenes: [
      {
        id: "scene_001",
        order: 1,
        source: "srt",
        title: "Scene One",
        text: "Scene one text.",
        keywords: ["scene"],
        sourceRefs: [],
        status: "unassigned",
        constraints: {}
      }
    ],
    timeline: {
      id: "project_001_timeline",
      tracks: [createTrack("track_001", [createClip("clip_001")])],
      transitions: [],
      markers: []
    }
  };
}

function createTrack(id: string, clips: TimelineClip[] = []): Track {
  return {
    id,
    kind: "video",
    role: "primary-video",
    name: id,
    order: 1,
    clips
  };
}

function createClip(id: string): TimelineClip {
  return {
    id,
    trackId: "track_001",
    mediaType: "placeholder",
    role: "placeholder",
    timelineRange: {
      start: 0,
      duration: 1000
    },
    enabled: true,
    locked: false,
    links: [],
    render: {}
  };
}

describe("validateProject", () => {
  it("accepts a valid project", () => {
    const result = validateProject(createValidProject());

    expect(result).toEqual({
      valid: true,
      errors: [],
      warnings: []
    });
  });

  it("rejects duplicate scene id", () => {
    const project = createValidProject();
    project.scenes = [
      ...project.scenes,
      {
        ...project.scenes[0]!,
        order: 2
      }
    ];

    const result = validateProject(project);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      code: "DUPLICATE_SCENE_ID",
      message: "Duplicate scene id. scene_001",
      path: "/scenes"
    });
  });

  it("rejects duplicate source id", () => {
    const project = createValidProject();
    project.sources = [...project.sources, { ...project.sources[0]! }];

    const result = validateProject(project);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      code: "DUPLICATE_SOURCE_ID",
      message: "Duplicate source id. source_001",
      path: "/sources"
    });
  });

  it("rejects duplicate track id", () => {
    const project = createValidProject();
    project.timeline.tracks = [
      createTrack("track_001"),
      createTrack("track_001")
    ];

    const result = validateProject(project);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      code: "DUPLICATE_TRACK_ID",
      message: "Duplicate track id. track_001",
      path: "/timeline/tracks"
    });
  });

  it("rejects duplicate scene order", () => {
    const project = createValidProject();
    project.scenes = [
      ...project.scenes,
      {
        ...project.scenes[0]!,
        id: "scene_002"
      }
    ];

    const result = validateProject(project);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      code: "DUPLICATE_SCENE_ORDER",
      message: "Duplicate scene order. 1",
      path: "/scenes"
    });
  });

  it("rejects duplicate clip id", () => {
    const project = createValidProject();
    project.timeline.tracks = [
      createTrack("track_001", [createClip("clip_001")]),
      createTrack("track_002", [createClip("clip_001")])
    ];

    const result = validateProject(project);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      code: "DUPLICATE_TIMELINE_CLIP_ID",
      message: "Duplicate timeline clip id. clip_001",
      path: "/timeline/tracks"
    });
  });
});
