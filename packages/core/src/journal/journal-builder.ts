import type {
  CommandEnvelope,
  CommandLogEntry,
  CommandResult
} from "../models/index.js";

export function createCommandLogEntry(
  sequence: number,
  command: CommandEnvelope,
  result: CommandResult,
  writtenAt: string
): CommandLogEntry {
  return {
    logVersion: "0.1",
    sequence,
    writtenAt,
    command,
    result,
    projectHashBefore: result.projectHashBefore,
    projectHashAfter: result.projectHashAfter,
    replay: {
      hashAlgorithm: "sha256",
      commandSchemaVersion: "0.1",
      projectSchemaVersion: "0.1"
    }
  };
}
