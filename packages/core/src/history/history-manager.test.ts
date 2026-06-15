import { describe, expect, it } from "vitest";
import {
  sceneReplaceCommandHandler,
  type CommandRegistry
} from "../commands/index.js";
import { createCommandLogEntry } from "../journal/index.js";
import type { CommandEnvelope, CommandLogEntry, CommandResult } from "../models/index.js";
import { buildProjectFromSrt } from "../project/index.js";
import { replayProject } from "../replay/index.js";
import type { SrtDocument } from "../srt/index.js";
import {
  redo,
  undo,
  type HistoryState
} from "./history-manager.js";

const registry: CommandRegistry = {
  "scene.replace": sceneReplaceCommandHandler
};

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

function createCommand(sequence: number, command: CommandEnvelope): CommandLogEntry {
  return createCommandLogEntry(
    sequence,
    command,
    createResult(command),
    command.createdAt
  );
}

function createHistory(): HistoryState {
  return {
    commands: [
      createCommand(
        1,
        createSceneReplaceCommand(
          "cmd_001",
          "scene_001",
          "A new opening narration line."
        )
      ),
      createCommand(
        2,
        createSceneReplaceCommand("cmd_002", "scene_002", "The mill comes alive.")
      )
    ],
    currentPosition: 2
  };
}

describe("history-manager", () => {
  it("undoes one command", () => {
    const project = createInitialProject();
    const history = createHistory();

    const result = undo(project, history, registry);

    expect(result.history.currentPosition).toBe(1);
    expect(result.project.scenes.map((scene) => scene.text)).toEqual([
      "A new opening narration line.",
      "Workers arrive at the old textile mill."
    ]);
  });

  it("undoes multiple commands", () => {
    const project = createInitialProject();
    const history = createHistory();

    const firstUndo = undo(project, history, registry);
    const secondUndo = undo(project, firstUndo.history, registry);

    expect(secondUndo.history.currentPosition).toBe(0);
    expect(secondUndo.project.scenes.map((scene) => scene.text)).toEqual([
      "The city wakes before sunrise.",
      "Workers arrive at the old textile mill."
    ]);
  });

  it("redoes one command", () => {
    const project = createInitialProject();
    const history: HistoryState = {
      ...createHistory(),
      currentPosition: 0
    };

    const result = redo(project, history, registry);

    expect(result.history.currentPosition).toBe(1);
    expect(result.project.scenes[0]?.text).toBe(
      "A new opening narration line."
    );
  });

  it("cannot undo below zero", () => {
    const project = createInitialProject();
    const history: HistoryState = {
      ...createHistory(),
      currentPosition: 0
    };

    const result = undo(project, history, registry);

    expect(result.history.currentPosition).toBe(0);
    expect(result.project).toEqual(project);
  });

  it("cannot redo beyond end", () => {
    const project = createInitialProject();
    const history = createHistory();

    const result = redo(project, history, registry);
    const expectedProject = replayProject(
      project,
      history.commands,
      registry
    ).project;

    expect(result.history.currentPosition).toBe(2);
    expect(result.project).toEqual(expectedProject);
  });

  it("keeps history immutable", () => {
    const project = createInitialProject();
    const history = createHistory();
    const originalCommands = history.commands;

    const result = undo(project, history, registry);

    expect(history.currentPosition).toBe(2);
    expect(history.commands).toBe(originalCommands);
    expect(result.history).not.toBe(history);
    expect(result.history.commands).toBe(originalCommands);
  });

  it("returns project state equal to replayed state", () => {
    const project = createInitialProject();
    const history = createHistory();

    const result = undo(project, history, registry);
    const replayed = replayProject(
      project,
      history.commands.slice(0, result.history.currentPosition),
      registry
    );

    expect(result.project).toEqual(replayed.project);
  });

  it("redo restores previously undone change", () => {
    const project = createInitialProject();
    const history = createHistory();

    const undone = undo(project, history, registry);
    const redone = redo(project, undone.history, registry);

    expect(redone.history.currentPosition).toBe(2);
    expect(redone.project.scenes.map((scene) => scene.text)).toEqual([
      "A new opening narration line.",
      "The mill comes alive."
    ]);
  });
});
