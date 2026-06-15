import { describe, expect, it } from "vitest";
import type { CommandEnvelope, Project, TimelineClip } from "../../index.js";
import { createProject } from "../../project/index.js";
import { executeCommand } from "../command-executor.js";
import { clipSplitCommandHandler } from "./clip-split-command.js";

function createClip(): TimelineClip {
  return {
    id: "clip_001",
    trackId: "track_001",
    sceneId: "scene_001",
    mediaType: "video",
    role: "placeholder",
    timelineRange: {
      start: 1000,
      duration: 5000
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

function createFollowingClip(): TimelineClip {
  return {
    id: "clip_002",
    trackId: "track_001",
    sceneId: "scene_002",
    mediaType: "placeholder",
    role: "placeholder",
    timelineRange: {
      start: 7000,
      duration: 1000
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
          clips: [createClip(), createFollowingClip()]
        },
        {
          id: "track_002",
          kind: "audio",
          role: "voiceover",
          name: "Voiceover",
          order: 2,
          clips: []
        }
      ],
      transitions: [],
      markers: []
    }
  };
}

function createClipSplitCommand(
  overrides: Partial<CommandEnvelope> = {}
): CommandEnvelope {
  return {
    schemaVersion: "0.1",
    commandId: "cmd_001",
    type: "clip.split",
    projectId: "project_001",
    source: "test",
    createdAt: "2026-06-14T00:00:01.000Z",
    payload: {
      clipId: "clip_001",
      splitAt: 2000
    },
    ...overrides
  };
}

describe("clipSplitCommandHandler", () => {
  it("splits clip into two clips", () => {
    const project = createTestProject();
    const execution = executeCommand(project, createClipSplitCommand(), {
      "clip.split": clipSplitCommandHandler
    });
    const clips = execution.project.timeline.tracks[0]?.clips;

    expect(execution.result.status).toBe("applied");
    expect(clips?.[0]?.id).toBe("clip_001");
    expect(clips?.[0]?.timelineRange).toEqual({
      start: 1000,
      duration: 2000
    });
    expect(clips?.[1]?.id).toBe("clip_001_part2");
    expect(clips?.[1]?.timelineRange).toEqual({
      start: 3000,
      duration: 3000
    });
    expect(execution.result.diff).toEqual({
      added: [
        {
          path: "/timeline/clips/clip_001_part2",
          entityType: "TimelineClip",
          entityId: "clip_001_part2"
        }
      ],
      updated: [
        {
          path: "/timeline/clips/clip_001",
          entityType: "TimelineClip",
          entityId: "clip_001"
        }
      ],
      removed: []
    });
  });

  it("preserves total duration", () => {
    const project = createTestProject();
    const execution = executeCommand(project, createClipSplitCommand(), {
      "clip.split": clipSplitCommandHandler
    });
    const clips = execution.project.timeline.tracks[0]?.clips;

    expect(
      (clips?.[0]?.timelineRange.duration ?? 0) +
        (clips?.[1]?.timelineRange.duration ?? 0)
    ).toBe(5000);
  });

  it("preserves sceneId", () => {
    const project = createTestProject();
    const execution = executeCommand(project, createClipSplitCommand(), {
      "clip.split": clipSplitCommandHandler
    });
    const clips = execution.project.timeline.tracks[0]?.clips;

    expect(clips?.[0]?.sceneId).toBe("scene_001");
    expect(clips?.[1]?.sceneId).toBe("scene_001");
  });

  it("preserves source", () => {
    const project = createTestProject();
    const execution = executeCommand(project, createClipSplitCommand(), {
      "clip.split": clipSplitCommandHandler
    });
    const clips = execution.project.timeline.tracks[0]?.clips;

    expect(clips?.[0]?.source).toEqual({
      assetId: "asset_001"
    });
    expect(clips?.[1]?.source).toEqual({
      assetId: "asset_001"
    });
  });

  it("preserves mediaType", () => {
    const project = createTestProject();
    const execution = executeCommand(project, createClipSplitCommand(), {
      "clip.split": clipSplitCommandHandler
    });
    const clips = execution.project.timeline.tracks[0]?.clips;

    expect(clips?.[0]?.mediaType).toBe("video");
    expect(clips?.[1]?.mediaType).toBe("video");
  });

  it("inserts second clip immediately after first", () => {
    const project = createTestProject();
    const execution = executeCommand(project, createClipSplitCommand(), {
      "clip.split": clipSplitCommandHandler
    });

    expect(
      execution.project.timeline.tracks[0]?.clips.map((clip) => clip.id)
    ).toEqual(["clip_001", "clip_001_part2", "clip_002"]);
    expect(execution.project.timeline.tracks.map((track) => track.id)).toEqual([
      "track_001",
      "track_002"
    ]);
  });

  it("rejects missing clip", () => {
    const project = createTestProject();
    const command = createClipSplitCommand({
      payload: {
        clipId: "clip_missing",
        splitAt: 2000
      }
    });
    const execution = executeCommand(project, command, {
      "clip.split": clipSplitCommandHandler
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

  it("rejects splitAt <= 0", () => {
    const project = createTestProject();
    const command = createClipSplitCommand({
      payload: {
        clipId: "clip_001",
        splitAt: 0
      }
    });
    const execution = executeCommand(project, command, {
      "clip.split": clipSplitCommandHandler
    });

    expect(execution.project).toBe(project);
    expect(execution.result.status).toBe("rejected");
    expect(execution.result.errors).toEqual([
      {
        code: "INVALID_SPLIT_POSITION",
        message: "Split position must be inside the clip duration."
      }
    ]);
  });

  it("rejects splitAt >= duration", () => {
    const project = createTestProject();
    const command = createClipSplitCommand({
      payload: {
        clipId: "clip_001",
        splitAt: 5000
      }
    });
    const execution = executeCommand(project, command, {
      "clip.split": clipSplitCommandHandler
    });

    expect(execution.project).toBe(project);
    expect(execution.result.status).toBe("rejected");
    expect(execution.result.errors).toEqual([
      {
        code: "INVALID_SPLIT_POSITION",
        message: "Split position must be inside the clip duration."
      }
    ]);
  });

  it("supports dryRun without changing returned project", () => {
    const project = createTestProject();
    const command = createClipSplitCommand({
      dryRun: true
    });
    const execution = executeCommand(project, command, {
      "clip.split": clipSplitCommandHandler
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
    const originalClip = project.timeline.tracks[0]?.clips[0];
    const originalFollowingClip = project.timeline.tracks[0]?.clips[1];
    const execution = executeCommand(project, createClipSplitCommand(), {
      "clip.split": clipSplitCommandHandler
    });

    expect(project.timeline).toBe(originalTimeline);
    expect(project.timeline.tracks[0]?.clips[0]).toBe(originalClip);
    expect(project.timeline.tracks[0]?.clips[1]).toBe(originalFollowingClip);
    expect(project.timeline.tracks[0]?.clips.map((clip) => clip.id)).toEqual([
      "clip_001",
      "clip_002"
    ]);
    expect(execution.project).not.toBe(project);
    expect(execution.project.timeline).not.toBe(originalTimeline);
    expect(execution.project.timeline.tracks[0]?.clips[0]).not.toBe(
      originalClip
    );
    expect(execution.project.timeline.tracks[0]?.clips[2]).toBe(
      originalFollowingClip
    );
  });
});
