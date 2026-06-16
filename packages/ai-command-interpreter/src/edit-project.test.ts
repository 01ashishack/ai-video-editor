import {
  createProject,
  type Project,
  type Scene,
  type TimelineClip,
  type Track
} from "@aide/core";
import { describe, expect, it } from "vitest";
import { editProject } from "./edit-project.js";
import { EDITING_INTENT_SCHEMA_VERSION } from "./intent-types.js";
import { MockLLMProvider } from "./llm-provider.js";

function createEditProjectFixture(): Project {
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
      name: "Edit Project API Fixture",
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

describe("editProject", () => {
  it("returns a successful edit result", async () => {
    const project = createEditProjectFixture();
    const result = await editProject({
      project,
      request: "trim clip_alpha to 500 ms"
    });

    expect(result.intents).toEqual([
      {
        schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
        type: "clip.trim",
        payload: {
          clipId: "clip_alpha",
          duration: 500
        }
      }
    ]);
    expect(result.confidence).toBe(0.95);
    expect(result.requiresClarification).toBe(false);
    expect(result.ambiguityReasons).toEqual([]);
    expect(result.dryRun.summary).toEqual(["Trim clip clip_alpha"]);
    expect(result.executionResult.executedCommandCount).toBe(1);
    expect(
      result.updatedProject.timeline.tracks[0]?.clips[0]?.timelineRange.duration
    ).toBe(500);
  });

  it("marks medium-confidence edits as requiring clarification", async () => {
    const project = createEditProjectFixture();
    const result = await editProject({
      project,
      request: "move clip_alpha after clip_beta"
    });

    expect(result.confidence).toBe(0.7);
    expect(result.requiresClarification).toBe(true);
    expect(result.ambiguityReasons).toEqual([
      "Relative target reference must be resolved."
    ]);
    expect(
      result.updatedProject.timeline.tracks[0]?.clips[0]?.timelineRange.start
    ).toBe(3000);
  });

  it("aggregates confidence across generated intents", async () => {
    const project = createEditProjectFixture();
    const result = await editProject({
      project,
      request: "move clip_alpha after clip_beta and trim clip_alpha to 500 ms"
    });

    expect(result.confidence).toBe(0.825);
    expect(result.requiresClarification).toBe(false);
    expect(result.ambiguityReasons).toEqual([
      "Relative target reference must be resolved."
    ]);
    expect(result.executionResult.executedCommandCount).toBe(2);
  });

  it("is deterministic with an AI fallback provider", async () => {
    const response = JSON.stringify([
      {
        schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
        type: "clip.trim",
        payload: {
          clipId: "clip_alpha",
          duration: 750
        }
      }
    ]);
    const leftProject = createEditProjectFixture();
    const rightProject = createEditProjectFixture();
    const request = "make the first clip tighter";

    await expect(
      editProject({
        project: leftProject,
        request,
        provider: new MockLLMProvider({
          defaultResponse: response
        })
      })
    ).resolves.toEqual(
      await editProject({
        project: rightProject,
        request,
        provider: new MockLLMProvider({
          defaultResponse: response
        })
      })
    );
  });

  it("does not mutate the original project and returns immutable metadata", async () => {
    const project = createEditProjectFixture();
    const originalProject = structuredClone(project);
    const originalTimeline = project.timeline;
    const originalClip = project.timeline.tracks[0]?.clips[0];
    const result = await editProject({
      project,
      request: "delete clip_alpha"
    });

    expect(project).toEqual(originalProject);
    expect(project.timeline).toBe(originalTimeline);
    expect(project.timeline.tracks[0]?.clips[0]).toBe(originalClip);
    expect(result.updatedProject).not.toBe(project);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.ambiguityReasons)).toBe(true);
    expect(() => {
      (result.ambiguityReasons as string[]).push("changed");
    }).toThrow();
  });
});
