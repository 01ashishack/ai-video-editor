import { describe, expect, it } from "vitest";
import type { CommandEnvelope } from "../../models/index.js";
import { buildProjectFromSrt } from "../../project/index.js";
import type { SrtDocument } from "../../srt/index.js";
import { executeCommand } from "../command-executor.js";
import { sceneReplaceCommandHandler } from "./scene-replace-command.js";

const document: SrtDocument = {
  cues: [
    {
      index: 1,
      start: 0,
      end: 2500,
      rawText: "The city wakes before sunrise."
    }
  ]
};

function createTestProject() {
  return buildProjectFromSrt(document, {
    projectId: "project_001",
    name: "Test Project",
    createdAt: "2026-06-14T00:00:00.000Z",
    sourceId: "source_srt_001",
    sourceUri: "test.srt"
  });
}

function createSceneReplaceCommand(
  overrides: Partial<CommandEnvelope> = {}
): CommandEnvelope {
  return {
    schemaVersion: "0.1",
    commandId: "cmd_001",
    type: "scene.replace",
    projectId: "project_001",
    source: "test",
    createdAt: "2026-06-14T00:00:01.000Z",
    payload: {
      sceneId: "scene_001",
      text: "A new opening narration line."
    },
    ...overrides
  };
}

describe("sceneReplaceCommandHandler", () => {
  it("replaces scene text when scene is found", () => {
    const project = createTestProject();
    const execution = executeCommand(project, createSceneReplaceCommand(), {
      "scene.replace": sceneReplaceCommandHandler
    });

    expect(execution.result.status).toBe("applied");
    expect(execution.project.scenes[0]?.text).toBe(
      "A new opening narration line."
    );
    expect(execution.project.scenes[0]?.title).toBe(
      "A new opening narration line."
    );
    expect(execution.project.scenes[0]?.id).toBe("scene_001");
    expect(execution.project.scenes[0]?.sourceRefs).toEqual(
      project.scenes[0]?.sourceRefs
    );
  });

  it("returns a structured error when scene is missing", () => {
    const project = createTestProject();
    const command = createSceneReplaceCommand({
      payload: {
        sceneId: "scene_missing",
        text: "A new opening narration line."
      }
    });

    const execution = executeCommand(project, command, {
      "scene.replace": sceneReplaceCommandHandler
    });

    expect(execution.project).toBe(project);
    expect(execution.result.status).toBe("rejected");
    expect(execution.result.errors).toEqual([
      {
        code: "SCENE_NOT_FOUND",
        message: "Scene not found: scene_missing.",
        path: "/scenes"
      }
    ]);
  });

  it("supports dryRun without changing returned project", () => {
    const project = createTestProject();
    const command = createSceneReplaceCommand({
      dryRun: true
    });

    const execution = executeCommand(project, command, {
      "scene.replace": sceneReplaceCommandHandler
    });

    expect(execution.project).toBe(project);
    expect(execution.result.status).toBe("dry-run");
    expect(execution.project.scenes[0]?.text).toBe(
      "The city wakes before sunrise."
    );
  });

  it("warns when scene text changes and keywords remain unchanged", () => {
    const project = createTestProject();
    const execution = executeCommand(project, createSceneReplaceCommand(), {
      "scene.replace": sceneReplaceCommandHandler
    });

    expect(execution.result.warnings).toEqual([
      {
        code: "SCENE_KEYWORDS_STALE",
        message: "Keywords may no longer reflect scene text."
      }
    ]);
    expect(execution.project.scenes[0]?.keywords).toEqual(
      project.scenes[0]?.keywords
    );
  });

  it("does not mutate the original project", () => {
    const project = createTestProject();
    const originalScene = project.scenes[0];

    const execution = executeCommand(project, createSceneReplaceCommand(), {
      "scene.replace": sceneReplaceCommandHandler
    });

    expect(project.scenes[0]).toBe(originalScene);
    expect(project.scenes[0]?.text).toBe("The city wakes before sunrise.");
    expect(execution.project).not.toBe(project);
    expect(execution.project.scenes[0]).not.toBe(originalScene);
  });
});
