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
import { runChatSession, type AideChatEnvironment } from "./chat.js";

function createChatProject(): Project {
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
      projectId: "project_chat_001",
      name: "Chat Project",
      createdAt: "2026-06-16T00:00:00.000Z"
    }),
    scenes,
    timeline: {
      id: "project_chat_001_timeline",
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

describe("runChatSession", () => {
  it("starts a session and exits", async () => {
    const projectFile = "project.json";
    const files = new Map([[projectFile, serializeProject(createChatProject())]]);
    const output: string[] = [];
    const exitCode = await runChatSession(
      projectFile,
      createTestChatEnvironment(files, ["exit"], output)
    );

    expect(exitCode).toBe(0);
    expect(output.join("")).toContain("AIDE chat started.");
    expect(output.join("")).toContain("Goodbye.");
  });

  it("executes multiple edits and preserves updated project state", async () => {
    const projectFile = "project.json";
    const files = new Map([[projectFile, serializeProject(createChatProject())]]);
    const output: string[] = [];
    const exitCode = await runChatSession(
      projectFile,
      createTestChatEnvironment(
        files,
        ["trim clip_intro to 2 seconds", "trim it to 1000 ms", "exit"],
        output
      )
    );
    const savedProject = deserializeProject(files.get(projectFile) ?? "");

    expect(exitCode).toBe(0);
    expect(
      savedProject.timeline.tracks[0]?.clips[0]?.timelineRange.duration
    ).toBe(1000);
    expect(countOccurrences(output.join(""), "Confidence: 0.95")).toBe(2);
    expect(output.join("")).toContain("- Trim clip clip_intro");
  });

  it("undoes the previous edit", async () => {
    const projectFile = "project.json";
    const files = new Map([[projectFile, serializeProject(createChatProject())]]);
    const output: string[] = [];
    const exitCode = await runChatSession(
      projectFile,
      createTestChatEnvironment(
        files,
        ["trim clip_intro to 2 seconds", "undo", "exit"],
        output
      )
    );
    const savedProject = deserializeProject(files.get(projectFile) ?? "");

    expect(exitCode).toBe(0);
    expect(
      savedProject.timeline.tracks[0]?.clips[0]?.timelineRange.duration
    ).toBe(4000);
    expect(output.join("")).toContain("Undo applied.");
  });

  it("supports quit as an exit command", async () => {
    const projectFile = "project.json";
    const files = new Map([[projectFile, serializeProject(createChatProject())]]);
    const output: string[] = [];
    const exitCode = await runChatSession(
      projectFile,
      createTestChatEnvironment(files, ["quit"], output)
    );

    expect(exitCode).toBe(0);
    expect(output.join("")).toContain("Goodbye.");
  });

  it("produces deterministic chat output and saved project", async () => {
    const projectFile = "project.json";
    const leftFiles = new Map([[projectFile, serializeProject(createChatProject())]]);
    const rightFiles = new Map([[projectFile, serializeProject(createChatProject())]]);
    const leftOutput: string[] = [];
    const rightOutput: string[] = [];
    const inputs = ["trim clip_intro to 2 seconds", "undo", "exit"];

    await runChatSession(
      projectFile,
      createTestChatEnvironment(leftFiles, inputs, leftOutput)
    );
    await runChatSession(
      projectFile,
      createTestChatEnvironment(rightFiles, inputs, rightOutput)
    );

    expect(leftOutput).toEqual(rightOutput);
    expect(leftFiles.get(projectFile)).toBe(rightFiles.get(projectFile));
  });

  it("does not mutate input fixtures", async () => {
    const project = createChatProject();
    const originalProject = structuredClone(project);
    const projectFile = "project.json";
    const files = new Map([[projectFile, serializeProject(project)]]);
    const output: string[] = [];

    await runChatSession(
      projectFile,
      createTestChatEnvironment(
        files,
        ["delete clip_intro", "exit"],
        output
      )
    );

    expect(project).toEqual(originalProject);
  });
});

function createTestChatEnvironment(
  files: Map<string, string>,
  inputs: readonly string[],
  output: string[],
  errors: string[] = []
): AideChatEnvironment {
  let nextInputIndex = 0;

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
    },
    async readLine(): Promise<string | undefined> {
      const input = inputs[nextInputIndex];
      nextInputIndex += 1;

      return input;
    }
  };
}

function countOccurrences(text: string, pattern: string): number {
  return text.split(pattern).length - 1;
}
