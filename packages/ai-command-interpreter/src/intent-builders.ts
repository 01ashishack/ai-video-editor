import {
  EDITING_INTENT_SCHEMA_VERSION,
  type ClipDeleteIntent,
  type ClipDeleteIntentPayload,
  type ClipMoveIntent,
  type ClipMoveRelativeIntentPayload,
  type ClipMoveIntentPayload,
  type ClipSplitIntent,
  type ClipSplitIntentPayload,
  type ClipTrimIntent,
  type ClipTrimIntentPayload,
  type EditingIntent,
  type EditingIntentPayloadByType,
  type EditingIntentRequest,
  type EditingIntentType,
  type IntentValidationError,
  type SceneReplaceIntent,
  type SceneReplaceNumberIntentPayload,
  type SceneReplaceIntentPayload
} from "./intent-types.js";
import {
  assertEditingIntent,
  formatIntentValidationErrors,
  validateClipDeleteIntentPayload,
  validateClipMoveIntentPayload,
  validateClipSplitIntentPayload,
  validateClipTrimIntentPayload,
  validateSceneReplaceIntentPayload
} from "./intent-validation.js";

export function createSceneReplaceIntent(
  payload: SceneReplaceIntentPayload
): SceneReplaceIntent {
  assertValidPayload(validateSceneReplaceIntentPayload(payload));

  return freezeIntent({
    schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
    type: "scene.replace",
    payload: isSceneReplaceNumberPayload(payload)
      ? {
          sceneNumber: payload.sceneNumber
        }
      : {
          sceneId: payload.sceneId,
          text: payload.text
        }
  });
}

export function createClipMoveIntent(
  payload: ClipMoveIntentPayload
): ClipMoveIntent {
  assertValidPayload(validateClipMoveIntentPayload(payload));

  return freezeIntent({
    schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
    type: "clip.move",
    payload: isClipMoveRelativePayload(payload)
      ? {
          clipId: payload.clipId,
          placement: payload.placement,
          targetClipId: payload.targetClipId
        }
      : {
          clipId: payload.clipId,
          start: payload.start
        }
  });
}

export function createClipTrimIntent(
  payload: ClipTrimIntentPayload
): ClipTrimIntent {
  assertValidPayload(validateClipTrimIntentPayload(payload));

  return freezeIntent({
    schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
    type: "clip.trim",
    payload: {
      clipId: payload.clipId,
      duration: payload.duration
    }
  });
}

export function createClipSplitIntent(
  payload: ClipSplitIntentPayload
): ClipSplitIntent {
  assertValidPayload(validateClipSplitIntentPayload(payload));

  return freezeIntent({
    schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
    type: "clip.split",
    payload: {
      clipId: payload.clipId,
      splitAt: payload.splitAt
    }
  });
}

export function createClipDeleteIntent(
  payload: ClipDeleteIntentPayload
): ClipDeleteIntent {
  assertValidPayload(validateClipDeleteIntentPayload(payload));

  return freezeIntent({
    schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
    type: "clip.delete",
    payload: {
      clipId: payload.clipId
    }
  });
}

export function createEditingIntent<TType extends EditingIntentType>(
  request: EditingIntentRequest<TType>
): Extract<EditingIntent, { type: TType }> {
  switch (request.type) {
    case "scene.replace":
      return createSceneReplaceIntent(
        request.payload as EditingIntentPayloadByType["scene.replace"]
      ) as Extract<EditingIntent, { type: TType }>;
    case "clip.move":
      return createClipMoveIntent(
        request.payload as EditingIntentPayloadByType["clip.move"]
      ) as Extract<EditingIntent, { type: TType }>;
    case "clip.trim":
      return createClipTrimIntent(
        request.payload as EditingIntentPayloadByType["clip.trim"]
      ) as Extract<EditingIntent, { type: TType }>;
    case "clip.split":
      return createClipSplitIntent(
        request.payload as EditingIntentPayloadByType["clip.split"]
      ) as Extract<EditingIntent, { type: TType }>;
    case "clip.delete":
      return createClipDeleteIntent(
        request.payload as EditingIntentPayloadByType["clip.delete"]
      ) as Extract<EditingIntent, { type: TType }>;
  }
}

export function normalizeEditingIntent(input: unknown): EditingIntent {
  return freezeIntent(assertEditingIntent(input));
}

function assertValidPayload(errors: IntentValidationError[]): void {
  if (errors.length > 0) {
    throw new Error(formatIntentValidationErrors(errors));
  }
}

function freezeIntent<TIntent extends EditingIntent>(intent: TIntent): TIntent {
  Object.freeze(intent.payload);
  return Object.freeze(intent);
}

function isSceneReplaceNumberPayload(
  payload: SceneReplaceIntentPayload
): payload is SceneReplaceNumberIntentPayload {
  return "sceneNumber" in payload;
}

function isClipMoveRelativePayload(
  payload: ClipMoveIntentPayload
): payload is ClipMoveRelativeIntentPayload {
  return "placement" in payload || "targetClipId" in payload;
}
