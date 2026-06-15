import { describe, expect, it } from "vitest";
import { buildProjectFromSrt } from "../project/index.js";
import type { SrtDocument } from "../srt/index.js";
import { buildTimelineFromScenes } from "./timeline-builder.js";

const document: SrtDocument = {
  cues: [
    {
      index: 2,
      start: 3000,
      end: 5250,
      rawText: "Workers arrive at the old textile mill."
    },
    {
      index: 1,
      start: 0,
      end: 2500,
      rawText: "The city wakes before sunrise."
    }
  ]
};

function createProject() {
  return buildProjectFromSrt(document, {
    projectId: "project_001",
    name: "Test Project",
    createdAt: "2026-06-14T00:00:00.000Z",
    sourceId: "source_srt_001",
    sourceUri: "test.srt"
  });
}

describe("buildTimelineFromScenes", () => {
  it("creates one clip for one scene", () => {
    const project = createProject();
    const nextProject = buildTimelineFromScenes({
      ...project,
      scenes: [project.scenes[0]!]
    });

    expect(nextProject.timeline.tracks).toHaveLength(1);
    expect(nextProject.timeline.tracks[0]?.role).toBe("primary-video");
    expect(nextProject.timeline.tracks[0]?.clips).toHaveLength(1);
  });

  it("links clip to scene", () => {
    const project = createProject();
    const nextProject = buildTimelineFromScenes(project);

    expect(nextProject.timeline.tracks[0]?.clips[0]?.sceneId).toBe("scene_001");
  });

  it("orders clips by scene order", () => {
    const project = createProject();
    const nextProject = buildTimelineFromScenes(project);

    expect(nextProject.timeline.tracks[0]?.clips.map((clip) => clip.sceneId)).toEqual([
      "scene_001",
      "scene_002"
    ]);
    expect(
      nextProject.timeline.tracks[0]?.clips.map((clip) => clip.timelineRange.start)
    ).toEqual([0, 2250]);
  });

  it("does not mutate the original project", () => {
    const project = createProject();
    const originalTimeline = project.timeline;
    const nextProject = buildTimelineFromScenes(project);

    expect(project.timeline).toBe(originalTimeline);
    expect(project.timeline.tracks).toEqual([]);
    expect(nextProject).not.toBe(project);
    expect(nextProject.timeline).not.toBe(originalTimeline);
  });
});
