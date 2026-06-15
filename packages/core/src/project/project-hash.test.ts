import { describe, expect, it } from "vitest";
import type { Project } from "../index.js";
import { buildProjectFromSrt } from "./project-builder.js";
import {
  calculateProjectHash,
  updateProjectMetadata
} from "./project-hash.js";

function createTestProject(): Project {
  return buildProjectFromSrt(
    {
      cues: [
        {
          index: 1,
          start: 0,
          end: 2500,
          rawText: "The city wakes before sunrise."
        }
      ]
    },
    {
      projectId: "project_001",
      name: "Test Project",
      createdAt: "2026-06-14T00:00:00.000Z",
      sourceId: "source_srt_001",
      sourceUri: "test.srt"
    }
  );
}

describe("project hashing", () => {
  it("returns the same hash for the same project", () => {
    const project = createTestProject();

    expect(calculateProjectHash(project)).toBe(calculateProjectHash(project));
  });

  it("returns a different hash when scene text changes", () => {
    const project = createTestProject();
    const changedProject: Project = {
      ...project,
      scenes: [
        {
          ...project.scenes[0]!,
          text: "A new opening narration line."
        }
      ]
    };

    expect(calculateProjectHash(changedProject)).not.toBe(
      calculateProjectHash(project)
    );
  });

  it("increments commandCount during metadata update", () => {
    const project = createTestProject();
    const updatedProject = updateProjectMetadata(project);

    expect(updatedProject.metadata.commandCount).toBe(1);
  });

  it("sets lastCommandId during metadata update", () => {
    const project = createTestProject();
    const updatedProject = updateProjectMetadata(project, "cmd_001");

    expect(updatedProject.metadata.lastCommandId).toBe("cmd_001");
  });

  it("recalculates contentHash during metadata update", () => {
    const project = createTestProject();
    const updatedProject = updateProjectMetadata(project, "cmd_001");

    expect(updatedProject.metadata.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(updatedProject.metadata.contentHash).toBe(
      calculateProjectHash(updatedProject)
    );
  });

  it("does not mutate the original project", () => {
    const project = createTestProject();
    const originalMetadata = project.metadata;
    const updatedProject = updateProjectMetadata(project, "cmd_001");

    expect(project.metadata).toBe(originalMetadata);
    expect(project.metadata.commandCount).toBe(0);
    expect(project.metadata.lastCommandId).toBeUndefined();
    expect(project.metadata.contentHash).toBe("");
    expect(updatedProject).not.toBe(project);
    expect(updatedProject.metadata).not.toBe(originalMetadata);
  });
});
