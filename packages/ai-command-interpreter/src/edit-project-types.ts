import type { Project } from "@aide/core";
import type { DryRunResult } from "./dry-run-types.js";
import type { ExecutionPlanResult } from "./executor-bridge-types.js";
import type { EditingIntent } from "./intent-types.js";
import type { LLMProvider } from "./llm-provider-types.js";

export interface EditProjectInput {
  project: Project;
  request: string;
  provider?: LLMProvider;
}

export interface EditProjectResult {
  updatedProject: Project;
  intents: EditingIntent[];
  confidence: number;
  requiresClarification: boolean;
  ambiguityReasons: readonly string[];
  dryRun: DryRunResult;
  executionResult: ExecutionPlanResult;
}
