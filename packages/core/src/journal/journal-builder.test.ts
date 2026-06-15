import { describe, expect, it } from "vitest";
import type { CommandEnvelope, CommandResult } from "../models/index.js";
import { createCommandLogEntry } from "./journal-builder.js";

const command: CommandEnvelope = {
  schemaVersion: "0.1",
  commandId: "cmd_001",
  type: "scene.replace",
  projectId: "project_001",
  source: "test",
  createdAt: "2026-06-14T00:00:00.000Z",
  payload: {
    sceneId: "scene_001",
    text: "Replacement text."
  }
};

const result: CommandResult = {
  commandId: "cmd_001",
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
  projectHashBefore: "before_hash",
  projectHashAfter: "after_hash"
};

describe("createCommandLogEntry", () => {
  it("creates a valid journal entry", () => {
    const entry = createCommandLogEntry(
      1,
      command,
      result,
      "2026-06-14T00:00:01.000Z"
    );

    expect(entry).toMatchObject({
      logVersion: "0.1",
      writtenAt: "2026-06-14T00:00:01.000Z",
      replay: {
        hashAlgorithm: "sha256",
        commandSchemaVersion: "0.1",
        projectSchemaVersion: "0.1"
      }
    });
  });

  it("preserves command reference data", () => {
    const entry = createCommandLogEntry(
      1,
      command,
      result,
      "2026-06-14T00:00:01.000Z"
    );

    expect(entry.command).toBe(command);
    expect(entry.command.commandId).toBe("cmd_001");
    expect(entry.command.type).toBe("scene.replace");
  });

  it("preserves result reference data", () => {
    const entry = createCommandLogEntry(
      1,
      command,
      result,
      "2026-06-14T00:00:01.000Z"
    );

    expect(entry.result).toBe(result);
    expect(entry.result.status).toBe("applied");
  });

  it("stores project hashes from result", () => {
    const entry = createCommandLogEntry(
      1,
      command,
      result,
      "2026-06-14T00:00:01.000Z"
    );

    expect(entry.projectHashBefore).toBe("before_hash");
    expect(entry.projectHashAfter).toBe("after_hash");
  });

  it("stores sequence number", () => {
    const entry = createCommandLogEntry(
      7,
      command,
      result,
      "2026-06-14T00:00:01.000Z"
    );

    expect(entry.sequence).toBe(7);
  });

  it("does not mutate inputs", () => {
    const originalCommand = structuredClone(command);
    const originalResult = structuredClone(result);

    createCommandLogEntry(1, command, result, "2026-06-14T00:00:01.000Z");

    expect(command).toEqual(originalCommand);
    expect(result).toEqual(originalResult);
  });
});
