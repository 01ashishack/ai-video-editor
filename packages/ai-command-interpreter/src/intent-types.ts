export const EDITING_INTENT_SCHEMA_VERSION = "0.1";

export type EditingIntentSchemaVersion = typeof EDITING_INTENT_SCHEMA_VERSION;

export type EditingIntentType =
  | "scene.replace"
  | "clip.move"
  | "clip.trim"
  | "clip.split"
  | "clip.delete";

export interface SceneReplaceTextIntentPayload {
  sceneId: string;
  text: string;
}

export interface SceneReplaceNumberIntentPayload {
  sceneNumber: number;
}

export type SceneReplaceIntentPayload =
  | SceneReplaceTextIntentPayload
  | SceneReplaceNumberIntentPayload;

export type ClipMovePlacement = "before" | "after";

export interface ClipMoveAbsoluteIntentPayload {
  clipId: string;
  start: number;
}

export interface ClipMoveRelativeIntentPayload {
  clipId: string;
  placement: ClipMovePlacement;
  targetClipId: string;
}

export type ClipMoveIntentPayload =
  | ClipMoveAbsoluteIntentPayload
  | ClipMoveRelativeIntentPayload;

export interface ClipTrimIntentPayload {
  clipId: string;
  duration: number;
}

export interface ClipSplitIntentPayload {
  clipId: string;
  splitAt: number;
}

export interface ClipDeleteIntentPayload {
  clipId: string;
}

export interface EditingIntentBase<
  TType extends EditingIntentType,
  TPayload extends object
> {
  schemaVersion: EditingIntentSchemaVersion;
  type: TType;
  payload: Readonly<TPayload>;
}

export type SceneReplaceIntent = EditingIntentBase<
  "scene.replace",
  SceneReplaceIntentPayload
>;

export type ClipMoveIntent = EditingIntentBase<
  "clip.move",
  ClipMoveIntentPayload
>;

export type ClipTrimIntent = EditingIntentBase<
  "clip.trim",
  ClipTrimIntentPayload
>;

export type ClipSplitIntent = EditingIntentBase<
  "clip.split",
  ClipSplitIntentPayload
>;

export type ClipDeleteIntent = EditingIntentBase<
  "clip.delete",
  ClipDeleteIntentPayload
>;

export type EditingIntent =
  | SceneReplaceIntent
  | ClipMoveIntent
  | ClipTrimIntent
  | ClipSplitIntent
  | ClipDeleteIntent;

export type EditingIntentPayloadByType = {
  "scene.replace": SceneReplaceIntentPayload;
  "clip.move": ClipMoveIntentPayload;
  "clip.trim": ClipTrimIntentPayload;
  "clip.split": ClipSplitIntentPayload;
  "clip.delete": ClipDeleteIntentPayload;
};

export interface EditingIntentRequest<
  TType extends EditingIntentType = EditingIntentType
> {
  type: TType;
  payload: EditingIntentPayloadByType[TType];
}

export interface IntentValidationError {
  code: string;
  message: string;
  path: string;
}

export type IntentValidationResult =
  | {
      valid: true;
      intent: EditingIntent;
      errors: [];
    }
  | {
      valid: false;
      errors: IntentValidationError[];
    };
