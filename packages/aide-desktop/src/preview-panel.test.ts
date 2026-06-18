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
  createPreviewComposition,
  createPreviewPanel,
  createPreviewPanelModel
} from "./preview-panel.js";
import type { DesktopBrowserWindow } from "./window.js";

describe("desktop preview panel", () => {
  it("generates preview metadata through the renderer preview pipeline", () => {
    const project = createPreviewProject();
    const composition = createPreviewComposition(project);
    const model = createPreviewPanelModel(project);

    expect(composition).toMatchObject({
      compositionId: "desktop_preview_001_composition",
      fps: 30,
      width: 1920,
      height: 1080,
      durationInFrames: 150
    });
    expect(composition.items).toHaveLength(1);
    expect(model).toEqual({
      compositionId: "desktop_preview_001_composition",
      fps: 30,
      width: 1920,
      height: 1080,
      durationInFrames: 150,
      durationInSeconds: 5,
      itemCount: 1
    });
    expect(createPreviewPanel(project)).toContain("[ Embedded Preview ]");
    expect(createPreviewPanel(project)).toContain(
      'data-preview-action="play"'
    );
  });

  it("handles an empty project", () => {
    const project = createProject({
      projectId: "empty_preview",
      name: "Empty Preview",
      createdAt: "2026-06-18T00:00:00.000Z"
    });

    expect(createPreviewPanelModel(project)).toEqual({
      compositionId: "empty_preview_composition",
      fps: 30,
      width: 1920,
      height: 1080,
      durationInFrames: 0,
      durationInSeconds: 0,
      itemCount: 0
    });
  });

  it("produces deterministic output", () => {
    const project = createPreviewProject();

    expect(createPreviewPanel(project)).toBe(createPreviewPanel(project));
    expect(createPreviewComposition(project)).toEqual(
      createPreviewComposition(project)
    );
  });

  it("does not mutate the project", () => {
    const project = createPreviewProject();
    const original = structuredClone(project);

    createPreviewComposition(project);
    createPreviewPanel(project);

    expect(project).toEqual(original);
  });

  it("renders preview metadata through desktop project opening", async () => {
    const project = createPreviewProject();
    const serializedProject = serializeProject(project);
    const window = new MockWindow();

    const result = await openProject(window, {
      dialog: new MockDialog({
        canceled: false,
        filePaths: ["preview-project.json"]
      }),
      readTextFile: async () => serializedProject
    });
    const html = decodeDataUrl(window.loadedUrl);

    expect(result.opened).toBe(true);
    expect(html).toContain('aria-label="Preview"');
    expect(html).toContain(
      "<dt>Composition ID</dt><dd>desktop_preview_001_composition</dd>"
    );
    expect(html).toContain("<dt>FPS</dt><dd>30</dd>");
    expect(html).toContain("<dt>Item Count</dt><dd>1</dd>");
    expect(html).toContain("[ Embedded Preview ]");
    expect(html).toContain('data-preview-action="pause"');
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

function createPreviewProject(): Project {
  const scene = createScene();
  const asset = createAsset();
  const track: Track = {
    id: "track_video",
    kind: "video",
    role: "primary-video",
    name: "Video",
    order: 1,
    clips: [createClip(scene.id, asset.id)]
  };

  return {
    ...createProject({
      projectId: "desktop_preview_001",
      name: "Desktop Preview",
      createdAt: "2026-06-18T00:00:00.000Z"
    }),
    assets: [asset],
    scenes: [scene],
    timeline: {
      id: "desktop_preview_001_timeline",
      tracks: [track],
      transitions: [],
      markers: []
    }
  };
}

function createScene(): Scene {
  return {
    id: "scene_001",
    order: 1,
    source: "manual",
    title: "Preview Scene",
    text: "Preview Scene",
    keywords: [],
    sourceRefs: [],
    status: "assigned",
    constraints: {}
  };
}

function createAsset(): Asset {
  return {
    id: "asset_001",
    kind: "image",
    uri: "/public/preview.png",
    displayName: "Preview Image",
    importedAt: "2026-06-18T00:00:00.000Z",
    media: {
      width: 1920,
      height: 1080
    },
    tags: [],
    status: "online"
  };
}

function createClip(sceneId: string, assetId: string): TimelineClip {
  return {
    id: "clip_001",
    trackId: "track_video",
    sceneId,
    mediaType: "image",
    role: "primary-visual",
    timelineRange: {
      start: 0,
      duration: 5000
    },
    source: {
      assetId
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
