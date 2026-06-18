import {
  createProject,
  serializeProject,
  type Asset,
  type Project,
  type Scene,
  type TimelineClip,
  type Track
} from "@aide/core";
import { undoEditingSession } from "@aide/ai-command-interpreter";
import { describe, expect, it } from "vitest";
import { submitAIChatRequest } from "./ai-chat-panel.js";
import { applyEdit } from "./apply-edit.js";

describe("desktop apply edit", () => {
  it("successfully applies a dry-run request", async () => {
    const project = createApplyProject();
    const chatState = await submitAIChatRequest(
      project,
      "trim clip_beta to 500 ms"
    );
    const result = await applyEdit(
      project,
      "trim clip_beta to 500 ms",
      chatState
    );

    expect(result.applied).toBe(true);
    expect(result.message).toBe("Changes applied successfully.");
    expect(result.workspaceHtml).toContain(
      "Changes applied successfully."
    );
    expect(result.workspaceHtml).toContain("Apply Changes");
  });

  it("returns the updated project", async () => {
    const result = await applyEdit(
      createApplyProject(),
      "trim clip_beta to 500 ms"
    );

    expect(
      result.project.timeline.tracks[0]?.clips[1]?.timelineRange.duration
    ).toBe(500);
    expect(result.session?.project).toEqual(result.project);
  });

  it("refreshes the project viewer panel", async () => {
    const result = await applyEdit(
      createApplyProject(),
      "delete clip_alpha"
    );

    expect(result.workspaceHtml).toContain(
      "<dt>Clip Count</dt><dd>1</dd>"
    );
    expect(result.workspaceHtml).not.toContain(
      'data-clip-id="clip_alpha"'
    );
  });

  it("refreshes the timeline panel", async () => {
    const result = await applyEdit(
      createApplyProject(),
      "trim clip_beta to 500 ms"
    );

    expect(result.workspaceHtml).toContain(
      'data-clip-id="clip_beta"'
    );
    expect(result.workspaceHtml).toContain("duration 0.5s");
    expect(result.workspaceHtml).toContain("<span>1.5s</span>");
  });

  it("refreshes preview metadata", async () => {
    const result = await applyEdit(
      createApplyProject(),
      "delete clip_beta"
    );

    expect(result.workspaceHtml).toContain(
      "<dt>Duration</dt><dd>30 frames (1s)</dd>"
    );
    expect(result.workspaceHtml).toContain(
      "<dt>Item Count</dt><dd>1</dd>"
    );
  });

  it("remains compatible with existing session undo", async () => {
    const project = createApplyProject();
    const result = await applyEdit(project, "delete clip_alpha");
    const undo = undoEditingSession(result.session!);

    expect(undo.restored).toBe(true);
    expect(undo.restoredProject).toEqual(project);
  });

  it("is deterministic and does not mutate fixture inputs", async () => {
    const leftProject = createApplyProject();
    const rightProject = createApplyProject();
    const original = structuredClone(leftProject);
    const serialized = serializeProject(leftProject);

    const left = await applyEdit(
      leftProject,
      "trim clip_beta to 500 ms"
    );
    const right = await applyEdit(
      rightProject,
      "trim clip_beta to 500 ms"
    );

    expect(left).toEqual(right);
    expect(leftProject).toEqual(original);
    expect(serializeProject(leftProject)).toBe(serialized);
  });
});

function createApplyProject(): Project {
  const scene = createScene();
  const assets = [
    createAsset("asset_alpha"),
    createAsset("asset_beta")
  ];
  const track: Track = {
    id: "track_video",
    kind: "video",
    role: "primary-video",
    name: "Video",
    order: 1,
    clips: [
      createClip("clip_alpha", scene.id, assets[0]!.id, 0, 1000),
      createClip("clip_beta", scene.id, assets[1]!.id, 1000, 2000)
    ]
  };

  return {
    ...createProject({
      projectId: "desktop_apply_001",
      name: "Desktop Apply",
      createdAt: "2026-06-18T00:00:00.000Z"
    }),
    assets,
    scenes: [scene],
    timeline: {
      id: "desktop_apply_001_timeline",
      tracks: [track],
      transitions: [],
      markers: []
    }
  };
}

function createScene(): Scene {
  return {
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
}

function createAsset(id: string): Asset {
  return {
    id,
    kind: "image",
    uri: `/public/${id}.png`,
    displayName: id,
    importedAt: "2026-06-18T00:00:00.000Z",
    media: {},
    tags: [],
    status: "online"
  };
}

function createClip(
  id: string,
  sceneId: string,
  assetId: string,
  start: number,
  duration: number
): TimelineClip {
  return {
    id,
    trackId: "track_video",
    sceneId,
    mediaType: "image",
    role: "primary-visual",
    timelineRange: {
      start,
      duration
    },
    source: {
      assetId
    },
    enabled: true,
    locked: false,
    links: [],
    render: {}
  };
}
