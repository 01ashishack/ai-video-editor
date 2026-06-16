import {
  clipDeleteCommandHandler,
  clipMoveCommandHandler,
  clipSplitCommandHandler,
  clipTrimCommandHandler,
  executeCommand,
  sceneReplaceCommandHandler,
  type CommandEnvelope,
  type CommandRegistry,
  type Project
} from "@aide/core";
import type { PlannedCommand } from "./planner-types.js";
import { PLANNED_COMMAND_SCHEMA_VERSION } from "./planner-types.js";
import type { ExecutionPlanResult } from "./executor-bridge-types.js";

const COMMAND_REGISTRY: CommandRegistry = {
  "scene.replace": sceneReplaceCommandHandler,
  "clip.move": clipMoveCommandHandler,
  "clip.trim": clipTrimCommandHandler,
  "clip.split": clipSplitCommandHandler,
  "clip.delete": clipDeleteCommandHandler
};

const BRIDGE_CREATED_AT = "1970-01-01T00:00:00.000Z";

export function executePlannedCommands(
  project: Project,
  commands: readonly PlannedCommand[]
): ExecutionPlanResult {
  let currentProject = project;
  let executedCommandCount = 0;

  commands.forEach((command, index) => {
    assertExecutablePlannedCommand(command);

    const execution = executeCommand(
      currentProject,
      createCommandEnvelope(currentProject, command, index),
      COMMAND_REGISTRY
    );

    if (execution.result.status !== "applied") {
      throw new Error(formatRejectedCommand(command, execution.result.errors));
    }

    currentProject = execution.project;
    executedCommandCount += 1;
  });

  return {
    project: currentProject,
    executedCommandCount
  };
}

function createCommandEnvelope(
  project: Project,
  command: PlannedCommand,
  index: number
): CommandEnvelope {
  return {
    schemaVersion: "0.1",
    commandId: createCommandId(command, index),
    type: command.type,
    projectId: project.id,
    source: "ai",
    createdAt: BRIDGE_CREATED_AT,
    payload: cloneExecutablePayload(command)
  };
}

function createCommandId(command: PlannedCommand, index: number): string {
  return `planned_${String(index + 1).padStart(4, "0")}_${command.type.replace(
    ".",
    "_"
  )}`;
}

function cloneExecutablePayload(command: PlannedCommand): unknown {
  switch (command.type) {
    case "scene.replace":
      if (!("sceneId" in command.payload) || !("text" in command.payload)) {
        throw new Error(
          "Invalid planned command: scene.replace requires sceneId and text."
        );
      }

      return {
        sceneId: command.payload.sceneId,
        text: command.payload.text
      };
    case "clip.move":
      if (!("start" in command.payload)) {
        throw new Error(
          "Invalid planned command: clip.move requires an absolute start."
        );
      }

      return {
        clipId: command.payload.clipId,
        start: command.payload.start
      };
    case "clip.trim":
      return {
        clipId: command.payload.clipId,
        duration: command.payload.duration
      };
    case "clip.split":
      return {
        clipId: command.payload.clipId,
        splitAt: command.payload.splitAt
      };
    case "clip.delete":
      return {
        clipId: command.payload.clipId
      };
  }
}

function assertExecutablePlannedCommand(
  command: PlannedCommand
): asserts command is PlannedCommand {
  if (!isRecord(command)) {
    throw new Error("Invalid planned command: command must be an object.");
  }

  if (command.schemaVersion !== PLANNED_COMMAND_SCHEMA_VERSION) {
    throw new Error(
      `Invalid planned command: schemaVersion must be ${PLANNED_COMMAND_SCHEMA_VERSION}.`
    );
  }

  if (!isExecutableCommandType(command.type)) {
    throw new Error("Invalid planned command: unsupported command type.");
  }

  if (!isRecord(command.payload)) {
    throw new Error("Invalid planned command: payload must be an object.");
  }

  cloneExecutablePayload(command);
}

function isExecutableCommandType(value: unknown): value is PlannedCommand["type"] {
  return (
    value === "scene.replace" ||
    value === "clip.move" ||
    value === "clip.trim" ||
    value === "clip.split" ||
    value === "clip.delete"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatRejectedCommand(
  command: PlannedCommand,
  errors: readonly { code: string; message: string }[]
): string {
  const details = errors
    .map((error) => `${error.code}: ${error.message}`)
    .join("; ");

  return details.length > 0
    ? `Planned command rejected by core executor for ${command.type}: ${details}`
    : `Planned command rejected by core executor for ${command.type}.`;
}
