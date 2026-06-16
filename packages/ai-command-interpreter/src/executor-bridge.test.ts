import {
  createProject,
  type Project,
  type Scene,
  type TimelineClip,
  type Track
} from "@aide/core";
import { describe, expect, it } from "vitest";
import { executePlannedCommands } from "./executor-bridge.js";
import type { PlannedCommand } from "./planner-types.js";

function createTestProject(): Project {
  const scene: Scene = {
    id: "scene_001",
    order: 1,
    source: "manual",
    title: "Original scene",
    text: "Original scene text.",
    keywords: ["original"],
    narrativeRange: {
      start: 0,
      duration: 3000
    },
    sourceRefs: [],
    status: "assigned",
    constraints: {}
  };
  const clip: TimelineClip = {
    id: "clip_001",
    trackId: "track_001",
    sceneId: scene.id,
    mediaType: "image",
    role: "primary-visual",
    timelineRange: {
      start: 1000,
      duration: 3000
    },
    source: {
      assetId: "asset_001"
    },
    enabled: true,
    locked: false,
    links: [],
    render: {}
  };
  const track: Track = {
    id: "track_001",
    kind: "video",
    role: "primary-video",
    name: "Primary Video",
    order: 1,
    clips: [clip]
  };

  return {
    ...createProject({
      projectId: "project_001",
      name: "Test Project",
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

function createPlannedCommand(command: PlannedCommand): PlannedCommand {
  return command;
}

describe("executePlannedCommands", () => {
  it("executes a single planned command", () => {
    const project = createTestProject();
    const result = executePlannedCommands(project, [
      createPlannedCommand({
        schemaVersion: "0.1",
        type: "clip.trim",
        payload: {
          clipId: "clip_001",
          duration: 1500
        }
      })
    ]);

    expect(result.executedCommandCount).toBe(1);
    expect(
      result.project.timeline.tracks[0]?.clips[0]?.timelineRange.duration
    ).toBe(1500);
  });

  it("executes multiple planned commands in order", () => {
    const project = createTestProject();
    const result = executePlannedCommands(project, [
      createPlannedCommand({
        schemaVersion: "0.1",
        type: "clip.move",
        payload: {
          clipId: "clip_001",
          start: 2500
        }
      }),
      createPlannedCommand({
        schemaVersion: "0.1",
        type: "clip.trim",
        payload: {
          clipId: "clip_001",
          duration: 1200
        }
      })
    ]);
    const clip = result.project.timeline.tracks[0]?.clips[0];

    expect(result.executedCommandCount).toBe(2);
    expect(clip?.timelineRange).toEqual({
      start: 2500,
      duration: 1200
    });
  });

  it("executes deterministically", () => {
    const project = createTestProject();
    const commands = [
      createPlannedCommand({
        schemaVersion: "0.1",
        type: "scene.replace",
        payload: {
          sceneId: "scene_001",
          text: "A deterministic replacement."
        }
      })
    ];

    expect(executePlannedCommands(project, commands)).toEqual(
      executePlannedCommands(project, commands)
    );
  });

  it("rejects invalid planned commands", () => {
    const project = createTestProject();

    expect(() =>
      executePlannedCommands(project, [
        {
          schemaVersion: "0.1",
          type: "clip.move",
          payload: {
            clipId: "clip_001",
            placement: "after",
            targetClipId: "clip_002"
          }
        } as PlannedCommand
      ])
    ).toThrow("Invalid planned command: clip.move requires an absolute start.");
  });

  it("does not mutate the original project", () => {
    const project = createTestProject();
    const originalProject = structuredClone(project);
    const originalTimeline = project.timeline;
    const originalClip = project.timeline.tracks[0]?.clips[0];
    const result = executePlannedCommands(project, [
      createPlannedCommand({
        schemaVersion: "0.1",
        type: "clip.delete",
        payload: {
          clipId: "clip_001"
        }
      })
    ]);

    expect(project).toEqual(originalProject);
    expect(project.timeline).toBe(originalTimeline);
    expect(project.timeline.tracks[0]?.clips[0]).toBe(originalClip);
    expect(result.project).not.toBe(project);
    expect(result.project.timeline.tracks[0]?.clips).toEqual([]);
  });
});
