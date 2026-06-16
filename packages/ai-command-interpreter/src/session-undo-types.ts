import type { Project } from "@aide/core";

export interface UndoSessionResult {
  restoredProject: Project;
  restored: boolean;
}
