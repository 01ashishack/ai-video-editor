import { describe, expect, it } from "vitest";
import type {
  CommandEnvelope,
  CommandLogEntry,
  CommandResult
} from "../index.js";
import { createCommandLogEntry } from "./journal-builder.js";
import { deserializeJournal, serializeJournal } from "./journal-store.js";

function createCommand(commandId: string): CommandEnvelope {
  return {
    schemaVersion: "0.1",
    commandId,
    type: "scene.replace",
    projectId: "project_001",
    source: "test",
    createdAt: "2026-06-14T00:00:00.000Z",
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

describe("journal store", () => {
  it("serializes single entry", () => {
    const entry = createEntry(1);
    const serialized = serializeJournal([entry]);
    const lines = serialized.trimEnd().split("\n");

    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]!)).toEqual(entry);
  });

  it("serializes multiple entries", () => {
    const entries = [createEntry(1), createEntry(2)];
    const serialized = serializeJournal(entries);
    const lines = serialized.trimEnd().split("\n");

    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]!).sequence).toBe(1);
    expect(JSON.parse(lines[1]!).sequence).toBe(2);
  });

  it("ends serialized journal with newline", () => {
    expect(serializeJournal([createEntry(1)]).endsWith("\n")).toBe(true);
  });

  it("deserializes single entry", () => {
    const entry = createEntry(1);

    expect(deserializeJournal(serializeJournal([entry]))).toEqual([entry]);
  });

  it("deserializes multiple entries", () => {
    const entries = [createEntry(1), createEntry(2)];

    expect(deserializeJournal(serializeJournal(entries))).toEqual(entries);
  });

  it("ignores blank lines", () => {
    const entry = createEntry(1);
    const serialized = `\n${serializeJournal([entry])}\n\n`;

    expect(deserializeJournal(serialized)).toEqual([entry]);
  });

  it("throws for invalid json line", () => {
    const entry = createEntry(1);
    const serialized = `${serializeJournal([entry])}{not-json}\n`;

    expect(() => deserializeJournal(serialized)).toThrow(
      "Invalid journal line 2."
    );
  });

  it("round-trips serialize and deserialize", () => {
    const entries = [createEntry(1), createEntry(2)];

    expect(deserializeJournal(serializeJournal(entries))).toEqual(entries);
  });

  it("serializes deterministically", () => {
    const entries = [createEntry(1), createEntry(2)];
    const clonedEntries = structuredClone(entries);

    expect(serializeJournal(entries)).toBe(serializeJournal(clonedEntries));
  });

  it("does not mutate original array", () => {
    const entries = [createEntry(1), createEntry(2)];
    const originalEntries = structuredClone(entries);
    const originalFirstEntry = entries[0];

    serializeJournal(entries);

    expect(entries).toEqual(originalEntries);
    expect(entries[0]).toBe(originalFirstEntry);
  });
});
