import type { Project } from "@aide/core";

export interface ExecutionPlanResult {
  project: Project;
  executedCommandCount: number;
}
