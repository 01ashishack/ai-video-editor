import type { CommandRegistry } from "../commands/index.js";
import type { CommandLogEntry } from "../models/index.js";
import type { Project } from "../project/index.js";
import { replayProject } from "../replay/index.js";

export interface HistoryState {
  commands: CommandLogEntry[];
  currentPosition: number;
}

export interface HistoryOperationResult {
  project: Project;
  history: HistoryState;
}

export function undo(
  initialProject: Project,
  history: HistoryState,
  registry: CommandRegistry
): HistoryOperationResult {
  const nextPosition =
    history.currentPosition <= 0
      ? history.currentPosition
      : history.currentPosition - 1;

  return replayHistoryAtPosition(initialProject, history, registry, nextPosition);
}

export function redo(
  initialProject: Project,
  history: HistoryState,
  registry: CommandRegistry
): HistoryOperationResult {
  const nextPosition =
    history.currentPosition >= history.commands.length
      ? history.currentPosition
      : history.currentPosition + 1;

  return replayHistoryAtPosition(initialProject, history, registry, nextPosition);
}

function replayHistoryAtPosition(
  initialProject: Project,
  history: HistoryState,
  registry: CommandRegistry,
  currentPosition: number
): HistoryOperationResult {
  const activeCommands = history.commands.slice(0, currentPosition);
  const replay = replayProject(initialProject, activeCommands, registry);

  return {
    project: replay.project,
    history: {
      commands: history.commands,
      currentPosition
    }
  };
}
