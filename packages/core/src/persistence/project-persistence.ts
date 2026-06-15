import type { CommandLogEntry } from "../models/index.js";
import {
  deserializeProject,
  serializeProject,
  type Project
} from "../project/index.js";
import {
  deserializeJournal,
  serializeJournal
} from "../journal/index.js";

export interface PersistedProject {
  project: string;
  journal: string;
}

export function saveProject(
  project: Project,
  journalEntries: CommandLogEntry[]
): PersistedProject {
  return {
    project: serializeProject(project),
    journal: serializeJournal(journalEntries)
  };
}

export function loadProject(persisted: PersistedProject): {
  project: Project;
  journalEntries: CommandLogEntry[];
} {
  return {
    project: deserializeProject(persisted.project),
    journalEntries: deserializeJournal(persisted.journal)
  };
}
