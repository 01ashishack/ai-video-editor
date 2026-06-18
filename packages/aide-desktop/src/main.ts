import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { openProject, type OpenProjectDialog } from "./open-project.js";
import {
  createMainWindow,
  type DesktopBrowserWindow,
  type DesktopBrowserWindowConstructor
} from "./window.js";

export interface ElectronApp {
  whenReady(): Promise<void>;
  on(event: "activate" | "window-all-closed", listener: () => void): void;
  quit(): void;
}

export interface ElectronRuntime {
  app: ElectronApp;
  BrowserWindow: DesktopBrowserWindowConstructor;
  dialog: OpenProjectDialog;
  Menu: ElectronMenu;
}

export interface StartDesktopAppOptions {
  electron?: ElectronRuntime;
  platform?: NodeJS.Platform;
  preloadPath?: string;
  readTextFile?: (path: string) => Promise<string>;
}

export interface ElectronMenu {
  buildFromTemplate(template: DesktopMenuTemplate): unknown;
  setApplicationMenu(menu: unknown): void;
}

export type DesktopMenuTemplate = DesktopMenuItem[];

export interface DesktopMenuItem {
  label?: string;
  accelerator?: string;
  role?: "quit";
  submenu?: DesktopMenuItem[];
  click?: () => void;
}

export async function startDesktopApp(
  options: StartDesktopAppOptions = {}
): Promise<void> {
  const electron = options.electron ?? (await loadElectron());
  const preloadPath = options.preloadPath ?? getDefaultPreloadPath();
  const platform = options.platform ?? process.platform;
  const readTextFile =
    options.readTextFile ?? ((path: string) => readFile(path, "utf8"));

  electron.app.on("window-all-closed", () => {
    if (platform !== "darwin") {
      electron.app.quit();
    }
  });

  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      createMainWindow({
        BrowserWindow: electron.BrowserWindow,
        preloadPath
      });
    }
  });

  await electron.app.whenReady();

  const mainWindow = createMainWindow({
    BrowserWindow: electron.BrowserWindow,
    preloadPath
  });

  installApplicationMenu({
    Menu: electron.Menu,
    dialog: electron.dialog,
    window: mainWindow,
    readTextFile
  });
}

export function installApplicationMenu(options: {
  Menu: ElectronMenu;
  dialog: OpenProjectDialog;
  window: DesktopBrowserWindow;
  readTextFile(path: string): Promise<string>;
}): void {
  const menu = options.Menu.buildFromTemplate(
    createApplicationMenuTemplate({
      dialog: options.dialog,
      window: options.window,
      readTextFile: options.readTextFile
    })
  );

  options.Menu.setApplicationMenu(menu);
}

export function createApplicationMenuTemplate(options: {
  dialog: OpenProjectDialog;
  window: DesktopBrowserWindow;
  readTextFile(path: string): Promise<string>;
}): DesktopMenuTemplate {
  return [
    {
      label: "File",
      submenu: [
        {
          label: "Open Project",
          accelerator: "CmdOrCtrl+O",
          click: () => {
            void openProject(options.window, {
              dialog: options.dialog,
              readTextFile: options.readTextFile
            });
          }
        },
        {
          role: "quit"
        }
      ]
    }
  ];
}

export function getDefaultPreloadPath(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "preload.js");
}

export function isDirectRun(
  entryUrl: string = import.meta.url,
  argvEntry: string | undefined = process.argv[1]
): boolean {
  return argvEntry !== undefined && fileURLToPath(entryUrl) === argvEntry;
}

async function loadElectron(): Promise<ElectronRuntime> {
  const imported = await dynamicImport("electron");

  return imported as ElectronRuntime;
}

function dynamicImport(specifier: string): Promise<unknown> {
  const load = new Function("specifier", "return import(specifier);") as (
    specifier: string
  ) => Promise<unknown>;

  return load(specifier);
}

if (isDirectRun()) {
  startDesktopApp().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
