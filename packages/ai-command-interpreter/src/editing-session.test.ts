import {
  createProject,
  type Project,
  type Scene,
  type TimelineClip,
  type Track
} from "@aide/core";
import { describe, expect, it } from "vitest";
import { runEditingSession } from "./editing-session.js";

function createSessionProject(): Project {
  const scenes: Scene[] = [
    createScene("scene_001", 1),
    createScene("scene_002", 2)
  ];
  const clips: TimelineClip[] = [
    createClip("clip_alpha", "scene_001", 0, 1000),
    createClip("clip_beta", "scene_002", 1000, 2000)
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
      name: "Editing Session Project",
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

describe("runEditingSession", () => {
  it("runs a single action request", () => {
    const project = createSessionProject();
    const result = runEditingSession(project, "trim clip_alpha to 1 seconds");

    expect(result.intents).toHaveLength(1);
    expect(result.resolvedIntents).toEqual([
      {
        schemaVersion: "0.1",
        type: "clip.trim",
        payload: {
          clipId: "clip_alpha",
          duration: 1000
        }
      }
    ]);
    expect(result.plannedCommands).toHaveLength(1);
    expect(result.dryRun.summary).toEqual(["Trim clip clip_alpha"]);
    expect(
      result.project.timeline.tracks[0]?.clips[0]?.timelineRange.duration
    ).toBe(1000);
  });

  it("runs a multi-action request", () => {
    const project = createSessionProject();
    const result = runEditingSession(
      project,
      "move clip_alpha after clip_beta and trim clip_alpha to 500 ms"
    );
    const clip = result.project.timeline.tracks[0]?.clips[0];

    expect(result.intents).toHaveLength(2);
    expect(result.resolvedIntents).toEqual([
      {
        schemaVersion: "0.1",
        type: "clip.move",
        payload: {
          clipId: "clip_alpha",
          start: 3000
        }
      },
      {
        schemaVersion: "0.1",
        type: "clip.trim",
        payload: {
          clipId: "clip_alpha",
          duration: 500
        }
      }
    ]);
    expect(result.plannedCommands.map((command) => command.type)).toEqual([
      "clip.move",
      "clip.trim"
    ]);
    expect(result.dryRun.commandCount).toBe(2);
    expect(clip?.timelineRange).toEqual({
      start: 3000,
      duration: 500
    });
  });

  it("executes deterministically", () => {
    const project = createSessionProject();
    const request = "move clip_alpha after clip_beta and trim clip_alpha to 500 ms";

    expect(runEditingSession(project, request)).toEqual(
      runEditingSession(project, request)
    );
  });

  it("rejects invalid requests", () => {
    const project = createSessionProject();

    expect(() => runEditingSession(project, "fix intro")).toThrow(
      "Ambiguous editing request."
    );
  });

  it("does not mutate the original project", () => {
    const project = createSessionProject();
    const originalProject = structuredClone(project);
    const originalTimeline = project.timeline;
    const originalClip = project.timeline.tracks[0]?.clips[0];
    const result = runEditingSession(project, "delete clip_alpha");

    expect(project).toEqual(originalProject);
    expect(project.timeline).toBe(originalTimeline);
    expect(project.timeline.tracks[0]?.clips[0]).toBe(originalClip);
    expect(result.project).not.toBe(project);
    expect(result.project.timeline.tracks[0]?.clips).toHaveLength(1);
  });
});
