import { describe, expect, it } from "vitest";
import type {
  CommandEnvelope,
  Project,
  TimelineClip,
  Track
} from "../../index.js";
import { createProject } from "../../project/index.js";
import { executeCommand } from "../command-executor.js";
import { clipDeleteCommandHandler } from "./clip-delete-command.js";

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
    mediaType: "placeholder",
    role: "placeholder",
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

function createTrack(id: string, clips: TimelineClip[]): Track {
  return {
    id,
    kind: "video",
    role: "primary-video",
    name: id,
    order: id === "track_001" ? 1 : 2,
    clips
  };
}

function createTestProject(): Project {
  return {
    ...createProject({
      projectId: "project_001",
      name: "Test Project",
      createdAt: "2026-06-14T00:00:00.000Z"
    }),
    timeline: {
      id: "project_001_timeline",
      tracks: [
        createTrack("track_001", [
          createClip("clip_001", "track_001", "scene_001", 0, 1000),
          createClip("clip_002", "track_001", "scene_002", 1000, 2000)
        ]),
        createTrack("track_002", [
          createClip("clip_003", "track_002", "scene_003", 3000, 1500)
        ])
      ],
      transitions: [],
      markers: []
    }
  };
}

function createClipDeleteCommand(
  overrides: Partial<CommandEnvelope> = {}
): CommandEnvelope {
  return {
    schemaVersion: "0.1",
    commandId: "cmd_001",
    type: "clip.delete",
    projectId: "project_001",
    source: "test",
    createdAt: "2026-06-14T00:00:01.000Z",
    payload: {
      clipId: "clip_001"
    },
    ...overrides
  };
}

describe("clipDeleteCommandHandler", () => {
  it("deletes clip", () => {
    const project = createTestProject();
    const execution = executeCommand(project, createClipDeleteCommand(), {
      "clip.delete": clipDeleteCommandHandler
    });

    expect(execution.result.status).toBe("applied");
    expect(
      execution.project.timeline.tracks[0]?.clips.map((clip) => clip.id)
    ).toEqual(["clip_002"]);
    expect(execution.result.diff.removed).toEqual([
      {
        path: "/timeline/clips/clip_001",
        entityType: "TimelineClip",
        entityId: "clip_001"
      }
    ]);
  });

  it("preserves remaining clips", () => {
    const project = createTestProject();
    const execution = executeCommand(project, createClipDeleteCommand(), {
      "clip.delete": clipDeleteCommandHandler
    });

    expect(
      execution.project.timeline.tracks.flatMap((track) =>
        track.clips.map((clip) => clip.id)
      )
    ).toEqual(["clip_002", "clip_003"]);
  });

  it("preserves track order", () => {
    const project = createTestProject();
    const execution = executeCommand(project, createClipDeleteCommand(), {
      "clip.delete": clipDeleteCommandHandler
    });

    expect(execution.project.timeline.tracks.map((track) => track.id)).toEqual([
      "track_001",
      "track_002"
    ]);
  });

  it("rejects missing clip", () => {
    const project = createTestProject();
    const command = createClipDeleteCommand({
      payload: {
        clipId: "clip_missing"
      }
    });
    const execution = executeCommand(project, command, {
      "clip.delete": clipDeleteCommandHandler
    });

    expect(execution.project).toBe(project);
    expect(execution.result.status).toBe("rejected");
    expect(execution.result.errors).toEqual([
      {
        code: "CLIP_NOT_FOUND",
        message: "Clip not found: clip_missing."
      }
    ]);
  });

  it("supports dryRun without changing returned project", () => {
    const project = createTestProject();
    const command = createClipDeleteCommand({
      dryRun: true
    });
    const execution = executeCommand(project, command, {
      "clip.delete": clipDeleteCommandHandler
    });

    expect(execution.project).toBe(project);
    expect(execution.result.status).toBe("dry-run");
    expect(project.timeline.tracks[0]?.clips.map((clip) => clip.id)).toEqual([
      "clip_001",
      "clip_002"
    ]);
  });

  it("does not mutate original project", () => {
    const project = createTestProject();
    const originalTimeline = project.timeline;
    const originalClips = project.timeline.tracks[0]?.clips;
    const execution = executeCommand(project, createClipDeleteCommand(), {
      "clip.delete": clipDeleteCommandHandler
    });

    expect(project.timeline).toBe(originalTimeline);
    expect(project.timeline.tracks[0]?.clips).toBe(originalClips);
    expect(project.timeline.tracks[0]?.clips.map((clip) => clip.id)).toEqual([
      "clip_001",
      "clip_002"
    ]);
    expect(execution.project).not.toBe(project);
    expect(execution.project.timeline).not.toBe(originalTimeline);
  });

  it("does not affect clip timing of others", () => {
    const project = createTestProject();
    const execution = executeCommand(project, createClipDeleteCommand(), {
      "clip.delete": clipDeleteCommandHandler
    });
    const remainingClip = execution.project.timeline.tracks[0]?.clips[0];

    expect(remainingClip?.timelineRange).toEqual({
      start: 1000,
      duration: 2000
    });
  });

  it("does not affect sceneId of others", () => {
    const project = createTestProject();
    const execution = executeCommand(project, createClipDeleteCommand(), {
      "clip.delete": clipDeleteCommandHandler
    });

    expect(
      execution.project.timeline.tracks.flatMap((track) =>
        track.clips.map((clip) => clip.sceneId)
      )
    ).toEqual(["scene_002", "scene_003"]);
  });
});
