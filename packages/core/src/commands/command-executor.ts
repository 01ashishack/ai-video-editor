import { createCommandLogEntry } from "../journal/index.js";
import type {
  CommandEnvelope,
  CommandResult,
  ProjectDiff
} from "../models/index.js";
import {
  updateProjectMetadata,
  type Project
} from "../project/index.js";
import type {
  CommandExecutionContext,
  CommandExecutionWithJournal,
  CommandRegistry
} from "./command-types.js";

export function executeCommand(
  project: Project,
  command: CommandEnvelope,
  registry: CommandRegistry
): CommandExecutionWithJournal {
  const handler = registry[command.type];
  const projectHashBefore = project.metadata.contentHash;

  if (!handler) {
    return {
      project,
      result: {
        commandId: command.commandId,
        status: "rejected",
        projectId: command.projectId,
        summary: `No command handler registered for ${command.type}.`,
        diff: createEmptyDiff(),
        warnings: [],
        errors: [
          {
            code: "COMMAND_HANDLER_NOT_FOUND",
            message: `No command handler registered for ${command.type}.`
          }
        ],
        projectHashBefore
      }
    };
  }

  const context: CommandExecutionContext = {
    project,
    command,
    dryRun: command.dryRun ?? false
  };

  try {
    const execution = handler(context);

    if (execution.result.status !== "applied") {
      return execution;
    }

    const projectWithUpdatedMetadata = updateProjectMetadata(
      execution.project,
      command.commandId
    );
    const finalResult = createFinalAppliedResult(
      execution.result,
      projectWithUpdatedMetadata.metadata.contentHash
    );

    return {
      project: projectWithUpdatedMetadata,
      result: finalResult,
      journalEntry: createCommandLogEntry(
        project.metadata.commandCount + 1,
        command,
        finalResult,
        command.createdAt
      )
    };
  } catch (error) {
    return {
      project,
      result: {
        commandId: command.commandId,
        status: "rejected",
        projectId: command.projectId,
        summary: `Command handler failed for ${command.type}.`,
        diff: createEmptyDiff(),
        warnings: [],
        errors: [
          {
            code: "COMMAND_HANDLER_FAILED",
            message:
              error instanceof Error
                ? error.message
                : `Command handler failed for ${command.type}.`
          }
        ],
        projectHashBefore
      }
    };
  }
}

function createFinalAppliedResult(
  result: CommandResult,
  projectHashAfter: string
): CommandResult {
  return {
    ...result,
    projectHashAfter
  };
}

function createEmptyDiff(): ProjectDiff {
  return {
    added: [],
    updated: [],
    removed: []
  };
}
