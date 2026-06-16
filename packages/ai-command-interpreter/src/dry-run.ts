import type {
  ClipMoveIntentPayload,
  SceneReplaceIntentPayload
} from "./intent-types.js";
import type { DryRunResult } from "./dry-run-types.js";
import type { PlannedCommand } from "./planner-types.js";

export function createDryRunPreview(
  commands: readonly PlannedCommand[]
): DryRunResult {
  const plannedCommands = commands.map(clonePlannedCommand);
  const summary = plannedCommands.map(createCommandSummary);

  for (const command of plannedCommands) {
    Object.freeze(command.payload);
    Object.freeze(command);
  }

  return Object.freeze({
    commands: Object.freeze(plannedCommands),
    summary: Object.freeze(summary),
    commandCount: plannedCommands.length
  });
}

function createCommandSummary(command: PlannedCommand): string {
  switch (command.type) {
    case "scene.replace":
      return `Replace scene ${getSceneReference(command.payload)}`;
    case "clip.move":
      return `Move clip ${command.payload.clipId}`;
    case "clip.trim":
      return `Trim clip ${command.payload.clipId}`;
    case "clip.split":
      return `Split clip ${command.payload.clipId}`;
    case "clip.delete":
      return `Delete clip ${command.payload.clipId}`;
  }
}

function clonePlannedCommand(command: PlannedCommand): PlannedCommand {
  switch (command.type) {
    case "scene.replace":
      return {
        schemaVersion: command.schemaVersion,
        type: command.type,
        payload: cloneSceneReplacePayload(command.payload)
      };
    case "clip.move":
      return {
        schemaVersion: command.schemaVersion,
        type: command.type,
        payload: cloneClipMovePayload(command.payload)
      };
    case "clip.trim":
      return {
        schemaVersion: command.schemaVersion,
        type: command.type,
        payload: {
          clipId: command.payload.clipId,
          duration: command.payload.duration
        }
      };
    case "clip.split":
      return {
        schemaVersion: command.schemaVersion,
        type: command.type,
        payload: {
          clipId: command.payload.clipId,
          splitAt: command.payload.splitAt
        }
      };
    case "clip.delete":
      return {
        schemaVersion: command.schemaVersion,
        type: command.type,
        payload: {
          clipId: command.payload.clipId
        }
      };
  }
}

function getSceneReference(payload: Readonly<SceneReplaceIntentPayload>): string {
  if ("sceneNumber" in payload) {
    return String(payload.sceneNumber);
  }

  return payload.sceneId;
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
