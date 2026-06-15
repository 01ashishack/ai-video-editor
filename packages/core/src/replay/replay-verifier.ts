import { executeCommand } from "../commands/index.js";
import type { CommandRegistry } from "../commands/index.js";
import type { CommandLogEntry } from "../models/index.js";
import type { Project } from "../project/index.js";

export interface ReplayVerificationResult {
  valid: boolean;
  appliedCommands: number;
  errors: string[];
}

export function verifyReplay(
  initialProject: Project,
  entries: CommandLogEntry[],
  registry: CommandRegistry
): ReplayVerificationResult {
  let project = initialProject;
  let appliedCommands = 0;
  const errors: string[] = [];
  const sortedEntries = [...entries].sort((left, right) => {
    return left.sequence - right.sequence;
  });

  for (const entry of sortedEntries) {
    if (project.metadata.contentHash !== entry.projectHashBefore) {
      errors.push(
        `Sequence ${entry.sequence}: projectHashBefore mismatch. Expected ${entry.projectHashBefore}, got ${project.metadata.contentHash}.`
      );
    }

    const execution = executeCommand(project, entry.command, registry);

    if (execution.result.status !== "applied") {
      continue;
    }

    appliedCommands += 1;

    if (execution.result.projectHashAfter !== entry.projectHashAfter) {
      errors.push(
        `Sequence ${entry.sequence}: projectHashAfter mismatch. Expected ${entry.projectHashAfter}, got ${execution.result.projectHashAfter}.`
      );
    }

    project = execution.project;
  }

  return {
    valid: errors.length === 0,
    appliedCommands,
    errors
  };
}
