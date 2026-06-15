import { describe, expect, it } from "vitest";
import type { CommandEnvelope, Project, TimelineClip } from "../../index.js";
import { createProject } from "../../project/index.js";
import { executeCommand } from "../command-executor.js";
import { clipMoveCommandHandler } from "./clip-move-command.js";

function createClip(): TimelineClip {
  return {
    id: "clip_001",
    trackId: "track_001",
    sceneId: "scene_001",
    mediaType: "video",
    role: "placeholder",
    timelineRange: {
      start: 1000,
      duration: 2500
    },
    source: {
      assetId: "asset_001"
    },
    enabled: true,
    locked: false,
    links: [],
    render: {}
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
        {
          id: "track_001",
          kind: "video",
          role: "primary-video",
          name: "Primary Video",
          order: 1,
          clips: [createClip()]
        }
      ],
      transitions: [],
      markers: []
    }
  };
}

function createClipMoveCommand(
  overrides: Partial<CommandEnvelope> = {}
): CommandEnvelope {
  return {
    schemaVersion: "0.1",
    commandId: "cmd_001",
    type: "clip.move",
    projectId: "project_001",
    source: "test",
    createdAt: "2026-06-14T00:00:01.000Z",
    payload: {
      clipId: "clip_001",
      start: 5000
    },
    ...overrides
  };
}

describe("clipMoveCommandHandler", () => {
  it("moves clip start time", () => {
    const project = createTestProject();
    const execution = executeCommand(project, createClipMoveCommand(), {
      "clip.move": clipMoveCommandHandler
    });

    expect(execution.result.status).toBe("applied");
    expect(
      execution.project.timeline.tracks[0]?.clips[0]?.timelineRange.start
    ).toBe(5000);
  });

  it("preserves duration", () => {
    const project = createTestProject();
    const execution = executeCommand(project, createClipMoveCommand(), {
      "clip.move": clipMoveCommandHandler
    });

    expect(
      execution.project.timeline.tracks[0]?.clips[0]?.timelineRange.duration
    ).toBe(2500);
  });

  it("preserves sceneId", () => {
    const project = createTestProject();
    const execution = executeCommand(project, createClipMoveCommand(), {
      "clip.move": clipMoveCommandHandler
    });

    expect(execution.project.timeline.tracks[0]?.clips[0]?.sceneId).toBe(
      "scene_001"
    );
  });

  it("preserves source", () => {
    const project = createTestProject();
    const execution = executeCommand(project, createClipMoveCommand(), {
      "clip.move": clipMoveCommandHandler
    });

    expect(execution.project.timeline.tracks[0]?.clips[0]?.source).toEqual({
      assetId: "asset_001"
    });
  });

  it("rejects missing clip", () => {
    const project = createTestProject();
    const command = createClipMoveCommand({
      payload: {
        clipId: "clip_missing",
        start: 5000
      }
    });
    const execution = executeCommand(project, command, {
      "clip.move": clipMoveCommandHandler
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
    const command = createClipMoveCommand({
      dryRun: true
    });
    const execution = executeCommand(project, command, {
      "clip.move": clipMoveCommandHandler
    });

    expect(execution.project).toBe(project);
    expect(execution.result.status).toBe("dry-run");
    expect(project.timeline.tracks[0]?.clips[0]?.timelineRange.start).toBe(1000);
  });

  it("does not mutate original project", () => {
    const project = createTestProject();
    const originalTimeline = project.timeline;
    const originalClip = project.timeline.tracks[0]?.clips[0];
    const execution = executeCommand(project, createClipMoveCommand(), {
      "clip.move": clipMoveCommandHandler
    });

    expect(project.timeline).toBe(originalTimeline);
    expect(project.timeline.tracks[0]?.clips[0]).toBe(originalClip);
    expect(project.timeline.tracks[0]?.clips[0]?.timelineRange.start).toBe(1000);
    expect(execution.project).not.toBe(project);
    expect(execution.project.timeline).not.toBe(originalTimeline);
    expect(execution.project.timeline.tracks[0]?.clips[0]).not.toBe(
      originalClip
    );
  });
});
