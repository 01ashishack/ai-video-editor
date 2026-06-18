import {
  createProject,
  serializeProject,
  type Project,
  type Scene,
  type TimelineClip,
  type Track
} from "@aide/core";
import { describe, expect, it } from "vitest";
import { runAideCli, type AideCliEnvironment } from "./cli.js";
import {
  formatTimelineVisualization,
  showTimelineFile
} from "./timeline-visualizer.js";

function createTimelineProject(): Project {
  const scenes: Scene[] = [
    createScene("scene_intro", 1, "Intro"),
    createScene("scene_middle", 2, "Middle")
  ];
  const videoTrack: Track = {
    id: "track_video",
    kind: "video",
    role: "primary-video",
    name: "Video",
    order: 1,
    clips: [
      createClip("clip_intro", "track_video", "scene_intro", 0, 5000, "video"),
      createClip("clip_broll", "track_video", "scene_middle", 5000, 5000, "video")
    ]
  };
  const audioTrack: Track = {
    id: "track_audio",
    kind: "audio",
    role: "voiceover",
    name: "Narration",
    order: 2,
    clips: [
      createClip("clip_narration", "track_audio", "scene_intro", 0, 10000, "audio")
    ]
  };

  return {
    ...createProject({
      projectId: "documentary_001",
      name: "Timeline Project",
      createdAt: "2026-06-16T00:00:00.000Z"
    }),
    scenes,
    timeline: {
      id: "documentary_001_timeline",
      tracks: [audioTrack, videoTrack],
      transitions: [],
      markers: []
    }
  };
}

function createScene(id: string, order: number, title: string): Scene {
  return {
    id,
    order,
    source: "manual",
    title,
    text: title,
    keywords: [],
    sourceRefs: [],
    status: "assigned",
    constraints: {}
  };
}

function createClip(
  id: string,
  trackId: string,
  sceneId: string,
  start: number,
  duration: number,
  mediaType: "video" | "audio"
): TimelineClip {
  return {
    id,
    trackId,
    sceneId,
    mediaType,
    role: mediaType === "audio" ? "voiceover" : "primary-visual",
    timelineRange: {
      start,
      duration
    },
    enabled: true,
    locked: false,
    links: [],
    render: {}
  };
}

describe("timeline visualizer", () => {
  it("prints a valid timeline visualization", async () => {
    const projectFile = "project.json";
    const files = new Map([[projectFile, serializeProject(createTimelineProject())]]);
    const output: string[] = [];
    const errors: string[] = [];
    const exitCode = await showTimelineFile(
      projectFile,
      createTestEnvironment(files, output, errors)
    );

    expect(exitCode).toBe(0);
    expect(output.join("")).toBe(`Project: documentary_001
Total duration: 10s

Scene 1: Intro (scene_intro)
Video Track: Video (track_video)
[clip_intro] 0s ───── 5s

Audio Track: Narration (track_audio)
[clip_narration] 0s ────────── 10s

Scene 2: Middle (scene_middle)
Video Track: Video (track_video)
[clip_broll] 5s ───── 10s
`);
    expect(errors).toEqual([]);
  });

  it("prints an empty project", () => {
    const project = createProject({
      projectId: "project_empty",
      name: "Empty Project",
      createdAt: "2026-06-16T00:00:00.000Z"
    });

    expect(formatTimelineVisualization(project)).toBe(`Project: project_empty
Total duration: 0s

Timeline: (empty)
`);
  });

  it("prints multiple scenes in scene order", () => {
    const output = formatTimelineVisualization(createTimelineProject());

    expect(output.indexOf("Scene 1: Intro")).toBeLessThan(
      output.indexOf("Scene 2: Middle")
    );
    expect(output).toContain("[clip_intro] 0s ───── 5s");
    expect(output).toContain("[clip_broll] 5s ───── 10s");
  });

  it("produces deterministic output", () => {
    const project = createTimelineProject();

    expect(formatTimelineVisualization(project)).toBe(
      formatTimelineVisualization(project)
    );
  });

  it("does not mutate the project or project file", async () => {
    const project = createTimelineProject();
    const originalProject = structuredClone(project);
    const projectFile = "project.json";
    const serializedProject = serializeProject(project);
    const files = new Map([[projectFile, serializedProject]]);

    await showTimelineFile(projectFile, createTestEnvironment(files, [], []));

    expect(project).toEqual(originalProject);
    expect(files.get(projectFile)).toBe(serializedProject);
  });

  it("wires the CLI timeline command", async () => {
    const projectFile = "project.json";
    const files = new Map([[projectFile, serializeProject(createTimelineProject())]]);
    const output: string[] = [];
    const errors: string[] = [];
    const exitCode = await runAideCli(
      ["timeline", projectFile],
      createTestEnvironment(files, output, errors)
    );

    expect(exitCode).toBe(0);
    expect(output.join("")).toContain("Project: documentary_001");
    expect(output.join("")).toContain("Total duration: 10s");
    expect(output.join("")).toContain("Video Track: Video (track_video)");
    expect(errors).toEqual([]);
  });
});

function createTestEnvironment(
  files: Map<string, string>,
  output: string[],
  errors: string[]
): AideCliEnvironment {
  return {
    async readTextFile(path: string): Promise<string> {
      const content = files.get(path);

      if (content === undefined) {
        throw new Error(`Missing test file: ${path}`);
      }

      return content;
    },
    async writeTextFile(path: string, content: string): Promise<void> {
      files.set(path, content);
    },
    stdout(message: string): void {
      output.push(message);
    },
    stderr(message: string): void {
      errors.push(message);
    }
  };
}
