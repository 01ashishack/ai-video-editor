import type { ID, SceneConstraints } from "../models/index.js";

export interface SceneBuilderOptions {
  sourceId?: ID;
  maxTitleLength?: number;
  maxKeywords?: number;
  defaultStatus?: "unassigned" | "assigned" | "needs-review" | "locked";
  defaultConstraints?: Partial<SceneConstraints>;
}
