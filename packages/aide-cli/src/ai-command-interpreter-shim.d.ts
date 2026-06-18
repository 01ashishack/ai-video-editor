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

  export interface LLMProvider {
    generate(request: { prompt: string }): Promise<{ content: string }>;
  }

  export interface IntentConfidenceResult {
    confidence: number;
    ambiguityReasons: readonly string[];
    requiresClarification: boolean;
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

  export interface AIEditingSessionResult {
    intents: EditingIntent[];
    resolvedIntents: ResolvedIntent[];
    plannedCommands: PlannedCommand[];
    dryRun: {
      commands?: readonly PlannedCommand[];
      summary: readonly string[];
      commandCount?: number;
    };
    executionResult: {
      project: Project;
      executedCommandCount: number;
    };
    project: Project;
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

  export class OpenAIProvider implements LLMProvider {
    constructor(options: { apiKey: string; model: string });
    generate(request: { prompt: string }): Promise<{ content: string }>;
  }

  export function runAIEditingSession(
    project: Project,
    request: string,
    provider?: LLMProvider
  ): Promise<AIEditingSessionResult>;

  export function analyzeIntentConfidence(
    intent: unknown
  ): IntentConfidenceResult;

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
