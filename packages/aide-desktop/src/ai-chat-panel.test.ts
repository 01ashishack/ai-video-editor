import {
  createProject,
  serializeProject,
  type Project,
  type Scene,
  type TimelineClip,
  type Track
} from "@aide/core";
import { describe, expect, it } from "vitest";
import {
  createAIChatPanel,
  createAIChatPanelState,
  submitAIChatRequest
} from "./ai-chat-panel.js";
import {
  openProject,
  type OpenProjectDialog,
  type OpenProjectDialogOptions,
  type OpenProjectDialogResult
} from "./open-project.js";
import type { DesktopBrowserWindow } from "./window.js";

describe("desktop AI chat panel", () => {
  it("submits an editing request and appends conversation history", async () => {
    const project = createChatProject();
    const state = await submitAIChatRequest(
      project,
      "trim clip_alpha to 500 ms"
    );

    expect(state.history).toHaveLength(1);
    expect(state.history[0]?.request).toBe("trim clip_alpha to 500 ms");
    expect(state.history[0]?.dryRunSummary).toEqual([
      "Trim clip clip_alpha"
    ]);
  });

  it("displays generated intents", async () => {
    const state = await submitAIChatRequest(
      createChatProject(),
      "delete clip_alpha"
    );
    const panel = createAIChatPanel(state);

    expect(panel).toContain("Generated Intents");
    expect(panel).toContain("&quot;type&quot;: &quot;clip.delete&quot;");
    expect(panel).toContain("&quot;clipId&quot;: &quot;clip_alpha&quot;");
  });

  it("displays confidence", async () => {
    const state = await submitAIChatRequest(
      createChatProject(),
      "trim clip_alpha to 500 ms"
    );

    expect(createAIChatPanel(state)).toContain(
      "<dt>Confidence</dt><dd>0.95</dd>"
    );
  });

  it("displays clarification status and reasons", async () => {
    const state = await submitAIChatRequest(
      createChatProject(),
      "move clip_alpha after clip_beta"
    );
    const panel = createAIChatPanel(state);

    expect(panel).toContain(
      "<dt>Requires Clarification</dt><dd>true</dd>"
    );
    expect(panel).toContain("Relative target reference must be resolved.");
  });

  it("produces deterministic output", async () => {
    const left = await submitAIChatRequest(
      createChatProject(),
      "trim clip_alpha to 500 ms"
    );
    const right = await submitAIChatRequest(
      createChatProject(),
      "trim clip_alpha to 500 ms"
    );

    expect(left).toEqual(right);
    expect(createAIChatPanel(left)).toBe(createAIChatPanel(right));
  });

  it("does not mutate the loaded project", async () => {
    const project = createChatProject();
    const original = structuredClone(project);
    const serialized = serializeProject(project);
    const initialState = createAIChatPanelState();

    const state = await submitAIChatRequest(
      project,
      "delete clip_alpha",
      initialState
    );

    expect(project).toEqual(original);
    expect(serializeProject(project)).toBe(serialized);
    expect(initialState.history).toEqual([]);
    expect(state.history).toHaveLength(1);
  });

  it("renders the chat foundation through desktop project opening", async () => {
    const project = createChatProject();
    const serializedProject = serializeProject(project);
    const window = new MockWindow();

    const result = await openProject(window, {
      dialog: new MockDialog({
        canceled: false,
        filePaths: ["chat-project.json"]
      }),
      readTextFile: async () => serializedProject
    });
    const html = decodeDataUrl(window.loadedUrl);

    expect(result.opened).toBe(true);
    expect(html).toContain('aria-label="AI chat"');
    expect(html).toContain('data-ai-chat-form');
    expect(html).toContain('name="request"');
    expect(html).toContain('<button type="submit">Submit</button>');
    expect(html).toContain('aria-label="Conversation history"');
    expect(serializeProject(project)).toBe(serializedProject);
  });
});

class MockWindow implements DesktopBrowserWindow {
  loadedUrl = "";

  loadURL(url: string): void {
    this.loadedUrl = url;
  }
}

class MockDialog implements OpenProjectDialog {
  constructor(private readonly result: OpenProjectDialogResult) {}

  async showOpenDialog(
    _window: DesktopBrowserWindow,
    _options: OpenProjectDialogOptions
  ): Promise<OpenProjectDialogResult> {
    return this.result;
  }
}

function createChatProject(): Project {
  const scenes = [
    createScene("scene_001", 1),
    createScene("scene_002", 2)
  ];
  const track: Track = {
    id: "track_video",
    kind: "video",
    role: "primary-video",
    name: "Video",
    order: 1,
    clips: [
      createClip("clip_alpha", "scene_001", 0, 1000),
      createClip("clip_beta", "scene_002", 1000, 2000)
    ]
  };

  return {
    ...createProject({
      projectId: "desktop_chat_001",
      name: "Desktop Chat",
      createdAt: "2026-06-18T00:00:00.000Z"
    }),
    scenes,
    timeline: {
      id: "desktop_chat_001_timeline",
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
    trackId: "track_video",
    sceneId,
    mediaType: "image",
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

function decodeDataUrl(url: string): string {
  return decodeURIComponent(url.slice(url.indexOf(",") + 1));
}
