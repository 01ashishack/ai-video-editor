import { describe, expect, it } from "vitest";
import type { CommandEnvelope, Project, TimelineClip } from "../../index.js";
import { createProject } from "../../project/index.js";
import { executeCommand } from "../command-executor.js";
import { clipTrimCommandHandler } from "./clip-trim-command.js";

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
    links: [
      {
        clipId: "clip_audio_001",
        relation: "linked-audio"
      }
    ],
    render: {
      opacity: 0.8,
      fit: "cover"
    }
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

function createClipTrimCommand(
  overrides: Partial<CommandEnvelope> = {}
): CommandEnvelope {
  return {
    schemaVersion: "0.1",
    commandId: "cmd_001",
    type: "clip.trim",
    projectId: "project_001",
    source: "test",
    createdAt: "2026-06-14T00:00:01.000Z",
    payload: {
      clipId: "clip_001",
      duration: 1500
    },
    ...overrides
  };
}

describe("clipTrimCommandHandler", () => {
  it("trims clip duration", () => {
    const project = createTestProject();
    const execution = executeCommand(project, createClipTrimCommand(), {
      "clip.trim": clipTrimCommandHandler
    });

    expect(execution.result.status).toBe("applied");
    expect(
      execution.project.timeline.tracks[0]?.clips[0]?.timelineRange.duration
    ).toBe(1500);
  });

  it("preserves start time", () => {
    const project = createTestProject();
    const execution = executeCommand(project, createClipTrimCommand(), {
      "clip.trim": clipTrimCommandHandler
    });

    expect(
      execution.project.timeline.tracks[0]?.clips[0]?.timelineRange.start
    ).toBe(1000);
  });

  it("preserves sceneId", () => {
    const project = createTestProject();
    const execution = executeCommand(project, createClipTrimCommand(), {
      "clip.trim": clipTrimCommandHandler
    });

    expect(execution.project.timeline.tracks[0]?.clips[0]?.sceneId).toBe(
      "scene_001"
    );
  });

  it("preserves source", () => {
    const project = createTestProject();
    const execution = executeCommand(project, createClipTrimCommand(), {
      "clip.trim": clipTrimCommandHandler
    });

    expect(execution.project.timeline.tracks[0]?.clips[0]?.source).toEqual({
      assetId: "asset_001"
    });
  });

  it("preserves mediaType, links, and render", () => {
    const project = createTestProject();
    const execution = executeCommand(project, createClipTrimCommand(), {
      "clip.trim": clipTrimCommandHandler
    });
    const clip = execution.project.timeline.tracks[0]?.clips[0];

    expect(clip?.mediaType).toBe("video");
    expect(clip?.links).toEqual(project.timeline.tracks[0]?.clips[0]?.links);
    expect(clip?.render).toEqual(project.timeline.tracks[0]?.clips[0]?.render);
  });

  it("rejects missing clip", () => {
    const project = createTestProject();
    const command = createClipTrimCommand({
      payload: {
        clipId: "clip_missing",
        duration: 1500
      }
    });
    const execution = executeCommand(project, command, {
      "clip.trim": clipTrimCommandHandler
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

  it("rejects invalid duration", () => {
    const project = createTestProject();
    const command = createClipTrimCommand({
      payload: {
        clipId: "clip_001",
        duration: 0
      }
    });
    const execution = executeCommand(project, command, {
      "clip.trim": clipTrimCommandHandler
    });

    expect(execution.project).toBe(project);
    expect(execution.result.status).toBe("rejected");
    expect(execution.result.errors).toEqual([
      {
        code: "INVALID_CLIP_DURATION",
        message: "Clip duration must be greater than zero."
      }
    ]);
  });

  it("supports dryRun without changing returned project", () => {
    const project = createTestProject();
    const command = createClipTrimCommand({
      dryRun: true
    });
    const execution = executeCommand(project, command, {
      "clip.trim": clipTrimCommandHandler
    });

    expect(execution.project).toBe(project);
    expect(execution.result.status).toBe("dry-run");
    expect(project.timeline.tracks[0]?.clips[0]?.timelineRange.duration).toBe(
      2500
    );
  });

  it("does not mutate original project", () => {
    const project = createTestProject();
    const originalTimeline = project.timeline;
    const originalClip = project.timeline.tracks[0]?.clips[0];
    const execution = executeCommand(project, createClipTrimCommand(), {
      "clip.trim": clipTrimCommandHandler
    });

    expect(project.timeline).toBe(originalTimeline);
    expect(project.timeline.tracks[0]?.clips[0]).toBe(originalClip);
    expect(project.timeline.tracks[0]?.clips[0]?.timelineRange.duration).toBe(
      2500
    );
    expect(execution.project).not.toBe(project);
    expect(execution.project.timeline).not.toBe(originalTimeline);
    expect(execution.project.timeline.tracks[0]?.clips[0]).not.toBe(
      originalClip
    );
  });
});
