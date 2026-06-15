import type { CommandEnvelope, CommandResult } from "./command.js";
import type { ISODateString } from "./time.js";

export interface ReplayMetadata {
  hashAlgorithm: "sha256";
  commandSchemaVersion: "0.1";
  projectSchemaVersion: "0.1";
}

export interface CommandLogEntry {
  logVersion: "0.1";
  sequence: number;
  writtenAt: ISODateString;
  command: CommandEnvelope;
  result: CommandResult;
  projectHashBefore: string;
  projectHashAfter?: string;
  replay: ReplayMetadata;
}
