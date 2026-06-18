import {
  createProject,
  serializeProject,
  type Asset,
  type Project,
  type Scene,
  type TimelineClip,
  type Track
} from "@aide/core";
import { describe, expect, it } from "vitest";
import { runAideCli, type AideCliEnvironment } from "./cli.js";
import { formatProjectView, showProjectFile } from "./project-viewer.js";

function createViewerProject(): Project {
  const scenes: Scene[] = [
    createScene("scene_001", 1),
    createScene("scene_002", 2)
  ];
  const assets: Asset[] = [
    {
      id: "asset_001",
      kind: "image",
      uri: "/public/image.png",
      metadata: {}
    }
  ];
  const videoTrack: Track = {
    id: "track_video",
    kind: "video",
    role: "primary-video",
    name: "Video",
    order: 1,
    clips: [
      createClip("clip_intro", "track_video", "scene_001", 0, 4000),
      createClip("clip_broll", "track_video", "scene_002", 4000, 2000)
    ]
  };
  const audioTrack: Track = {
    id: "track_audio",
    kind: "audio",
    role: "voiceover",
    name: "Voiceover",
    order: 2,
    clips: [
      createClip("clip_voice", "track_audio", "scene_001", 0, 6000)
    ]
  };

  return {
    ...createProject({
      projectId: "project_viewer_001",
      name: "Viewer Project",
      createdAt: "2026-06-16T00:00:00.000Z"
    }),
    assets,
    scenes,
    timeline: {
      id: "project_viewer_001_timeline",
      tracks: [videoTrack, audioTrack],
      transitions: [],
      markers: []
    }
  };
}

function createScene(id: string, order: number): Scene {
  return {
    id,
    order,
    source: "manual",
    title: `Scene ${order}`,
    text: `Scene ${order}`,
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
  duration: number
): TimelineClip {
  return {
    id,
    trackId,
    sceneId,
    mediaType: trackId.includes("audio") ? "audio" : "video",
    role: trackId.includes("audio") ? "voiceover" : "primary-visual",
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

describe("project viewer", () => {
  it("prints a valid project", async () => {
    const projectFile = "project.json";
    const files = new Map([[projectFile, serializeProject(createViewerProject())]]);
    const output: string[] = [];
    const errors: string[] = [];
    const exitCode = await showProjectFile(
      projectFile,
      createTestEnvironment(files, output, errors)
    );

    expect(exitCode).toBe(0);
    expect(output.join("")).toBe(`Project ID: project_viewer_001
Scene count: 2
Clip count: 3
Asset count: 1
Timeline:
- Track track_video (video, primary-video) clips=2
  - clip_intro scene=scene_001 start=0 duration=4000
  - clip_broll scene=scene_002 start=4000 duration=2000
- Track track_audio (audio, voiceover) clips=1
  - clip_voice scene=scene_001 start=0 duration=6000
`);
    expect(errors).toEqual([]);
  });

  it("prints an empty project", () => {
    const project = createProject({
      projectId: "project_empty",
      name: "Empty Project",
      createdAt: "2026-06-16T00:00:00.000Z"
    });

    expect(formatProjectView(project)).toBe(`Project ID: project_empty
Scene count: 0
Clip count: 0
Asset count: 0
Timeline:
(empty)
`);
  });

  it("produces deterministic output", () => {
    const project = createViewerProject();

    expect(formatProjectView(project)).toBe(formatProjectView(project));
  });

  it("does not mutate the project or project file", async () => {
    const project = createViewerProject();
    const originalProject = structuredClone(project);
    const projectFile = "project.json";
    const serializedProject = serializeProject(project);
    const files = new Map([[projectFile, serializedProject]]);

    await showProjectFile(
      projectFile,
      createTestEnvironment(files, [], [])
    );

    expect(project).toEqual(originalProject);
    expect(files.get(projectFile)).toBe(serializedProject);
  });

  it("wires the CLI show command", async () => {
    const projectFile = "project.json";
    const files = new Map([[projectFile, serializeProject(createViewerProject())]]);
    const output: string[] = [];
    const errors: string[] = [];
    const exitCode = await runAideCli(
      ["show", projectFile],
      createTestEnvironment(files, output, errors)
    );

    expect(exitCode).toBe(0);
    expect(output.join("")).toContain("Project ID: project_viewer_001");
    expect(output.join("")).toContain("Clip count: 3");
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
