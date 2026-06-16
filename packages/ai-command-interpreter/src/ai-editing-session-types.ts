import type { Project } from "@aide/core";
import type { DryRunResult } from "./dry-run-types.js";
import type { ExecutionPlanResult } from "./executor-bridge-types.js";
import type { EditingIntent } from "./intent-types.js";
import type { PlannedCommand } from "./planner-types.js";
import type { ResolvedIntent } from "./resolver-types.js";

export interface AIEditingSessionResult {
  intents: EditingIntent[];
  resolvedIntents: ResolvedIntent[];
  plannedCommands: PlannedCommand[];
  dryRun: DryRunResult;
  executionResult: ExecutionPlanResult;
  project: Project;
}
