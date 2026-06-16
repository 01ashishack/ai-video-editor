import {
  createProject,
  type Project,
  type Scene,
  type TimelineClip,
  type Track
} from "@aide/core";
import { describe, expect, it } from "vitest";
import {
  createClipMoveIntent,
  createClipTrimIntent,
  createSceneReplaceIntent
} from "./intent-builders.js";
import type { EditingIntent } from "./intent-types.js";
import { resolveEditingIntent } from "./resolver.js";

function createTestProject(): Project {
  const scenes: Scene[] = [
    createScene("scene_001", 1),
    createScene("scene_002", 2)
  ];
  const clips: TimelineClip[] = [
    createClip("clip_alpha", "track_001", "scene_001", 0, 1000),
    createClip("clip_beta", "track_001", "scene_002", 1000, 2000)
  ];
  const track: Track = {
    id: "track_001",
    kind: "video",
    role: "primary-video",
    name: "Primary Video",
    order: 1,
    clips
  };

  return {
    ...createProject({
      projectId: "project_001",
      name: "Resolver Project",
      createdAt: "2026-06-16T00:00:00.000Z"
    }),
    scenes,
    timeline: {
      id: "project_001_timeline",
      tracks: [track],
      transitions: [],
      markers: []
    }
  };
}

function createScene(id: string, order: number): Scene {
  return {
    id,
    order,
    source: "manual",
    title: `Scene ${order}`,
    text: `Scene ${order}`,
    keywords: [],
    sourceRefs: [],
    status: "assigned",
    constraints: {}
  };
}

function createClip(
  id: string,
  trackId: string,
  sceneId: string,
  start: number,
  duration: number
): TimelineClip {
  return {
    id,
    trackId,
    sceneId,
    mediaType: "image",
    role: "primary-visual",
    timelineRange: {
      start,
      duration
    },
    enabled: true,
    locked: false,
    links: [],
    render: {}
  };
}

describe("resolveEditingIntent", () => {
  it("resolves scene references", () => {
    const project = createTestProject();
    const intent = createSceneReplaceIntent({
      sceneNumber: 2
    });

    expect(resolveEditingIntent(project, intent)).toEqual({
      schemaVersion: "0.1",
      type: "scene.replace",
      payload: {
        sceneId: "scene_002"
      }
    });
  });

  it("resolves clip references", () => {
    const project = createTestProject();
    const intent = {
      schemaVersion: "0.1",
      type: "clip.trim",
      payload: {
        clipNumber: 2,
        duration: 1500
      }
    } as unknown as EditingIntent;

    expect(resolveEditingIntent(project, intent)).toEqual({
      schemaVersion: "0.1",
      type: "clip.trim",
      payload: {
        clipId: "clip_beta",
        duration: 1500
      }
    });
  });

  it("resolves relative references using current project state", () => {
    const project = createTestProject();
    const intent = createClipMoveIntent({
      clipId: "clip_alpha",
      placement: "after",
      targetClipId: "clip_beta"
    });

    expect(resolveEditingIntent(project, intent)).toEqual({
      schemaVersion: "0.1",
      type: "clip.move",
      payload: {
        clipId: "clip_alpha",
        start: 3000
      }
    });
  });

  it("produces deterministic output", () => {
    const project = createTestProject();
    const intent = createClipTrimIntent({
      clipId: "clip_alpha",
      duration: 750
    });

    expect(resolveEditingIntent(project, intent)).toEqual(
      resolveEditingIntent(project, intent)
    );
  });

  it("rejects missing references", () => {
    const project = createTestProject();
    const intent = createSceneReplaceIntent({
      sceneNumber: 99
    });

    expect(() => resolveEditingIntent(project, intent)).toThrow(
      "Scene not found for number: 99."
    );
  });

  it("does not mutate the project or intent", () => {
    const project = createTestProject();
    const intent = createClipMoveIntent({
      clipId: "clip_alpha",
      start: 2500
    });
    const originalProject = structuredClone(project);
    const originalIntent = structuredClone(intent);
    const result = resolveEditingIntent(project, intent);

    expect(project).toEqual(originalProject);
    expect(intent).toEqual(originalIntent);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.payload)).toBe(true);
  });
});
