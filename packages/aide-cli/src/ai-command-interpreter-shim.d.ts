declare module "@aide/ai-command-interpreter" {
  import type { Project, ProjectSnapshot } from "@aide/core";

  export interface EditingIntent {
    schemaVersion: string;
    type: string;
    payload: Record<string, unknown>;
  }

  export interface ResolvedIntent {
    schemaVersion: string;
    type: string;
    payload: Record<string, unknown>;
  }

  export interface PlannedCommand {
    schemaVersion: string;
    type: string;
    payload: Record<string, unknown>;
  }

  export interface ConversationContext {
    lastIntent?: EditingIntent;
    lastResolvedIntent?: ResolvedIntent;
    lastPlannedCommands?: readonly PlannedCommand[];
    lastProjectId?: string;
  }

  export interface EditingSessionResult {
    intents: EditingIntent[];
    resolvedIntents: ResolvedIntent[];
    plannedCommands: PlannedCommand[];
    dryRun: {
      summary: readonly string[];
    };
    project: Project;
    rollbackSnapshot?: ProjectSnapshot;
  }

  export interface EditProjectInput {
    project: Project;
    request: string;
    provider?: unknown;
  }

  export interface EditProjectResult {
    updatedProject: Project;
    intents: EditingIntent[];
    confidence: number;
    requiresClarification: boolean;
    ambiguityReasons: readonly string[];
    dryRun: {
      summary: readonly string[];
    };
  }

  export function editProject(
    input: EditProjectInput
  ): Promise<EditProjectResult>;

  export function resolveContextReference(
    context: ConversationContext,
    request: string
  ): string;

  export function updateConversationContext(
    context: ConversationContext,
    session: EditingSessionResult
  ): ConversationContext;

  export function resolveEditingIntent(
    project: Project,
    intent: EditingIntent
  ): ResolvedIntent;

  export function planEditingIntent(intent: EditingIntent): PlannedCommand[];

  export function undoEditingSession(session: EditingSessionResult): {
    restoredProject: Project;
    restored: boolean;
  };
}
