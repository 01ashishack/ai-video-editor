import { describe, expect, it } from "vitest";
import type { Project } from "../index.js";
import { createProject, serializeProject } from "../project/index.js";
import {
  createProjectSnapshot,
  restoreProjectSnapshot
} from "./snapshot-builder.js";

function createTestProject(): Project {
  return {
    ...createProject({
      projectId: "project_001",
      name: "Test Project",
      createdAt: "2026-06-15T00:00:00.000Z"
    }),
    metadata: {
      commandCount: 3,
      lastCommandId: "cmd_003",
      hashAlgorithm: "sha256",
      contentHash: "project_hash_001"
    },
    scenes: [
      {
        id: "scene_001",
        order: 1,
        source: "manual",
        title: "Opening",
        text: "Opening scene text.",
        keywords: ["opening"],
        sourceRefs: [],
        status: "unassigned",
        constraints: {}
      }
    ]
  };
}

describe("snapshot builder", () => {
  it("creates snapshot", () => {
    const project = createTestProject();
    const snapshot = createProjectSnapshot(
      3,
      project,
      "2026-06-15T00:00:01.000Z"
    );

    expect(snapshot).toMatchObject({
      snapshotVersion: "0.1",
      sequence: 3,
      createdAt: "2026-06-15T00:00:01.000Z"
    });
  });

  it("stores sequence", () => {
    const snapshot = createProjectSnapshot(
      7,
      createTestProject(),
      "2026-06-15T00:00:01.000Z"
    );

    expect(snapshot.sequence).toBe(7);
  });

  it("stores hash", () => {
    const project = createTestProject();
    const snapshot = createProjectSnapshot(
      3,
      project,
      "2026-06-15T00:00:01.000Z"
    );

    expect(snapshot.projectHash).toBe("project_hash_001");
  });

  it("stores serialized project", () => {
    const project = createTestProject();
    const snapshot = createProjectSnapshot(
      3,
      project,
      "2026-06-15T00:00:01.000Z"
    );

    expect(snapshot.project).toBe(serializeProject(project));
  });

  it("restores original project", () => {
    const project = createTestProject();
    const snapshot = createProjectSnapshot(
      3,
      project,
      "2026-06-15T00:00:01.000Z"
    );

    expect(restoreProjectSnapshot(snapshot)).toEqual(project);
  });

  it("round-trips snapshot", () => {
    const project = createTestProject();
    const snapshot = createProjectSnapshot(
      3,
      project,
      "2026-06-15T00:00:01.000Z"
    );
    const restoredProject = restoreProjectSnapshot(snapshot);
    const nextSnapshot = createProjectSnapshot(
      snapshot.sequence,
      restoredProject,
      snapshot.createdAt
    );

    expect(nextSnapshot).toEqual(snapshot);
  });

  it("creates snapshots deterministically", () => {
    const project = createTestProject();

    expect(
      createProjectSnapshot(3, project, "2026-06-15T00:00:01.000Z")
    ).toEqual(
      createProjectSnapshot(3, project, "2026-06-15T00:00:01.000Z")
    );
  });

  it("does not mutate inputs", () => {
    const project = createTestProject();
    const originalProject = structuredClone(project);
    const originalTimeline = project.timeline;

    createProjectSnapshot(3, project, "2026-06-15T00:00:01.000Z");

    expect(project).toEqual(originalProject);
    expect(project.timeline).toBe(originalTimeline);
  });
});
