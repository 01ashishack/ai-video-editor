import type { ID } from "./ids.js";
import type { ISODateString } from "./time.js";

export type CommandType =
  | "project.create"
  | "srt.import"
  | "scenes.generateFromSrt"
  | "asset.import"
  | "asset.assignToScene"
  | "timeline.buildFromScenes"
  | "clip.trim"
  | "clip.split"
  | "clip.move"
  | "clip.delete"
  | "scene.replace"
  | "transition.add"
  | "transition.remove";

export interface CommandActor {
  id: string;
  kind: "human" | "ai-agent" | "system";
  name?: string;
}

export interface CommandEnvelope<TPayload = unknown> {
  schemaVersion: "0.1";
  commandId: ID;
  type: CommandType;
  projectId: ID;
  source: "cli" | "ai" | "system" | "test";
  actor?: CommandActor;
  createdAt: ISODateString;
  idempotencyKey?: string;
  parentCommandId?: ID;
  dryRun?: boolean;
  payload: TPayload;
}

export interface ValidationWarning {
  code: string;
  message: string;
  path?: string;
}

export interface ValidationError {
  code: string;
  message: string;
  path?: string;
}

export interface DiffEntry {
  path: string;
  entityType:
    | "Project"
    | "Source"
    | "Asset"
    | "Scene"
    | "Track"
    | "TimelineClip"
    | "Transition"
    | "Marker";
  entityId?: ID;
}

export interface ProjectDiff {
  added: DiffEntry[];
  updated: DiffEntry[];
  removed: DiffEntry[];
}

export interface CommandResult {
  commandId: ID;
  status: "applied" | "rejected" | "dry-run";
  projectId: ID;
  summary?: string;
  diff: ProjectDiff;
  warnings: ValidationWarning[];
  errors: ValidationError[];
  projectHashBefore: string;
  projectHashAfter?: string;
}
