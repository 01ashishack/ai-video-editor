import {
  createProject,
  type Project,
  type Scene,
  type TimelineClip,
  type Track
} from "@aide/core";
import { describe, expect, it } from "vitest";
import { runEditingSession } from "./editing-session.js";
import type { EditingSessionResult } from "./editing-session-types.js";
import { undoEditingSession } from "./session-undo.js";

function createUndoProject(): Project {
  const scene: Scene = {
    id: "scene_001",
    order: 1,
    source: "manual",
    title: "Scene 1",
    text: "Scene 1",
    keywords: [],
    sourceRefs: [],
    status: "assigned",
    constraints: {}
  };
  const clips: TimelineClip[] = [
    createClip("clip_alpha", "scene_001", 0, 1000),
    createClip("clip_beta", "scene_001", 1000, 2000)
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
      name: "Undo Project",
      createdAt: "2026-06-16T00:00:00.000Z"
    }),
    scenes: [scene],
    timeline: {
      id: "project_001_timeline",
      tracks: [track],
      transitions: [],
      markers: []
    }
  };
}

function createClip(
  id: string,
  sceneId: string,
  start: number,
  duration: number
): TimelineClip {
  return {
    id,
    trackId: "track_001",
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

describe("undoEditingSession", () => {
  it("undoes a single action session", () => {
    const project = createUndoProject();
    const session = runEditingSession(project, "trim clip_alpha to 500 ms");
    const undo = undoEditingSession(session);

    expect(undo).toEqual({
      restoredProject: project,
      restored: true
    });
    expect(session.project).not.toEqual(project);
  });

  it("undoes a multi-action session", () => {
    const project = createUndoProject();
    const session = runEditingSession(
      project,
      "move clip_alpha after clip_beta and trim clip_alpha to 500 ms"
    );
    const undo = undoEditingSession(session);

    expect(undo.restored).toBe(true);
    expect(undo.restoredProject).toEqual(project);
    expect(session.project.timeline.tracks[0]?.clips[0]?.timelineRange).toEqual({
      start: 3000,
      duration: 500
    });
  });

  it("creates deterministic undo output", () => {
    const project = createUndoProject();
    const session = runEditingSession(project, "trim clip_alpha to 500 ms");

    expect(undoEditingSession(session)).toEqual(undoEditingSession(session));
  });

  it("rejects invalid rollback sessions", () => {
    const project = createUndoProject();
    const session = runEditingSession(project, "trim clip_alpha to 500 ms");
    const invalidSession: EditingSessionResult = {
      ...session,
      rollbackSnapshot: undefined
    };

    expect(() => undoEditingSession(invalidSession)).toThrow(
      "Cannot undo session: rollback snapshot missing."
    );
  });

  it("does not mutate the session or restored project", () => {
    const project = createUndoProject();
    const session = runEditingSession(project, "delete clip_alpha");
    const originalSession = structuredClone(session);
    const undo = undoEditingSession(session);

    expect(session).toEqual(originalSession);
    expect(project).toEqual(createUndoProject());
    expect(undo.restoredProject).not.toBe(project);
    expect(undo.restoredProject).toEqual(project);
  });
});
