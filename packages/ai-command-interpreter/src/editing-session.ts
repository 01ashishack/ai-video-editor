import { createProjectSnapshot, type Project } from "@aide/core";
import { createDryRunPreview } from "./dry-run.js";
import { executePlannedCommands } from "./executor-bridge.js";
import type { EditingSessionResult } from "./editing-session-types.js";
import type { EditingIntent } from "./intent-types.js";
import { parseEditingIntents } from "./multi-intent-parser.js";
import { planEditingIntent } from "./planner.js";
import type { PlannedCommand } from "./planner-types.js";
import { resolveEditingIntent } from "./resolver.js";
import type { ResolvedIntent } from "./resolver-types.js";

const SESSION_ROLLBACK_CREATED_AT = "1970-01-01T00:00:00.000Z";

export function runEditingSession(
  project: Project,
  request: string
): EditingSessionResult {
  const rollbackSnapshot = createProjectSnapshot(
    project.metadata.commandCount,
    project,
    SESSION_ROLLBACK_CREATED_AT
  );
  const intents = parseEditingIntents(request);
  const resolvedIntents = Object.freeze(
    intents.map((intent) => resolveEditingIntent(project, intent))
  ) as ResolvedIntent[];
  const plannedCommands = Object.freeze(
    resolvedIntents.flatMap((intent) =>
      planEditingIntent(intent as unknown as EditingIntent)
    )
  ) as PlannedCommand[];
  const dryRun = createDryRunPreview(plannedCommands);
  const execution = executePlannedCommands(project, plannedCommands);

  return {
    intents,
    resolvedIntents,
    plannedCommands,
    dryRun,
    project: execution.project,
    rollbackSnapshot
  };
}
