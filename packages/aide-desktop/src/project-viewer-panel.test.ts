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
import {
  openProject,
  type OpenProjectDialog,
  type OpenProjectDialogOptions,
  type OpenProjectDialogResult
} from "./open-project.js";
import {
  createProjectViewerModel,
  createProjectViewerPage,
  createProjectViewerPanel
} from "./project-viewer-panel.js";
import type { DesktopBrowserWindow } from "./window.js";

describe("desktop project viewer panel", () => {
  it("renders a populated project", () => {
    const panel = createProjectViewerPanel(createViewerProject());

    expect(panel).toContain("<dt>Project ID</dt><dd>viewer_project_001</dd>");
    expect(panel).toContain("<dt>Clip Count</dt><dd>3</dd>");
    expect(panel).toContain("<dt>Asset Count</dt><dd>2</dd>");
    expect(panel).toContain("Scene 1: Introduction");
    expect(panel).toContain("Opening Clip");
    expect(panel).toContain("Narration");
    expect(panel).toContain("Opening Image");
  });

  it("renders an empty project", () => {
    const project = createProject({
      projectId: "empty_project",
      name: "Empty Project",
      createdAt: "2026-06-18T00:00:00.000Z"
    });
    const panel = createProjectViewerPanel(project);

    expect(panel).toContain("<dt>Clip Count</dt><dd>0</dd>");
    expect(panel).toContain("<dt>Asset Count</dt><dd>0</dd>");
    expect(panel).toContain("No scenes");
    expect(panel).toContain("No assets");
  });

  it("renders multiple scenes and their clips in deterministic order", () => {
    const model = createProjectViewerModel(createViewerProject());

    expect(model.scenes.map((scene) => scene.name)).toEqual([
      "Introduction",
      "Conclusion"
    ]);
    expect(model.scenes[0]?.clips.map((clip) => clip.name)).toEqual([
      "Opening Clip",
      "Narration"
    ]);
    expect(model.scenes[1]?.clips.map((clip) => clip.name)).toEqual([
      "Closing Clip"
    ]);
  });

  it("produces deterministic rendering", () => {
    const project = createViewerProject();

    expect(createProjectViewerPage(project)).toBe(
      createProjectViewerPage(project)
    );
  });

  it("does not mutate the project", () => {
    const project = createViewerProject();
    const original = structuredClone(project);

    createProjectViewerModel(project);
    createProjectViewerPanel(project);

    expect(project).toEqual(original);
  });

  it("renders the viewer panel through desktop project opening", async () => {
    const project = createViewerProject();
    const serializedProject = serializeProject(project);
    const window = new MockWindow();

    const result = await openProject(window, {
      dialog: new MockDialog({
        canceled: false,
        filePaths: ["viewer-project.json"]
      }),
      readTextFile: async () => serializedProject
    });
    const html = decodeDataUrl(window.loadedUrl);

    expect(result.opened).toBe(true);
    expect(html).toContain('aria-label="Project viewer"');
    expect(html).toContain("Scene 1: Introduction");
    expect(html).toContain("Closing Clip");
    expect(html).toContain("Narration Audio");
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

function createViewerProject(): Project {
  const scenes: Scene[] = [
    createScene("scene_conclusion", 2, "Conclusion"),
    createScene("scene_intro", 1, "Introduction")
  ];
  const assets: Asset[] = [
    createAsset("asset_narration", "Narration Audio", "audio"),
    createAsset("asset_image", "Opening Image", "image")
  ];
  const videoTrack: Track = {
    id: "track_video",
    kind: "video",
    role: "primary-video",
    name: "Video",
    order: 1,
    clips: [
      createClip(
        "clip_close",
        "track_video",
        "scene_conclusion",
        5000,
        5000,
        "Closing Clip",
        "video"
      ),
      createClip(
        "clip_open",
        "track_video",
        "scene_intro",
        0,
        5000,
        "Opening Clip",
        "video"
      )
    ]
  };
  const audioTrack: Track = {
    id: "track_audio",
    kind: "audio",
    role: "voiceover",
    name: "Narration",
    order: 2,
    clips: [
      createClip(
        "clip_narration",
        "track_audio",
        "scene_intro",
        1000,
        4000,
        "Narration",
        "audio"
      )
    ]
  };

  return {
    ...createProject({
      projectId: "viewer_project_001",
      name: "Viewer Project",
      createdAt: "2026-06-18T00:00:00.000Z"
    }),
    assets,
    scenes,
    timeline: {
      id: "viewer_project_001_timeline",
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

function createAsset(
  id: string,
  displayName: string,
  kind: Asset["kind"]
): Asset {
  return {
    id,
    kind,
    uri: `/public/${id}`,
    displayName,
    importedAt: "2026-06-18T00:00:00.000Z",
    media: {},
    tags: [],
    status: "online"
  };
}

function createClip(
  id: string,
  trackId: string,
  sceneId: string,
  start: number,
  duration: number,
  text: string,
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
    text,
    enabled: true,
    locked: false,
    links: [],
    render: {}
  };
}

function decodeDataUrl(url: string): string {
  return decodeURIComponent(url.slice(url.indexOf(",") + 1));
}
