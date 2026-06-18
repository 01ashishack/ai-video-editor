import { describe, expect, it } from "vitest";
import {
  startDesktopApp,
  type ElectronApp,
  type ElectronMenu,
  type ElectronRuntime
} from "./main.js";
import type {
  OpenProjectDialog,
  OpenProjectDialogOptions,
  OpenProjectDialogResult
} from "./open-project.js";
import {
  APP_TITLE,
  createPlaceholderPageUrl,
  createWindowOptions,
  type DesktopBrowserWindow,
  type DesktopWindowOptions
} from "./window.js";

class MockBrowserWindow implements DesktopBrowserWindow {
  static created: MockBrowserWindow[] = [];

  readonly options: DesktopWindowOptions;
  loadedUrl = "";

  constructor(options: DesktopWindowOptions) {
    this.options = options;
    MockBrowserWindow.created.push(this);
  }

  static getAllWindows(): DesktopBrowserWindow[] {
    return MockBrowserWindow.created;
  }

  static reset(): void {
    MockBrowserWindow.created = [];
  }

  loadURL(url: string): void {
    this.loadedUrl = url;
  }
}

class MockApp implements ElectronApp {
  readonly listeners = new Map<string, () => void>();
  quitCount = 0;

  async whenReady(): Promise<void> {
    return undefined;
  }

  on(event: "activate" | "window-all-closed", listener: () => void): void {
    this.listeners.set(event, listener);
  }

  quit(): void {
    this.quitCount += 1;
  }

  emit(event: "activate" | "window-all-closed"): void {
    this.listeners.get(event)?.();
  }
}

class MockDialog implements OpenProjectDialog {
  async showOpenDialog(
    _window: DesktopBrowserWindow,
    _options: OpenProjectDialogOptions
  ): Promise<OpenProjectDialogResult> {
    return {
      canceled: true,
      filePaths: []
    };
  }
}

class MockMenu implements ElectronMenu {
  applicationMenu: unknown;

  buildFromTemplate(template: unknown): unknown {
    return template;
  }

  setApplicationMenu(menu: unknown): void {
    this.applicationMenu = menu;
  }
}

describe("desktop main process", () => {
  it("uses the expected window configuration", () => {
    expect(createWindowOptions("preload.js")).toEqual({
      width: 1400,
      height: 900,
      title: APP_TITLE,
      show: true,
      webPreferences: {
        preload: "preload.js",
        contextIsolation: true,
        nodeIntegration: false
      }
    });
  });

  it("wires app startup and clean shutdown", async () => {
    const app = new MockApp();
    MockBrowserWindow.reset();

    await startDesktopApp({
      electron: createElectronRuntime(app),
      platform: "win32",
      preloadPath: "preload.js"
    });

    expect(MockBrowserWindow.created).toHaveLength(1);
    expect(MockBrowserWindow.created[0]?.loadedUrl).toBe(createPlaceholderPageUrl());
    expect(app.listeners.has("activate")).toBe(true);
    expect(app.listeners.has("window-all-closed")).toBe(true);

    app.emit("window-all-closed");

    expect(app.quitCount).toBe(1);
  });

  it("produces deterministic startup output", async () => {
    const first = await runStartup();
    const second = await runStartup();

    expect(first).toEqual(second);
  });
});

async function runStartup(): Promise<{
  options: DesktopWindowOptions | undefined;
  loadedUrl: string | undefined;
}> {
  const app = new MockApp();
  MockBrowserWindow.reset();

  await startDesktopApp({
    electron: createElectronRuntime(app),
    platform: "linux",
    preloadPath: "preload.js"
  });

  return {
    options: MockBrowserWindow.created[0]?.options,
    loadedUrl: MockBrowserWindow.created[0]?.loadedUrl
  };
}

function createElectronRuntime(app: ElectronApp): ElectronRuntime {
  return {
    app,
    BrowserWindow: MockBrowserWindow,
    dialog: new MockDialog(),
    Menu: new MockMenu()
  };
}
