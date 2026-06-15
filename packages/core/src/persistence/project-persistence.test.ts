import { describe, expect, it } from "vitest";
import type {
  CommandEnvelope,
  CommandLogEntry,
  CommandResult,
  Project
} from "../index.js";
import {
  createCommandLogEntry,
  deserializeJournal,
  serializeJournal
} from "../journal/index.js";
import {
  createProject,
  deserializeProject,
  serializeProject
} from "../project/index.js";
import { loadProject, saveProject } from "./project-persistence.js";

function createTestProject(): Project {
  return {
    ...createProject({
      projectId: "project_001",
      name: "Test Project",
      createdAt: "2026-06-14T00:00:00.000Z"
    }),
    scenes: [
      {
        id: "scene_001",
        order: 1,
        source: "manual" as const,
        title: "Opening",
        text: "Opening scene text.",
        keywords: ["opening"],
        sourceRefs: [],
        status: "unassigned" as const,
        constraints: {}
      }
    ]
  };
}

function createCommand(commandId: string): CommandEnvelope {
  return {
    schemaVersion: "0.1",
    commandId,
    type: "scene.replace",
    projectId: "project_001",
    source: "test",
    createdAt: "2026-06-14T00:00:01.000Z",
    payload: {
      sceneId: "scene_001",
      text: `Replacement text for ${commandId}.`
    }
  };
}

function createResult(commandId: string): CommandResult {
  return {
    commandId,
    status: "applied",
    projectId: "project_001",
    diff: {
      added: [],
      updated: [
        {
          path: "/scenes/scene_001",
          entityType: "Scene",
          entityId: "scene_001"
        }
      ],
      removed: []
    },
    warnings: [],
    errors: [],
    projectHashBefore: `${commandId}_before`,
    projectHashAfter: `${commandId}_after`
  };
}

function createEntry(sequence: number): CommandLogEntry {
  const commandId = `cmd_${String(sequence).padStart(3, "0")}`;

  return createCommandLogEntry(
    sequence,
    createCommand(commandId),
    createResult(commandId),
    `2026-06-14T00:00:0${sequence}.000Z`
  );
}

describe("project persistence", () => {
  it("saves serialized project", () => {
    const project = createTestProject();
    const persisted = saveProject(project, []);

    expect(persisted.project).toBe(serializeProject(project));
  });

  it("saves serialized journal", () => {
    const entries = [createEntry(1), createEntry(2)];
    const persisted = saveProject(createTestProject(), entries);

    expect(persisted.journal).toBe(serializeJournal(entries));
  });

  it("loads project", () => {
    const project = createTestProject();
    const loaded = loadProject({
      project: serializeProject(project),
      journal: serializeJournal([])
    });

    expect(loaded.project).toEqual(project);
  });

  it("loads journal", () => {
    const entries = [createEntry(1), createEntry(2)];
    const loaded = loadProject({
      project: serializeProject(createTestProject()),
      journal: serializeJournal(entries)
    });

    expect(loaded.journalEntries).toEqual(entries);
  });

  it("round-trips project", () => {
    const project = createTestProject();
    const persisted = saveProject(project, []);
    const loadedProject = deserializeProject(persisted.project);

    expect(loadedProject).toEqual(project);
  });

  it("round-trips journal", () => {
    const entries = [createEntry(1), createEntry(2)];
    const persisted = saveProject(createTestProject(), entries);
    const loadedEntries = deserializeJournal(persisted.journal);

    expect(loadedEntries).toEqual(entries);
  });

  it("round-trips project and journal", () => {
    const project = createTestProject();
    const entries = [createEntry(1), createEntry(2)];
    const persisted = saveProject(project, entries);
    const loaded = loadProject(persisted);

    expect(loaded.project).toEqual(project);
    expect(loaded.journalEntries).toEqual(entries);
  });

  it("round-trips empty journal", () => {
    const project = createTestProject();
    const persisted = saveProject(project, []);
    const loaded = loadProject(persisted);

    expect(persisted.journal).toBe("\n");
    expect(loaded.journalEntries).toEqual([]);
  });

  it("saves deterministically", () => {
    const project = createTestProject();
    const entries = [createEntry(1), createEntry(2)];

    expect(saveProject(project, entries)).toEqual(saveProject(project, entries));
  });

  it("does not mutate inputs", () => {
    const project = createTestProject();
    const entries = [createEntry(1), createEntry(2)];
    const originalProject = structuredClone(project);
    const originalEntries = structuredClone(entries);
    const originalFirstEntry = entries[0];

    saveProject(project, entries);

    expect(project).toEqual(originalProject);
    expect(entries).toEqual(originalEntries);
    expect(entries[0]).toBe(originalFirstEntry);
  });
});
