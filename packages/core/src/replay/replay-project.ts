import type { CommandLogEntry } from "../models/index.js";
import type { Project } from "../project/index.js";
import { executeCommand } from "../commands/index.js";
import type { CommandRegistry } from "../commands/index.js";

export interface ReplayResult {
  project: Project;
  appliedCommands: number;
}

export function replayProject(
  initialProject: Project,
  entries: CommandLogEntry[],
  registry: CommandRegistry
): ReplayResult {
  let project = initialProject;
  let appliedCommands = 0;
  const sortedEntries = [...entries].sort((left, right) => {
    return left.sequence - right.sequence;
  });

  for (const entry of sortedEntries) {
    const execution = executeCommand(project, entry.command, registry);

    if (execution.result.status !== "applied") {
      continue;
    }

    project = execution.project;
    appliedCommands += 1;
  }

  return {
    project,
    appliedCommands
  };
}
