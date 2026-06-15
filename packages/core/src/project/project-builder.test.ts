import { describe, expect, it } from "vitest";
import { parseSrt } from "../srt/index.js";
import { buildProjectFromSrt } from "./project-builder.js";
import { deserializeProject, serializeProject } from "./project-store.js";

describe("buildProjectFromSrt integration", () => {
  it("builds, serializes, and deserializes a project from SRT", () => {
    const document = parseSrt(`1
00:00:00,000 --> 00:00:02,500
The city wakes before sunrise.

2
00:00:03,000 --> 00:00:05,250
Workers arrive at the old textile mill.`);

    const project = buildProjectFromSrt(document, {
      projectId: "project_001",
      name: "Test Project",
      createdAt: "2026-06-14T00:00:00.000Z",
      sourceId: "source_srt_001",
      sourceUri: "test.srt"
    });

    const deserialized = deserializeProject(serializeProject(project));

    expect(deserialized.id).toBe("project_001");
    expect(deserialized.sources).toEqual(project.sources);
    expect(deserialized.scenes).toEqual(project.scenes);
    expect(deserialized.timeline).toEqual(project.timeline);
  });
});
