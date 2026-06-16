import { restoreProjectSnapshot } from "@aide/core";
import type { EditingSessionResult } from "./editing-session-types.js";
import type { UndoSessionResult } from "./session-undo-types.js";

export function undoEditingSession(
  session: EditingSessionResult
): UndoSessionResult {
  if (!session.rollbackSnapshot) {
    throw new Error("Cannot undo session: rollback snapshot missing.");
  }

  if (session.rollbackSnapshot.snapshotVersion !== "0.1") {
    throw new Error("Cannot undo session: unsupported rollback snapshot.");
  }

  return {
    restoredProject: restoreProjectSnapshot(session.rollbackSnapshot),
    restored: true
  };
}
