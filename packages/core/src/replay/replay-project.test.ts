import { describe, expect, it } from "vitest";
import { sceneReplaceCommandHandler } from "../commands/index.js";
import { createCommandLogEntry } from "../journal/index.js";
import type { CommandEnvelope, CommandResult } from "../models/index.js";
import { buildProjectFromSrt } from "../project/index.js";
import type { SrtDocument } from "../srt/index.js";
import { replayProject } from "./replay-project.js";

const document: SrtDocument = {
  cues: [
    {
      index: 1,
      start: 0,
      end: 2500,
      rawText: "The city wakes before sunrise."
    },
    {
      index: 2,
      start: 3000,
      end: 5250,
      rawText: "Workers arrive at the old textile mill."
    }
  ]
};

function createInitialProject() {
  return buildProjectFromSrt(document, {
    projectId: "project_001",
    name: "Test Project",
    createdAt: "2026-06-14T00:00:00.000Z",
    sourceId: "source_srt_001",
    sourceUri: "test.srt"
  });
}

function createSceneReplaceCommand(
  commandId: string,
  sceneId: string,
  text: string
): CommandEnvelope {
  return {
    schemaVersion: "0.1",
    commandId,
    type: "scene.replace",
    projectId: "project_001",
    source: "test",
    createdAt: "2026-06-14T00:00:01.000Z",
    payload: {
      sceneId,
      text
    }
  };
}

function createResult(command: CommandEnvelope): CommandResult {
  return {
    commandId: command.commandId,
    status: "applied",
    projectId: command.projectId,
    diff: {
      added: [],
      updated: [],
      removed: []
    },
    warnings: [],
    errors: [],
    projectHashBefore: "before_hash",
    projectHashAfter: "after_hash"
  };
}

const registry = {
  "scene.replace": sceneReplaceCommandHandler
};

describe("replayProject", () => {
  it("replays one command", () => {
    const project = createInitialProject();
    const command = createSceneReplaceCommand(
      "cmd_001",
      "scene_001",
      "A new opening narration line."
    );

    const result = replayProject(
      project,
      [
        createCommandLogEntry(
          1,
          command,
          createResult(command),
          command.createdAt
        )
      ],
      registry
    );

    expect(result.project.scenes[0]?.text).toBe(
      "A new opening narration line."
    );
  });

  it("replays multiple commands in sequence order", () => {
    const project = createInitialProject();
    const secondCommand = createSceneReplaceCommand(
      "cmd_002",
      "scene_002",
      "The mill comes alive."
    );
    const firstCommand = createSceneReplaceCommand(
      "cmd_001",
      "scene_001",
      "A new opening narration line."
    );

    const result = replayProject(
      project,
      [
        createCommandLogEntry(
          2,
          secondCommand,
          createResult(secondCommand),
          secondCommand.createdAt
        ),
        createCommandLogEntry(
          1,
          firstCommand,
          createResult(firstCommand),
          firstCommand.createdAt
        )
      ],
      registry
    );

    expect(result.project.scenes.map((scene) => scene.text)).toEqual([
      "A new opening narration line.",
      "The mill comes alive."
    ]);
  });

  it("ignores rejected commands", () => {
    const project = createInitialProject();
    const command = createSceneReplaceCommand(
      "cmd_001",
      "scene_missing",
      "This should not apply."
    );

    const result = replayProject(
      project,
      [
        createCommandLogEntry(
          1,
          command,
          createResult(command),
          command.createdAt
        )
      ],
      registry
    );

    expect(result.project).toBe(project);
    expect(result.project.scenes[0]?.text).toBe(
      "The city wakes before sunrise."
    );
    expect(result.appliedCommands).toBe(0);
  });

  it("returns final project state", () => {
    const project = createInitialProject();
    const command = createSceneReplaceCommand(
      "cmd_001",
      "scene_001",
      "A new opening narration line."
    );

    const result = replayProject(
      project,
      [
        createCommandLogEntry(
          1,
          command,
          createResult(command),
          command.createdAt
        )
      ],
      registry
    );

    expect(result.project.scenes[0]?.title).toBe(
      "A new opening narration line."
    );
    expect(result.project.metadata.lastCommandId).toBe("cmd_001");
  });

  it("returns applied command count", () => {
    const project = createInitialProject();
    const firstCommand = createSceneReplaceCommand(
      "cmd_001",
      "scene_001",
      "A new opening narration line."
    );
    const rejectedCommand = createSceneReplaceCommand(
      "cmd_002",
      "scene_missing",
      "This should not apply."
    );

    const result = replayProject(
      project,
      [
        createCommandLogEntry(
          1,
          firstCommand,
          createResult(firstCommand),
          firstCommand.createdAt
        ),
        createCommandLogEntry(
          2,
          rejectedCommand,
          createResult(rejectedCommand),
          rejectedCommand.createdAt
        )
      ],
      registry
    );

    expect(result.appliedCommands).toBe(1);
  });

  it("does not mutate the original project", () => {
    const project = createInitialProject();
    const originalScene = project.scenes[0];
    const command = createSceneReplaceCommand(
      "cmd_001",
      "scene_001",
      "A new opening narration line."
    );

    const result = replayProject(
      project,
      [
        createCommandLogEntry(
          1,
          command,
          createResult(command),
          command.createdAt
        )
      ],
      registry
    );

    expect(project.scenes[0]).toBe(originalScene);
    expect(project.scenes[0]?.text).toBe("The city wakes before sunrise.");
    expect(result.project).not.toBe(project);
    expect(result.project.scenes[0]).not.toBe(originalScene);
  });
});
