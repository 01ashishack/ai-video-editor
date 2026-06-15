import type {
  CommandEnvelope,
  CommandLogEntry,
  CommandResult,
  CommandType
} from "../models/index.js";
import type { Project } from "../project/index.js";

export interface CommandExecutionContext<TPayload = unknown> {
  project: Readonly<Project>;
  command: Readonly<CommandEnvelope<TPayload>>;
  dryRun: boolean;
}

export interface CommandExecutionResult {
  project: Project;
  result: CommandResult;
}

export interface CommandExecutionWithJournal {
  project: Project;
  result: CommandResult;
  journalEntry?: CommandLogEntry;
}

export type CommandHandler<TPayload = unknown> = (
  context: CommandExecutionContext<TPayload>
) => CommandExecutionResult;

export type CommandRegistry = Partial<Record<CommandType, CommandHandler<any>>>;
