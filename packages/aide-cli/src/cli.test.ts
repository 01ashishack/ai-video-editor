import {
  createProject,
  deserializeProject,
  serializeProject,
  type Project,
  type Scene,
  type TimelineClip,
  type Track
} from "@aide/core";
import { describe, expect, it } from "vitest";
import { runAideCli, type AideCliEnvironment } from "./cli.js";

function createCliProject(): Project {
  const scenes: Scene[] = [
    createScene("scene_001", 1),
    createScene("scene_002", 2)
  ];
  const track: Track = {
    id: "track_001",
    kind: "video",
    role: "primary-video",
    name: "Primary Video",
    order: 1,
    clips: [
      createClip("clip_intro", "scene_001", 0, 4000),
      createClip("clip_broll", "scene_002", 4000, 2000)
    ]
  };

  return {
    ...createProject({
      projectId: "project_cli_001",
      name: "CLI Project",
      createdAt: "2026-06-16T00:00:00.000Z"
    }),
    scenes,
    timeline: {
      id: "project_cli_001_timeline",
      tracks: [track],
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
  sceneId: string,
  start: number,
  duration: number
): TimelineClip {
  return {
    id,
    trackId: "track_001",
    sceneId,
    mediaType: "video",
    role: "primary-visual",
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

describe("aide cli", () => {
  it("edits a project file and prints edit details", async () => {
    const projectFile = "project.json";
    const files = new Map([[projectFile, serializeProject(createCliProject())]]);
    const output: string[] = [];
    const errors: string[] = [];
    const exitCode = await runAideCli(
      ["edit", projectFile, "trim clip_intro to 2 seconds"],
      createTestEnvironment(files, output, errors)
    );
    const savedProject = deserializeProject(files.get(projectFile) ?? "");

    expect(exitCode).toBe(0);
    expect(savedProject.timeline.tracks[0]?.clips[0]?.timelineRange.duration).toBe(
      2000
    );
    expect(output.join("")).toContain('"type": "clip.trim"');
    expect(output.join("")).toContain("Confidence: 0.95");
    expect(output.join("")).toContain("Requires clarification: false");
    expect(output.join("")).toContain("- Trim clip clip_intro");
    expect(errors).toEqual([]);
  });

  it("returns usage errors for incomplete edit commands", async () => {
    const output: string[] = [];
    const errors: string[] = [];
    const exitCode = await runAideCli(
      ["edit", "project.json"],
      createTestEnvironment(new Map(), output, errors)
    );

    expect(exitCode).toBe(1);
    expect(output).toEqual([]);
    expect(errors.join("")).toBe('Usage: aide edit <project-file> "<request>"\n');
  });

  it("exposes the preview command foundation", async () => {
    const output: string[] = [];
    const errors: string[] = [];
    const exitCode = await runAideCli(
      ["preview"],
      createTestEnvironment(new Map(), output, errors)
    );

    expect(exitCode).toBe(0);
    expect(output.join("")).toBe("aide preview is not implemented yet.\n");
    expect(errors).toEqual([]);
  });

  it("exposes the render command foundation", async () => {
    const output: string[] = [];
    const errors: string[] = [];
    const exitCode = await runAideCli(
      ["render"],
      createTestEnvironment(new Map(), output, errors)
    );

    expect(exitCode).toBe(0);
    expect(output.join("")).toBe("aide render is not implemented yet.\n");
    expect(errors).toEqual([]);
  });

  it("reports unknown commands", async () => {
    const output: string[] = [];
    const errors: string[] = [];
    const exitCode = await runAideCli(
      ["unknown"],
      createTestEnvironment(new Map(), output, errors)
    );

    expect(exitCode).toBe(1);
    expect(output).toEqual([]);
    expect(errors.join("")).toContain("Unknown command: unknown");
    expect(errors.join("")).toContain("aide edit");
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
