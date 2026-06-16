import type { EditingIntent } from "./intent-types.js";
import type { PlannedCommand } from "./planner-types.js";
import type { ResolvedIntent } from "./resolver-types.js";

export interface ConversationContext {
  lastIntent?: EditingIntent;
  lastResolvedIntent?: ResolvedIntent;
  lastPlannedCommands?: readonly PlannedCommand[];
  lastProjectId?: string;
}
