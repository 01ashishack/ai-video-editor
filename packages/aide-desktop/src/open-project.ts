import { deserializeProject, type Project } from "@aide/core";
import { createDesktopWorkspacePage } from "./apply-edit.js";
import {
  createHtmlPageUrl,
  type DesktopBrowserWindow
} from "./window.js";

export interface OpenProjectDialogResult {
  canceled: boolean;
  filePaths: string[];
}

export interface OpenProjectDialog {
  showOpenDialog(
    window: DesktopBrowserWindow,
    options: OpenProjectDialogOptions
  ): Promise<OpenProjectDialogResult>;
}

export interface OpenProjectDialogOptions {
  title: string;
  properties: ["openFile"];
  filters: Array<{
    name: string;
    extensions: string[];
  }>;
}

export interface OpenProjectEnvironment {
  dialog: OpenProjectDialog;
  readTextFile(path: string): Promise<string>;
}

export interface ProjectSummary {
  projectId: string;
  sceneCount: number;
  clipCount: number;
  assetCount: number;
}

export interface OpenProjectResult {
  opened: boolean;
  filePath?: string;
  summary?: ProjectSummary;
  error?: string;
}

export async function openProject(
  window: DesktopBrowserWindow,
  environment: OpenProjectEnvironment
): Promise<OpenProjectResult> {
  const selection = await environment.dialog.showOpenDialog(
    window,
    createOpenProjectDialogOptions()
  );
  const [filePath] = selection.filePaths;

  if (selection.canceled || !filePath) {
    return {
      opened: false
    };
  }

  try {
    const project = deserializeProject(await environment.readTextFile(filePath));
    const summary = createProjectSummary(project);

    await window.loadURL(createOpenedProjectPageUrl(project));

    return {
      opened: true,
      filePath,
      summary
    };
  } catch (error) {
    const message = formatErrorMessage(error);

    await window.loadURL(createProjectErrorPageUrl(message));

    return {
      opened: false,
      filePath,
      error: message
    };
  }
}

export function createOpenProjectDialogOptions(): OpenProjectDialogOptions {
  return {
    title: "Open Project",
    properties: ["openFile"],
    filters: [
      {
        name: "Project JSON",
        extensions: ["json"]
      }
    ]
  };
}

export function createProjectSummary(project: Project): ProjectSummary {
  return {
    projectId: project.id,
    sceneCount: project.scenes.length,
    clipCount: countClips(project),
    assetCount: project.assets.length
  };
}

export function createOpenedProjectPageUrl(project: Project): string {
  return createHtmlPageUrl(createDesktopWorkspacePage(project));
}

export function createProjectSummaryPageUrl(summary: ProjectSummary): string {
  return createHtmlPageUrl(createProjectSummaryPage(summary));
}

export function createProjectErrorPageUrl(message: string): string {
  return createHtmlPageUrl(createProjectErrorPage(message));
}

export function createProjectSummaryPage(summary: ProjectSummary): string {
  return createProjectPage([
    "<h1>AI Video Editor</h1>",
    "<section>",
    "<h2>Project Opened</h2>",
    "<dl>",
    `<dt>Project ID</dt><dd>${escapeHtml(summary.projectId)}</dd>`,
    `<dt>Scene Count</dt><dd>${summary.sceneCount}</dd>`,
    `<dt>Clip Count</dt><dd>${summary.clipCount}</dd>`,
    `<dt>Asset Count</dt><dd>${summary.assetCount}</dd>`,
    "</dl>",
    "</section>"
  ]);
}

export function createProjectErrorPage(message: string): string {
  return createProjectPage([
    "<h1>AI Video Editor</h1>",
    "<section>",
    "<h2>Unable to Open Project</h2>",
    `<p>${escapeHtml(message)}</p>`,
    "</section>"
  ]);
}

function createProjectPage(body: string[]): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>AI Video Editor</title>
    <style>
      :root {
        color-scheme: light dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #101418;
        color: #f5f7fa;
      }

      body {
        margin: 0;
        min-height: 100vh;
      }

      main {
        margin: 0 auto;
        max-width: 720px;
        padding: 72px 32px;
      }

      dl {
        display: grid;
        gap: 12px 24px;
        grid-template-columns: max-content 1fr;
      }

      dt {
        color: #aeb8c4;
      }

      dd {
        margin: 0;
      }
    </style>
  </head>
  <body>
    <main>
      ${body.join("\n      ")}
    </main>
  </body>
</html>`;
}

function countClips(project: Project): number {
  return project.timeline.tracks.reduce(
    (total, track) => total + track.clips.length,
    0
  );
}

function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown project open error";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
