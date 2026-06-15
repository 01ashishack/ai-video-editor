import { describe, expect, it } from "vitest";
import {
  executeCommand,
  sceneReplaceCommandHandler
} from "../commands/index.js";
import type { CommandRegistry } from "../commands/index.js";
import { createCommandLogEntry } from "../journal/index.js";
import type { CommandEnvelope, CommandLogEntry } from "../models/index.js";
import { buildProjectFromSrt } from "../project/index.js";
import type { Project } from "../project/index.js";
import type { SrtDocument } from "../srt/index.js";
import { verifyReplay } from "./replay-verifier.js";

const registry: CommandRegistry = {
  "scene.replace": sceneReplaceCommandHandler
};

const document: SrtDocument = {
  cues: [
    {
      index: 1,
      start: 0,
      end: 2500,
      rawText: "The city wakes before sunrise."
    },
    {
      index: 2,
      start: 3000,
      end: 5250,
      rawText: "Workers arrive at the old textile mill."
    }
  ]
};

function createInitialProject(): Project {
  return buildProjectFromSrt(document, {
    projectId: "project_001",
    name: "Test Project",
    createdAt: "2026-06-14T00:00:00.000Z",
    sourceId: "source_srt_001",
    sourceUri: "test.srt"
  });
}

function createSceneReplaceCommand(
  commandId: string,
  sceneId: string,
  text: string
): CommandEnvelope {
  return {
    schemaVersion: "0.1",
    commandId,
    type: "scene.replace",
    projectId: "project_001",
    source: "test",
    createdAt: "2026-06-14T00:00:01.000Z",
    payload: {
      sceneId,
      text
    }
  };
}

function createValidEntries(
  initialProject: Project,
  commands: CommandEnvelope[]
): CommandLogEntry[] {
  let project = initialProject;

  return commands.map((command, index) => {
    const execution = executeCommand(project, command, registry);
    project = execution.project;

    return createCommandLogEntry(
      index + 1,
      command,
      execution.result,
      command.createdAt
    );
  });
}

describe("verifyReplay", () => {
  it("passes valid replay", () => {
    const project = createInitialProject();
    const entries = createValidEntries(project, [
      createSceneReplaceCommand(
        "cmd_001",
        "scene_001",
        "A new opening narration line."
      )
    ]);

    expect(verifyReplay(project, entries, registry)).toEqual({
      valid: true,
      appliedCommands: 1,
      errors: []
    });
  });

  it("detects projectHashBefore mismatch", () => {
    const project = createInitialProject();
    const entries = createValidEntries(project, [
      createSceneReplaceCommand(
        "cmd_001",
        "scene_001",
        "A new opening narration line."
      )
    ]);
    const invalidEntries = [
      {
        ...entries[0]!,
        projectHashBefore: "wrong_before_hash"
      }
    ];

    const result = verifyReplay(project, invalidEntries, registry);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      "Sequence 1: projectHashBefore mismatch. Expected wrong_before_hash, got ."
    ]);
  });

  it("detects projectHashAfter mismatch", () => {
    const project = createInitialProject();
    const entries = createValidEntries(project, [
      createSceneReplaceCommand(
        "cmd_001",
        "scene_001",
        "A new opening narration line."
      )
    ]);
    const invalidEntries = [
      {
        ...entries[0]!,
        projectHashAfter: "wrong_after_hash"
      }
    ];

    const result = verifyReplay(project, invalidEntries, registry);

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(
      /^Sequence 1: projectHashAfter mismatch\. Expected wrong_after_hash, got [a-f0-9]{64}\.$/
    );
  });

  it("collects multiple errors", () => {
    const project = createInitialProject();
    const entries = createValidEntries(project, [
      createSceneReplaceCommand(
        "cmd_001",
        "scene_001",
        "A new opening narration line."
      ),
      createSceneReplaceCommand("cmd_002", "scene_002", "The mill comes alive.")
    ]);
    const invalidEntries = [
      {
        ...entries[0]!,
        projectHashBefore: "wrong_before_hash"
      },
      {
        ...entries[1]!,
        projectHashAfter: "wrong_after_hash"
      }
    ];

    const result = verifyReplay(project, invalidEntries, registry);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]).toContain("projectHashBefore mismatch");
    expect(result.errors[1]).toContain("projectHashAfter mismatch");
  });

  it("continues processing commands after mismatch", () => {
    const project = createInitialProject();
    const entries = createValidEntries(project, [
      createSceneReplaceCommand(
        "cmd_001",
        "scene_001",
        "A new opening narration line."
      ),
      createSceneReplaceCommand("cmd_002", "scene_002", "The mill comes alive.")
    ]);
    const invalidEntries = [
      {
        ...entries[0]!,
        projectHashBefore: "wrong_before_hash"
      },
      entries[1]!
    ];

    const result = verifyReplay(project, invalidEntries, registry);

    expect(result.valid).toBe(false);
    expect(result.appliedCommands).toBe(2);
    expect(result.errors).toHaveLength(1);
  });
});
