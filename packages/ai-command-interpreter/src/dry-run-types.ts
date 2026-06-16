import type { PlannedCommand } from "./planner-types.js";

export interface DryRunResult {
  commands: readonly PlannedCommand[];
  summary: readonly string[];
  commandCount: number;
}
