import {
  type ClipMoveIntentPayload,
  type EditingIntent,
  type SceneReplaceIntentPayload
} from "./intent-types.js";
import { assertEditingIntent } from "./intent-validation.js";
import {
  PLANNED_COMMAND_SCHEMA_VERSION,
  type PlannedCommand
} from "./planner-types.js";

export function planEditingIntent(intent: EditingIntent): PlannedCommand[] {
  const validatedIntent = assertEditingIntent(intent);

  switch (validatedIntent.type) {
    case "scene.replace":
      return freezePlan([
        {
          schemaVersion: PLANNED_COMMAND_SCHEMA_VERSION,
          type: "scene.replace",
          payload: cloneSceneReplacePayload(validatedIntent.payload)
        }
      ]);
    case "clip.move":
      return freezePlan([
        {
          schemaVersion: PLANNED_COMMAND_SCHEMA_VERSION,
          type: "clip.move",
          payload: cloneClipMovePayload(validatedIntent.payload)
        }
      ]);
    case "clip.trim":
      return freezePlan([
        {
          schemaVersion: PLANNED_COMMAND_SCHEMA_VERSION,
          type: "clip.trim",
          payload: {
            clipId: validatedIntent.payload.clipId,
            duration: validatedIntent.payload.duration
          }
        }
      ]);
    case "clip.split":
      return freezePlan([
        {
          schemaVersion: PLANNED_COMMAND_SCHEMA_VERSION,
          type: "clip.split",
          payload: {
            clipId: validatedIntent.payload.clipId,
            splitAt: validatedIntent.payload.splitAt
          }
        }
      ]);
    case "clip.delete":
      return freezePlan([
        {
          schemaVersion: PLANNED_COMMAND_SCHEMA_VERSION,
          type: "clip.delete",
          payload: {
            clipId: validatedIntent.payload.clipId
          }
        }
      ]);
  }
}

function cloneSceneReplacePayload(
  payload: Readonly<SceneReplaceIntentPayload>
): SceneReplaceIntentPayload {
  if ("sceneNumber" in payload) {
    return {
      sceneNumber: payload.sceneNumber
    };
  }

  return {
    sceneId: payload.sceneId,
    text: payload.text
  };
}

function cloneClipMovePayload(
  payload: Readonly<ClipMoveIntentPayload>
): ClipMoveIntentPayload {
  if ("start" in payload) {
    return {
      clipId: payload.clipId,
      start: payload.start
    };
  }

  return {
    clipId: payload.clipId,
    placement: payload.placement,
    targetClipId: payload.targetClipId
  };
}

function freezePlan<TPlan extends PlannedCommand[]>(plan: TPlan): TPlan {
  for (const command of plan) {
    Object.freeze(command.payload);
    Object.freeze(command);
  }

  return Object.freeze(plan) as TPlan;
}
