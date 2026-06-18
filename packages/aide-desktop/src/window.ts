export const APP_TITLE = "AI Video Editor";
export const DEFAULT_WINDOW_SIZE = Object.freeze({
  width: 1400,
  height: 900
});

export interface DesktopWindowOptions {
  width: number;
  height: number;
  title: string;
  show: boolean;
  webPreferences: {
    preload: string;
    contextIsolation: boolean;
    nodeIntegration: boolean;
  };
}

export interface DesktopBrowserWindow {
  loadURL(url: string): Promise<void> | void;
}

export interface DesktopBrowserWindowConstructor {
  new (options: DesktopWindowOptions): DesktopBrowserWindow;
  getAllWindows(): DesktopBrowserWindow[];
}

export interface CreateMainWindowOptions {
  BrowserWindow: DesktopBrowserWindowConstructor;
  preloadPath: string;
}

export function createWindowOptions(preloadPath: string): DesktopWindowOptions {
  return {
    ...DEFAULT_WINDOW_SIZE,
    title: APP_TITLE,
    show: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false
    }
  };
}

export function createMainWindow(
  options: CreateMainWindowOptions
): DesktopBrowserWindow {
  const window = new options.BrowserWindow(
    createWindowOptions(options.preloadPath)
  );

  void window.loadURL(createPlaceholderPageUrl());

  return window;
}

export function createHtmlPageUrl(html: string): string {
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

export function createApplicationPage(content: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${APP_TITLE}</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #101418;
        color: #f5f7fa;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
      }

      main {
        margin: 0 auto;
        max-width: 960px;
        padding: 48px 32px;
      }

      h1, h2, h3, p {
        margin-top: 0;
      }

      .panel {
        border: 1px solid #303840;
        border-radius: 8px;
        background: #171c21;
        margin-bottom: 24px;
        padding: 24px;
      }

      .summary {
        color: #aeb8c4;
        display: flex;
        flex-wrap: wrap;
        gap: 12px 24px;
        margin-bottom: 24px;
      }

      .tree,
      .tree ul {
        list-style: none;
        margin: 0;
        padding-left: 0;
      }

      .tree ul {
        border-left: 1px solid #3a444e;
        margin: 8px 0 16px 10px;
        padding-left: 20px;
      }

      .tree li {
        line-height: 1.6;
      }

      .muted {
        color: #8b96a3;
      }

      .timeline-scene + .timeline-scene {
        border-top: 1px solid #303840;
        margin-top: 24px;
        padding-top: 24px;
      }

      .timeline-track {
        margin: 16px 0 24px;
      }

      .timeline-track h4 {
        margin: 0 0 8px;
      }

      .timeline-clip {
        align-items: baseline;
        display: grid;
        font-family: "Cascadia Code", "SFMono-Regular", Consolas, monospace;
        gap: 8px;
        grid-template-columns: minmax(140px, 1fr) auto minmax(80px, 2fr) auto minmax(110px, auto);
        margin: 6px 0;
      }

      .timeline-clip-name,
      .timeline-duration {
        overflow-wrap: anywhere;
      }

      .timeline-bar {
        color: #78a9ff;
        overflow: hidden;
        white-space: nowrap;
      }

      .timeline-duration {
        color: #8b96a3;
      }

      .preview-metadata {
        display: grid;
        gap: 8px 24px;
        grid-template-columns: max-content 1fr;
        margin: 0 0 24px;
      }

      .preview-metadata dt {
        color: #8b96a3;
      }

      .preview-metadata dd {
        margin: 0;
      }

      .embedded-preview-stage {
        align-items: center;
        aspect-ratio: 16 / 9;
        background: #0b0e11;
        border: 1px solid #3a444e;
        border-radius: 6px;
        color: #aeb8c4;
        display: flex;
        font-family: "Cascadia Code", "SFMono-Regular", Consolas, monospace;
        justify-content: center;
        max-height: 420px;
        width: 100%;
      }

      .embedded-preview-controls {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 8px 16px;
        margin-top: 12px;
      }

      .embedded-preview-controls button {
        background: #e8eef5;
        border: 1px solid #3a444e;
        border-radius: 6px;
        color: #101418;
        font: inherit;
        min-height: 36px;
        padding: 6px 14px;
      }

      .ai-chat-form label {
        display: block;
        margin-bottom: 8px;
      }

      .ai-chat-controls {
        display: grid;
        gap: 8px;
        grid-template-columns: 1fr auto;
      }

      .ai-chat-controls input,
      .ai-chat-controls button,
      .apply-edit-button {
        border: 1px solid #3a444e;
        border-radius: 6px;
        font: inherit;
        min-height: 40px;
      }

      .ai-chat-controls input {
        background: #0b0e11;
        color: #f5f7fa;
        padding: 8px 12px;
      }

      .ai-chat-controls button,
      .apply-edit-button {
        background: #e8eef5;
        color: #101418;
        cursor: default;
        padding: 8px 18px;
      }

      .apply-edit-button {
        margin-top: 12px;
      }

      .apply-status {
        border: 1px solid #3a444e;
        border-radius: 6px;
        margin: 16px 0 0;
        padding: 10px 12px;
      }

      .apply-status-success {
        border-color: #3c7a57;
        color: #9ad5ad;
      }

      .apply-status-failure {
        border-color: #8a4444;
        color: #f0aaaa;
      }

      .conversation-history {
        margin-top: 24px;
      }

      .conversation-entry {
        border-top: 1px solid #303840;
        padding-top: 20px;
      }

      .conversation-entry + .conversation-entry {
        margin-top: 24px;
      }

      .intent-output {
        background: #0b0e11;
        border: 1px solid #303840;
        border-radius: 6px;
        overflow: auto;
        padding: 12px;
        white-space: pre-wrap;
      }

      .ai-result-metadata {
        display: grid;
        gap: 8px 24px;
        grid-template-columns: max-content 1fr;
      }

      .ai-result-metadata dt {
        color: #8b96a3;
      }

      .ai-result-metadata dd {
        margin: 0;
      }
    </style>
  </head>
  <body>
    <main>
      ${content}
    </main>
  </body>
</html>`;
}

export function createPlaceholderPageUrl(): string {
  return createHtmlPageUrl(createPlaceholderPage());
}

export function createPlaceholderPage(): string {
  return createApplicationPage(`<div class="panel">
        <h1>${APP_TITLE}</h1>
      </div>`);
}
