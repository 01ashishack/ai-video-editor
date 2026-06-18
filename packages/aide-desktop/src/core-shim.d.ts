declare module "@aide/core" {
  export interface TimelineClip {
    id: string;
    sceneId?: string;
    text?: string;
    timelineRange: {
      start: number;
      duration: number;
    };
  }

  export interface Project {
    id: string;
    metadata: {
      commandCount: number;
    };
    assets: Array<{
      id: string;
      displayName: string;
      kind: "video" | "audio" | "image";
      uri: string;
    }>;
    scenes: Array<{
      id: string;
      order: number;
      title: string;
    }>;
    timeline: {
      tracks: Array<{
        id: string;
        name: string;
        kind: "video" | "audio" | "subtitle";
        order: number;
        clips: TimelineClip[];
      }>;
    };
  }

  export interface ProjectSnapshot {
    snapshotVersion: "0.1";
    sequence: number;
    createdAt: string;
    project: string;
  }

  export function createProjectSnapshot(
    sequence: number,
    project: Project,
    createdAt: string
  ): ProjectSnapshot;

  export function deserializeProject(json: string): Project;
}

declare module "@ai-documentary-editor/remotion-renderer" {
  import type { Project } from "@aide/core";

  export interface RendererComposition {
    compositionId: string;
    durationInFrames: number;
    fps: number;
    width: number;
    height: number;
    items: Array<{
      id: string;
    }>;
  }

  export function buildPreviewComposition(
    project: Project,
    options: {
      resolver: {
        resolve(assetId: string): string | undefined;
      };
      fps?: number;
      width?: number;
      height?: number;
    }
  ): RendererComposition;

  export function PreviewPlayer(props: {
    composition: RendererComposition;
    controls?: boolean;
    autoPlay?: boolean;
    loop?: boolean;
  }): unknown;
}

declare module "@aide/ai-command-interpreter" {
  import type { Project } from "@aide/core";

  export interface EditingIntent {
    schemaVersion: string;
    type: string;
    payload: Record<string, unknown>;
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

  export interface EditingSessionResult {
    intents: EditingIntent[];
    resolvedIntents: unknown[];
    plannedCommands: unknown[];
    dryRun: {
      summary: readonly string[];
    };
    project: Project;
    rollbackSnapshot?: import("@aide/core").ProjectSnapshot;
  }

  export interface AIEditingSessionResult {
    intents: EditingIntent[];
    resolvedIntents: unknown[];
    plannedCommands: unknown[];
    dryRun: {
      summary: readonly string[];
    };
    project: Project;
  }

  export function editProject(input: {
    project: Project;
    request: string;
  }): Promise<EditProjectResult>;

  export function runAIEditingSession(
    project: Project,
    request: string
  ): Promise<AIEditingSessionResult>;

  export function undoEditingSession(
    session: EditingSessionResult
  ): {
    restoredProject: Project;
    restored: boolean;
  };
}
