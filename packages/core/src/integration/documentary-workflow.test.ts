import { describe, expect, it } from "vitest";
import { executeCommand, sceneReplaceCommandHandler } from "../commands/index.js";
import type { CommandEnvelope } from "../models/index.js";
import {
  buildProjectFromSrt,
  deserializeProject,
  serializeProject,
  validateProject
} from "../project/index.js";
import { parseSrt } from "../srt/index.js";
import { buildTimelineFromScenes } from "../timeline/index.js";

describe("documentary workflow", () => {
  it("runs the MVP workflow end to end", () => {
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

    expect(validateProject(project).valid).toBe(true);

    const timelineProject = buildTimelineFromScenes(project);
    const initialClipCount =
      timelineProject.timeline.tracks[0]?.clips.length ?? 0;

    const command: CommandEnvelope = {
      schemaVersion: "0.1",
      commandId: "cmd_001",
      type: "scene.replace",
      projectId: "project_001",
      source: "test",
      createdAt: "2026-06-14T00:00:01.000Z",
      payload: {
        sceneId: "scene_001",
        text: "A new opening narration line."
      }
    };

    const execution = executeCommand(timelineProject, command, {
      "scene.replace": sceneReplaceCommandHandler
    });

    expect(execution.result.status).toBe("applied");
    expect(validateProject(execution.project).valid).toBe(true);
    expect(execution.project.scenes).toHaveLength(2);
    expect(execution.project.scenes[0]?.text).toBe(
      "A new opening narration line."
    );
    expect(execution.project.timeline.tracks[0]?.clips).toHaveLength(
      initialClipCount
    );
    expect(execution.project.timeline.tracks[0]?.clips[0]?.sceneId).toBe(
      "scene_001"
    );

    const roundTrippedProject = deserializeProject(
      serializeProject(execution.project)
    );

    expect(roundTrippedProject).toEqual(execution.project);
  });
});
