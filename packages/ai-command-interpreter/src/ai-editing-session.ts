import type { Project } from "@aide/core";
import { createDryRunPreview } from "./dry-run.js";
import { executePlannedCommands } from "./executor-bridge.js";
import type { AIEditingSessionResult } from "./ai-editing-session-types.js";
import { orchestrateEditingRequest } from "./ai-orchestrator.js";
import type { EditingIntent } from "./intent-types.js";
import type { LLMProvider } from "./llm-provider-types.js";
import { planEditingIntent } from "./planner.js";
import type { PlannedCommand } from "./planner-types.js";
import { resolveEditingIntent } from "./resolver.js";
import type { ResolvedIntent } from "./resolver-types.js";

export async function runAIEditingSession(
  project: Project,
  request: string,
  provider?: LLMProvider
): Promise<AIEditingSessionResult> {
  const intents = await orchestrateEditingRequest(request, provider);
  const resolvedIntents = Object.freeze(
    intents.map((intent) => resolveEditingIntent(project, intent))
  ) as ResolvedIntent[];
  const plannedCommands = Object.freeze(
    resolvedIntents.flatMap((intent) =>
      planEditingIntent(intent as unknown as EditingIntent)
    )
  ) as PlannedCommand[];
  const dryRun = createDryRunPreview(plannedCommands);
  const executionResult = executePlannedCommands(project, plannedCommands);

  return {
    intents,
    resolvedIntents,
    plannedCommands,
    dryRun,
    executionResult,
    project: executionResult.project
  };
}
