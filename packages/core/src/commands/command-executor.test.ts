import { describe, expect, it } from "vitest";
import type { CommandEnvelope } from "../models/index.js";
import {
  calculateProjectHash,
  createProject
} from "../project/index.js";
import { executeCommand } from "./command-executor.js";
import type { CommandRegistry } from "./command-types.js";

const project = createProject({
  projectId: "project_001",
  name: "Test Project",
  createdAt: "2026-06-14T00:00:00.000Z"
});

const command: CommandEnvelope = {
  schemaVersion: "0.1",
  commandId: "cmd_001",
  type: "scene.replace",
  projectId: "project_001",
  source: "test",
  createdAt: "2026-06-14T00:00:01.000Z",
  payload: {
    sceneId: "scene_001",
    text: "Replacement text."
  }
};

describe("executeCommand", () => {
  it("returns a structured error when handler is missing", () => {
    const execution = executeCommand(project, command, {});

    expect(execution.project).toBe(project);
    expect(execution.result.status).toBe("rejected");
    expect(execution.result.errors).toEqual([
      {
        code: "COMMAND_HANDLER_NOT_FOUND",
        message: "No command handler registered for scene.replace."
      }
    ]);
  });

  it("returns a structured error when handler throws", () => {
    const registry: CommandRegistry = {
      "scene.replace": () => {
        throw new Error("handler exploded");
      }
    };

    const execution = executeCommand(project, command, registry);

    expect(execution.project).toBe(project);
    expect(execution.result.status).toBe("rejected");
    expect(execution.result.errors).toEqual([
      {
        code: "COMMAND_HANDLER_FAILED",
        message: "handler exploded"
      }
    ]);
  });

  it("returns handler success output", () => {
    const registry: CommandRegistry = {
      "scene.replace": (context) => ({
        project: {
          ...project,
          name: "Updated Project"
        },
        result: {
          commandId: context.command.commandId,
          status: "applied",
          projectId: context.command.projectId,
          diff: {
            added: [],
            updated: [],
            removed: []
          },
          warnings: [],
          errors: [],
          projectHashBefore: context.project.metadata.contentHash,
          projectHashAfter: context.project.metadata.contentHash
        }
      })
    };

    const execution = executeCommand(project, command, registry);

    expect(execution.project.name).toBe("Updated Project");
    expect(execution.result.status).toBe("applied");
    expect(execution.result.commandId).toBe("cmd_001");
  });

  it("increments commandCount for applied command", () => {
    const execution = executeCommand(project, command, createAppliedRegistry());

    expect(execution.project.metadata.commandCount).toBe(1);
  });

  it("sets lastCommandId for applied command", () => {
    const execution = executeCommand(project, command, createAppliedRegistry());

    expect(execution.project.metadata.lastCommandId).toBe("cmd_001");
  });

  it("recalculates contentHash for applied command", () => {
    const execution = executeCommand(project, command, createAppliedRegistry());

    expect(execution.project.metadata.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(execution.project.metadata.contentHash).toBe(
      calculateProjectHash(execution.project)
    );
    expect(execution.result.projectHashAfter).toBe(
      execution.project.metadata.contentHash
    );
  });

  it("does not update metadata for dry-run command", () => {
    const dryRunCommand: CommandEnvelope = {
      ...command,
      dryRun: true
    };
    const registry: CommandRegistry = {
      "scene.replace": (context) => ({
        project: {
          ...project,
          name: "Dry Run Project"
        },
        result: {
          commandId: context.command.commandId,
          status: "dry-run",
          projectId: context.command.projectId,
          diff: {
            added: [],
            updated: [],
            removed: []
          },
          warnings: [],
          errors: [],
          projectHashBefore: context.project.metadata.contentHash
        }
      })
    };

    const execution = executeCommand(project, dryRunCommand, registry);

    expect(execution.project.metadata).toEqual(project.metadata);
    expect(execution.result.projectHashAfter).toBeUndefined();
    expect(execution.journalEntry).toBeUndefined();
  });

  it("does not update metadata for rejected command", () => {
    const registry: CommandRegistry = {
      "scene.replace": (context) => ({
        project,
        result: {
          commandId: context.command.commandId,
          status: "rejected",
          projectId: context.command.projectId,
          diff: {
            added: [],
            updated: [],
            removed: []
          },
          warnings: [],
          errors: [
            {
              code: "TEST_REJECTION",
              message: "Rejected by test."
            }
          ],
          projectHashBefore: context.project.metadata.contentHash
        }
      })
    };

    const execution = executeCommand(project, command, registry);

    expect(execution.project).toBe(project);
    expect(execution.project.metadata).toEqual(project.metadata);
    expect(execution.result.projectHashAfter).toBeUndefined();
    expect(execution.journalEntry).toBeUndefined();
  });

  it("does not mutate the original project", () => {
    const originalMetadata = project.metadata;
    const execution = executeCommand(project, command, createAppliedRegistry());

    expect(project.metadata).toBe(originalMetadata);
    expect(project.metadata.commandCount).toBe(0);
    expect(project.metadata.lastCommandId).toBeUndefined();
    expect(project.metadata.contentHash).toBe("");
    expect(execution.project).not.toBe(project);
    expect(execution.project.metadata).not.toBe(originalMetadata);
  });

  it("returns journal entry for applied command", () => {
    const execution = executeCommand(project, command, createAppliedRegistry());

    expect(execution.journalEntry).toMatchObject({
      logVersion: "0.1",
      sequence: 1,
      writtenAt: command.createdAt,
      command,
      result: execution.result,
      replay: {
        hashAlgorithm: "sha256",
        commandSchemaVersion: "0.1",
        projectSchemaVersion: "0.1"
      }
    });
  });

  it("increments journal sequence from project commandCount", () => {
    const projectWithHistory = {
      ...project,
      metadata: {
        ...project.metadata,
        commandCount: 4
      }
    };
    const execution = executeCommand(
      projectWithHistory,
      command,
      createAppliedRegistry(projectWithHistory)
    );

    expect(execution.journalEntry?.sequence).toBe(5);
  });

  it("stores final project hashes in journal entry", () => {
    const execution = executeCommand(project, command, createAppliedRegistry());

    expect(execution.journalEntry?.projectHashBefore).toBe(
      execution.result.projectHashBefore
    );
    expect(execution.journalEntry?.projectHashAfter).toBe(
      execution.result.projectHashAfter
    );
    expect(execution.journalEntry?.projectHashAfter).toBe(
      execution.project.metadata.contentHash
    );
  });

  it("does not return journal entry for dry-run command", () => {
    const dryRunCommand: CommandEnvelope = {
      ...command,
      dryRun: true
    };
    const registry: CommandRegistry = {
      "scene.replace": (context) => ({
        project,
        result: {
          commandId: context.command.commandId,
          status: "dry-run",
          projectId: context.command.projectId,
          diff: {
            added: [],
            updated: [],
            removed: []
          },
          warnings: [],
          errors: [],
          projectHashBefore: context.project.metadata.contentHash
        }
      })
    };
    const execution = executeCommand(project, dryRunCommand, registry);

    expect(execution.journalEntry).toBeUndefined();
  });

  it("does not return journal entry for rejected command", () => {
    const execution = executeCommand(project, command, {});

    expect(execution.result.status).toBe("rejected");
    expect(execution.journalEntry).toBeUndefined();
  });
});

function createAppliedRegistry(registryProject = project): CommandRegistry {
  return {
    "scene.replace": (context) => ({
      project: {
        ...registryProject,
        name: "Updated Project"
      },
      result: {
        commandId: context.command.commandId,
        status: "applied",
        projectId: context.command.projectId,
        diff: {
          added: [],
          updated: [],
          removed: []
        },
        warnings: [],
        errors: [],
        projectHashBefore: context.project.metadata.contentHash,
        projectHashAfter: context.project.metadata.contentHash
      }
    })
  };
}
