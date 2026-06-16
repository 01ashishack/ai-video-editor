import type { EditingIntentSchemaVersion } from "./intent-types.js";

export interface ResolvedSceneReplaceIntent {
  schemaVersion: EditingIntentSchemaVersion;
  type: "scene.replace";
  payload: Readonly<{
    sceneId: string;
    text?: string;
  }>;
}

export interface ResolvedClipMoveIntent {
  schemaVersion: EditingIntentSchemaVersion;
  type: "clip.move";
  payload: Readonly<{
    clipId: string;
    start: number;
  }>;
}

export interface ResolvedClipTrimIntent {
  schemaVersion: EditingIntentSchemaVersion;
  type: "clip.trim";
  payload: Readonly<{
    clipId: string;
    duration: number;
  }>;
}

export interface ResolvedClipSplitIntent {
  schemaVersion: EditingIntentSchemaVersion;
  type: "clip.split";
  payload: Readonly<{
    clipId: string;
    splitAt: number;
  }>;
}

export interface ResolvedClipDeleteIntent {
  schemaVersion: EditingIntentSchemaVersion;
  type: "clip.delete";
  payload: Readonly<{
    clipId: string;
  }>;
}

export type ResolvedIntent =
  | ResolvedSceneReplaceIntent
  | ResolvedClipMoveIntent
  | ResolvedClipTrimIntent
  | ResolvedClipSplitIntent
  | ResolvedClipDeleteIntent;
