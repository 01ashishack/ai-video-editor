import {
  createProjectSnapshot,
  type Project
} from "@aide/core";
import {
  runAIEditingSession,
  type EditingSessionResult
} from "@aide/ai-command-interpreter";
import {
  createAIChatPanel,
  createAIChatPanelState,
  withAIChatApplyStatus,
  type AIChatPanelState
} from "./ai-chat-panel.js";
import { createPreviewPanel } from "./preview-panel.js";
import { createProjectViewerPanel } from "./project-viewer-panel.js";
import { createTimelinePanel } from "./timeline-panel.js";
import { createApplicationPage } from "./window.js";

const APPLY_ROLLBACK_CREATED_AT = "1970-01-01T00:00:00.000Z";

export interface ApplyEditResult {
  applied: boolean;
  project: Project;
  session?: EditingSessionResult;
  message: string;
  chatState: AIChatPanelState;
  workspaceHtml: string;
}

export async function applyEdit(
  project: Project,
  request: string,
  chatState: AIChatPanelState = createAIChatPanelState()
): Promise<ApplyEditResult> {
  try {
    const rollbackSnapshot = createProjectSnapshot(
      project.metadata.commandCount,
      project,
      APPLY_ROLLBACK_CREATED_AT
    );
    const aiSession = await runAIEditingSession(
      structuredClone(project),
      request
    );
    const session: EditingSessionResult = {
      intents: aiSession.intents,
      resolvedIntents: aiSession.resolvedIntents,
      plannedCommands: aiSession.plannedCommands,
      dryRun: aiSession.dryRun,
      project: aiSession.project,
      rollbackSnapshot
    };
    const message = "Changes applied successfully.";
    const nextChatState = withAIChatApplyStatus(chatState, {
      kind: "success",
      message
    });

    return Object.freeze({
      applied: true,
      project: aiSession.project,
      session,
      message,
      chatState: nextChatState,
      workspaceHtml: createDesktopWorkspacePage(
        aiSession.project,
        nextChatState
      )
    });
  } catch (error) {
    const message = `Failed to apply changes: ${formatErrorMessage(error)}`;
    const nextChatState = withAIChatApplyStatus(chatState, {
      kind: "failure",
      message
    });
    const unchangedProject = structuredClone(project);

    return Object.freeze({
      applied: false,
      project: unchangedProject,
      message,
      chatState: nextChatState,
      workspaceHtml: createDesktopWorkspacePage(
        unchangedProject,
        nextChatState
      )
    });
  }
}

export function createDesktopWorkspacePage(
  project: Project,
  chatState: AIChatPanelState = createAIChatPanelState()
): string {
  return createApplicationPage(
    `${createProjectViewerPanel(project)}
      ${createTimelinePanel(project)}
      ${createPreviewPanel(project)}
      ${createAIChatPanel(chatState)}`
  );
}

function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown apply error";
}
