import {
  createProject,
  type Asset,
  type Project,
  type Scene,
  type TimelineClip,
  type Track
} from "@aide/core";
import { describe, expect, it } from "vitest";
import { applyEdit } from "./apply-edit.js";
import {
  initializeEmbeddedPreviewPlayer,
  pauseEmbeddedPreview,
  playEmbeddedPreview,
  renderEmbeddedPreviewPlayer
} from "./embedded-preview-player.js";
import {
  createOpenedProjectPageUrl,
  openProject,
  type OpenProjectDialog,
  type OpenProjectDialogOptions,
  type OpenProjectDialogResult
} from "./open-project.js";
import {
  createPreviewComposition,
  createPreviewPanel
} from "./preview-panel.js";
import type { DesktopBrowserWindow } from "./window.js";

describe("embedded preview player", () => {
  it("initializes the existing Remotion PreviewPlayer", () => {
    const composition = createPreviewComposition(createPlayerProject());
    const state = initializeEmbeddedPreviewPlayer(composition);
    const playerElement = state.playerElement as {
      props: {
        durationInFrames: number;
        fps: number;
        controls: boolean;
        autoPlay: boolean;
      };
    };

    expect(state.currentFrame).toBe(0);
    expect(state.durationInFrames).toBe(90);
    expect(state.playing).toBe(false);
    expect(playerElement.props).toMatchObject({
      durationInFrames: 90,
      fps: 30,
      controls: false,
      autoPlay: false
    });
    expect(renderEmbeddedPreviewPlayer(state)).toContain(
      'data-player-state="paused"'
    );
  });

  it("generates the preview composition through the existing pipeline", () => {
    const composition = createPreviewComposition(createPlayerProject());

    expect(composition).toMatchObject({
      compositionId: "embedded_preview_001_composition",
      durationInFrames: 90,
      fps: 30,
      width: 1920,
      height: 1080
    });
    expect(composition.items).toHaveLength(2);
  });

  it("refreshes the embedded preview after edits", async () => {
    const result = await applyEdit(
      createPlayerProject(),
      "delete clip_beta"
    );

    expect(result.workspaceHtml).toContain(
      'data-composition-id="embedded_preview_001_composition"'
    );
    expect(result.workspaceHtml).toContain(
      "<span>Duration: <strong>30 frames</strong></span>"
    );
    expect(result.workspaceHtml).toContain(
      "<dt>Item Count</dt><dd>1</dd>"
    );
  });

  it("produces deterministic player state and controls", () => {
    const composition = createPreviewComposition(createPlayerProject());
    const first = initializeEmbeddedPreviewPlayer(composition);
    const second = initializeEmbeddedPreviewPlayer(composition);

    expect(renderEmbeddedPreviewPlayer(first)).toBe(
      renderEmbeddedPreviewPlayer(second)
    );
    expect(pauseEmbeddedPreview(playEmbeddedPreview(first))).toMatchObject({
      currentFrame: 0,
      durationInFrames: 90,
      playing: false
    });
  });

  it("does not mutate the project or composition", () => {
    const project = createPlayerProject();
    const originalProject = structuredClone(project);
    const composition = createPreviewComposition(project);
    const originalComposition = structuredClone(composition);
    const state = initializeEmbeddedPreviewPlayer(composition);

    playEmbeddedPreview(state);
    pauseEmbeddedPreview(state);
    renderEmbeddedPreviewPlayer(state);

    expect(project).toEqual(originalProject);
    expect(composition).toEqual(originalComposition);
  });

  it("renders player controls through desktop project opening", async () => {
    const project = createPlayerProject();
    const window = new MockWindow();

    await openProject(window, {
      dialog: new MockDialog({
        canceled: false,
        filePaths: ["embedded-preview.json"]
      }),
      readTextFile: async () => JSON.stringify(project)
    });
    const html = decodeDataUrl(window.loadedUrl);

    expect(html).toContain("data-remotion-player-host");
    expect(html).toContain('data-preview-action="play"');
    expect(html).toContain('data-preview-action="pause"');
    expect(html).toContain("Current frame:");
    expect(html).toContain("Duration:");
    expect(createOpenedProjectPageUrl(project)).toBe(
      createOpenedProjectPageUrl(project)
    );
    expect(createPreviewPanel(project)).toContain("[ Embedded Preview ]");
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

function createPlayerProject(): Project {
  const scene = createScene();
  const assets = [
    createAsset("asset_alpha"),
    createAsset("asset_beta")
  ];
  const track: Track = {
    id: "track_video",
    kind: "video",
    role: "primary-video",
    name: "Video",
    order: 1,
    clips: [
      createClip("clip_alpha", scene.id, assets[0]!.id, 0, 1000),
      createClip("clip_beta", scene.id, assets[1]!.id, 1000, 2000)
    ]
  };

  return {
    ...createProject({
      projectId: "embedded_preview_001",
      name: "Embedded Preview",
      createdAt: "2026-06-18T00:00:00.000Z"
    }),
    assets,
    scenes: [scene],
    timeline: {
      id: "embedded_preview_001_timeline",
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
    title: "Scene 1",
    text: "Scene 1",
    keywords: [],
    sourceRefs: [],
    status: "assigned",
    constraints: {}
  };
}

function createAsset(id: string): Asset {
  return {
    id,
    kind: "image",
    uri: `/public/${id}.png`,
    displayName: id,
    importedAt: "2026-06-18T00:00:00.000Z",
    media: {},
    tags: [],
    status: "online"
  };
}

function createClip(
  id: string,
  sceneId: string,
  assetId: string,
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
