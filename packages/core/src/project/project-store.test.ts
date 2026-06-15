import { describe, expect, it } from "vitest";
import type { Project, Track } from "../index.js";
import { createProject } from "./project-factory.js";
import { deserializeProject, serializeProject } from "./project-store.js";

function createProjectWithOrderedContent(): Project {
  const project = createProject({
    projectId: "project_001",
    name: "Test Project",
    createdAt: "2026-06-14T00:00:00.000Z"
  });

  const videoTrack: Track = {
    id: "track_video_001",
    kind: "video",
    role: "primary-video",
    name: "Video 1",
    order: 1,
    clips: []
  };

  const audioTrack: Track = {
    id: "track_audio_001",
    kind: "audio",
    role: "voiceover",
    name: "Voiceover",
    order: 2,
    clips: []
  };

  return {
    ...project,
    scenes: [
      {
        id: "scene_002",
        order: 2,
        source: "manual",
        title: "Second Scene",
        text: "Second scene text.",
        keywords: ["second"],
        sourceRefs: [],
        status: "unassigned",
        constraints: {}
      },
      {
        id: "scene_001",
        order: 1,
        source: "manual",
        title: "First Scene",
        text: "First scene text.",
        keywords: ["first"],
        sourceRefs: [],
        status: "unassigned",
        constraints: {}
      }
    ],
    timeline: {
      ...project.timeline,
      tracks: [videoTrack, audioTrack]
    }
  };
}

describe("project-store", () => {
  it("round-trips serializeProject and deserializeProject", () => {
    const project = createProjectWithOrderedContent();
    const serialized = serializeProject(project);
    const deserialized = deserializeProject(serialized);

    expect(deserialized).toEqual(project);
  });

  it("serializes deterministically", () => {
    const project = createProjectWithOrderedContent();

    expect(serializeProject(project)).toBe(serializeProject(project));
  });

  it("preserves array order", () => {
    const project = createProjectWithOrderedContent();
    const deserialized = deserializeProject(serializeProject(project));

    expect(deserialized.scenes.map((scene) => scene.id)).toEqual([
      "scene_002",
      "scene_001"
    ]);
  });

  it("preserves scene order", () => {
    const project = createProjectWithOrderedContent();
    const deserialized = deserializeProject(serializeProject(project));

    expect(deserialized.scenes.map((scene) => scene.order)).toEqual([2, 1]);
  });

  it("preserves timeline order", () => {
    const project = createProjectWithOrderedContent();
    const deserialized = deserializeProject(serializeProject(project));

    expect(deserialized.timeline.tracks.map((track) => track.id)).toEqual([
      "track_video_001",
      "track_audio_001"
    ]);
  });
});
