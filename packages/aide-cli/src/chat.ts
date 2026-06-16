import {
  createProjectSnapshot,
  deserializeProject,
  serializeProject,
  type Project
} from "@aide/core";
import {
  editProject,
  planEditingIntent,
  resolveContextReference,
  resolveEditingIntent,
  undoEditingSession,
  updateConversationContext,
  type ConversationContext,
  type EditingIntent,
  type EditingSessionResult,
  type ResolvedIntent
} from "@aide/ai-command-interpreter";
import type { AideCliEnvironment } from "./cli.js";

export interface AideChatEnvironment extends AideCliEnvironment {
  readLine(prompt: string): Promise<string | undefined>;
}

interface ChatUndoEntry {
  session: EditingSessionResult;
  contextBefore: ConversationContext;
}

const CHAT_ROLLBACK_CREATED_AT = "1970-01-01T00:00:00.000Z";

export async function runChatSession(
  projectFile: string,
  environment: AideChatEnvironment
): Promise<number> {
  if (!projectFile) {
    environment.stderr("Usage: aide chat <project-file>\n");
    return 1;
  }

  let project = deserializeProject(await environment.readTextFile(projectFile));
  let context: ConversationContext = {};
  const undoStack: ChatUndoEntry[] = [];

  environment.stdout("AIDE chat started. Type exit or quit to leave.\n");

  while (true) {
    const input = await environment.readLine("aide> ");

    if (input === undefined) {
      environment.stdout("Goodbye.\n");
      return 0;
    }

    const request = input.trim();

    if (request.length === 0) {
      continue;
    }

    if (isExitCommand(request)) {
      environment.stdout("Goodbye.\n");
      return 0;
    }

    if (request.toLowerCase() === "undo") {
      const undo = undoStack.pop();

      if (!undo) {
        environment.stdout("Nothing to undo.\n");
        continue;
      }

      const undoResult = undoEditingSession(undo.session);
      project = undoResult.restoredProject;
      context = undo.contextBefore;
      await saveProject(projectFile, project, environment);
      environment.stdout("Undo applied.\n");
      continue;
    }

    const resolvedRequest = resolveContextReference(context, request);
    const rollbackSnapshot = createProjectSnapshot(
      project.metadata.commandCount,
      project,
      CHAT_ROLLBACK_CREATED_AT
    );
    const result = await editProject({
      project,
      request: resolvedRequest
    });
    const session = createSessionResult(project, result, rollbackSnapshot);
    const nextContext = updateConversationContext(context, session);

    undoStack.push({
      session,
      contextBefore: context
    });
    project = result.updatedProject;
    context = nextContext;

    environment.stdout(formatChatEditResult(result));
    await saveProject(projectFile, project, environment);
  }
}

function createSessionResult(
  previousProject: Project,
  result: Awaited<ReturnType<typeof editProject>>,
  rollbackSnapshot: EditingSessionResult["rollbackSnapshot"]
): EditingSessionResult {
  const resolvedIntents = Object.freeze(
    result.intents.map((intent) =>
      resolveEditingIntent(previousProject, intent as EditingIntent)
    )
  ) as ResolvedIntent[];
  const plannedCommands = Object.freeze(
    resolvedIntents.flatMap((intent) =>
      planEditingIntent(intent as unknown as EditingIntent)
    )
  ) as EditingSessionResult["plannedCommands"];

  return {
    intents: result.intents as EditingIntent[],
    resolvedIntents,
    plannedCommands,
    dryRun: result.dryRun,
    project: result.updatedProject,
    rollbackSnapshot
  };
}

async function saveProject(
  projectFile: string,
  project: Project,
  environment: AideChatEnvironment
): Promise<void> {
  await environment.writeTextFile(projectFile, serializeProject(project));
}

function formatChatEditResult(
  result: Awaited<ReturnType<typeof editProject>>
): string {
  const dryRunSummary =
    result.dryRun.summary.length > 0
      ? result.dryRun.summary.map((item) => `- ${item}`).join("\n")
      : "(none)";

  return [
    `Confidence: ${result.confidence}`,
    `Requires clarification: ${result.requiresClarification}`,
    "Dry run summary:",
    dryRunSummary,
    ""
  ].join("\n");
}

function isExitCommand(request: string): boolean {
  const normalized = request.toLowerCase();

  return normalized === "exit" || normalized === "quit";
}
