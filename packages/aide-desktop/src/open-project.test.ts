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
  createApplicationMenuTemplate,
  installApplicationMenu,
  type DesktopMenuTemplate,
  type ElectronMenu
} from "./main.js";
import {
  createOpenProjectDialogOptions,
  createProjectSummary,
  openProject,
  type OpenProjectDialog,
  type OpenProjectDialogOptions,
  type OpenProjectDialogResult
} from "./open-project.js";
import type { DesktopBrowserWindow } from "./window.js";

class MockWindow implements DesktopBrowserWindow {
  loadedUrls: string[] = [];

  loadURL(url: string): void {
    this.loadedUrls.push(url);
  }
}

class MockDialog implements OpenProjectDialog {
  lastOptions: OpenProjectDialogOptions | undefined;

  constructor(private readonly result: OpenProjectDialogResult) {}

  async showOpenDialog(
    _window: DesktopBrowserWindow,
    options: OpenProjectDialogOptions
  ): Promise<OpenProjectDialogResult> {
    this.lastOptions = options;

    return this.result;
  }
}

class MockMenu implements ElectronMenu {
  builtTemplate: DesktopMenuTemplate | undefined;
  applicationMenu: unknown;

  buildFromTemplate(template: DesktopMenuTemplate): unknown {
    this.builtTemplate = template;

    return template;
  }

  setApplicationMenu(menu: unknown): void {
    this.applicationMenu = menu;
  }
}

describe("open project", () => {
  it("loads a project and renders its summary", async () => {
    const project = createDesktopProject();
    const serializedProject = serializeProject(project);
    const window = new MockWindow();
    const dialog = new MockDialog({
      canceled: false,
      filePaths: ["project.json"]
    });
    const result = await openProject(window, {
      dialog,
      readTextFile: async () => serializedProject
    });

    expect(result).toEqual({
      opened: true,
      filePath: "project.json",
      summary: {
        projectId: "desktop_project_001",
        sceneCount: 2,
        clipCount: 3,
        assetCount: 1
      }
    });
    expect(dialog.lastOptions).toEqual(createOpenProjectDialogOptions());
    expect(decodeDataUrl(window.loadedUrls[0] ?? "")).toContain(
      "<dt>Project ID</dt><dd>desktop_project_001</dd>"
    );
    expect(decodeDataUrl(window.loadedUrls[0] ?? "")).toContain(
      "<dt>Clip Count</dt><dd>3</dd>"
    );
    expect(serializeProject(project)).toBe(serializedProject);
  });

  it("handles invalid project files without mutating the file", async () => {
    const invalidProject = "{ invalid";
    const window = new MockWindow();
    const result = await openProject(window, {
      dialog: new MockDialog({
        canceled: false,
        filePaths: ["broken.json"]
      }),
      readTextFile: async () => invalidProject
    });

    expect(result.opened).toBe(false);
    expect(result.filePath).toBe("broken.json");
    expect(result.error).toBeDefined();
    expect(decodeDataUrl(window.loadedUrls[0] ?? "")).toContain(
      "Unable to Open Project"
    );
    expect(invalidProject).toBe("{ invalid");
  });

  it("wires the File Open Project menu item", async () => {
    const window = new MockWindow();
    const dialog = new MockDialog({
      canceled: false,
      filePaths: ["project.json"]
    });
    const menu = new MockMenu();

    installApplicationMenu({
      Menu: menu,
      dialog,
      window,
      readTextFile: async () => serializeProject(createDesktopProject())
    });

    const openProjectItem = menu.builtTemplate?.[0]?.submenu?.[0];

    expect(menu.applicationMenu).toBe(menu.builtTemplate);
    expect(menu.builtTemplate?.[0]?.label).toBe("File");
    expect(openProjectItem?.label).toBe("Open Project");
    expect(openProjectItem?.accelerator).toBe("CmdOrCtrl+O");

    openProjectItem?.click?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(window.loadedUrls).toHaveLength(1);
    expect(decodeDataUrl(window.loadedUrls[0] ?? "")).toContain(
      "desktop_project_001"
    );
  });

  it("produces deterministic summaries and menu templates", () => {
    const project = createDesktopProject();
    const options = {
      dialog: new MockDialog({
        canceled: true,
        filePaths: []
      }),
      window: new MockWindow(),
      readTextFile: async () => ""
    };

    expect(createProjectSummary(project)).toEqual(createProjectSummary(project));
    expect(stripMenuFunctions(createApplicationMenuTemplate(options))).toEqual(
      stripMenuFunctions(createApplicationMenuTemplate(options))
    );
  });
});

function stripMenuFunctions(template: DesktopMenuTemplate): unknown {
  return template.map((item) => ({
    ...item,
    click: item.click ? "[function]" : undefined,
    submenu: item.submenu ? stripMenuFunctions(item.submenu) : undefined
  }));
}

function createDesktopProject(): Project {
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
      createClip("clip_intro", "track_video", "scene_001", 0, 5000, "video"),
      createClip("clip_broll", "track_video", "scene_002", 5000, 5000, "video")
    ]
  };
  const audioTrack: Track = {
    id: "track_audio",
    kind: "audio",
    role: "voiceover",
    name: "Narration",
    order: 2,
    clips: [
      createClip("clip_voice", "track_audio", "scene_001", 0, 10000, "audio")
    ]
  };

  return {
    ...createProject({
      projectId: "desktop_project_001",
      name: "Desktop Project",
      createdAt: "2026-06-16T00:00:00.000Z"
    }),
    assets,
    scenes,
    timeline: {
      id: "desktop_project_001_timeline",
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

function decodeDataUrl(url: string): string {
  return decodeURIComponent(url.slice(url.indexOf(",") + 1));
}
