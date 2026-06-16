import type { EditingSessionResult } from "./editing-session-types.js";
import type { EditingIntent } from "./intent-types.js";
import type { PlannedCommand } from "./planner-types.js";
import type { ConversationContext } from "./conversation-context-types.js";
import type { ResolvedIntent } from "./resolver-types.js";

export function updateConversationContext(
  context: ConversationContext,
  session: EditingSessionResult
): ConversationContext {
  const lastIntent = session.intents.at(-1);
  const lastResolvedIntent = session.resolvedIntents.at(-1);

  return freezeConversationContext({
    lastIntent: lastIntent
      ? cloneEditingIntent(lastIntent)
      : cloneOptionalEditingIntent(context.lastIntent),
    lastResolvedIntent: lastResolvedIntent
      ? cloneResolvedIntent(lastResolvedIntent)
      : cloneOptionalResolvedIntent(context.lastResolvedIntent),
    lastPlannedCommands: clonePlannedCommands(session.plannedCommands),
    lastProjectId: session.project.id
  });
}

export function resolveContextReference(
  context: ConversationContext,
  request: string
): string {
  const reference = getLastResolvedReference(context.lastResolvedIntent);

  if (!reference) {
    return request;
  }

  return request.replace(/\bit\b/gi, reference);
}

function getLastResolvedReference(intent?: ResolvedIntent): string | undefined {
  if (!intent) {
    return undefined;
  }

  if ("clipId" in intent.payload) {
    return intent.payload.clipId;
  }

  if ("sceneId" in intent.payload) {
    return intent.payload.sceneId;
  }

  return undefined;
}

function cloneOptionalEditingIntent(
  intent: EditingIntent | undefined
): EditingIntent | undefined {
  return intent ? cloneEditingIntent(intent) : undefined;
}

function cloneOptionalResolvedIntent(
  intent: ResolvedIntent | undefined
): ResolvedIntent | undefined {
  return intent ? cloneResolvedIntent(intent) : undefined;
}

function cloneEditingIntent(intent: EditingIntent): EditingIntent {
  return freezeIntent({
    schemaVersion: intent.schemaVersion,
    type: intent.type,
    payload: {
      ...intent.payload
    }
  } as EditingIntent);
}

function cloneResolvedIntent(intent: ResolvedIntent): ResolvedIntent {
  return freezeResolvedIntent({
    schemaVersion: intent.schemaVersion,
    type: intent.type,
    payload: {
      ...intent.payload
    }
  } as ResolvedIntent);
}

function clonePlannedCommands(
  commands: readonly PlannedCommand[]
): readonly PlannedCommand[] {
  return Object.freeze(
    commands.map((command) =>
      freezePlannedCommand({
        schemaVersion: command.schemaVersion,
        type: command.type,
        payload: {
          ...command.payload
        }
      } as PlannedCommand)
    )
  );
}

function freezeConversationContext(
  context: ConversationContext
): ConversationContext {
  return Object.freeze(context);
}

function freezeIntent(intent: EditingIntent): EditingIntent {
  Object.freeze(intent.payload);
  return Object.freeze(intent);
}

function freezeResolvedIntent(intent: ResolvedIntent): ResolvedIntent {
  Object.freeze(intent.payload);
  return Object.freeze(intent);
}

function freezePlannedCommand(command: PlannedCommand): PlannedCommand {
  Object.freeze(command.payload);
  return Object.freeze(command);
}
