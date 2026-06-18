import { type Project } from "@aide/core";
import {
  buildPreviewComposition,
  type RendererComposition
} from "@ai-documentary-editor/remotion-renderer";
import {
  initializeEmbeddedPreviewPlayer,
  renderEmbeddedPreviewPlayer
} from "./embedded-preview-player.js";

export interface PreviewPanelModel {
  compositionId: string;
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  durationInSeconds: number;
  itemCount: number;
}

export function createPreviewComposition(project: Project): RendererComposition {
  const assetUris = new Map(
    project.assets.map((asset) => [asset.id, asset.uri])
  );

  return buildPreviewComposition(project, {
    resolver: {
      resolve: (assetId) => assetUris.get(assetId)
    }
  });
}

export function createPreviewPanelModel(project: Project): PreviewPanelModel {
  return createPreviewPanelModelFromComposition(
    createPreviewComposition(project)
  );
}

export function createPreviewPanel(project: Project): string {
  const composition = createPreviewComposition(project);

  return renderPreviewPanelModel(
    createPreviewPanelModelFromComposition(composition),
    renderEmbeddedPreviewPlayer(
      initializeEmbeddedPreviewPlayer(composition)
    )
  );
}

export function renderPreviewPanelModel(
  model: PreviewPanelModel,
  embeddedPlayer = ""
): string {
  return `<section class="panel preview-panel" aria-label="Preview">
        <h2>Preview</h2>
        <dl class="preview-metadata">
          <dt>Composition ID</dt><dd>${escapeHtml(model.compositionId)}</dd>
          <dt>FPS</dt><dd>${model.fps}</dd>
          <dt>Width</dt><dd>${model.width}</dd>
          <dt>Height</dt><dd>${model.height}</dd>
          <dt>Duration</dt><dd>${model.durationInFrames} frames (${formatSeconds(model.durationInSeconds)})</dd>
          <dt>Item Count</dt><dd>${model.itemCount}</dd>
        </dl>
        ${embeddedPlayer}
      </section>`;
}

function createPreviewPanelModelFromComposition(
  composition: RendererComposition
): PreviewPanelModel {
  return {
    compositionId: composition.compositionId,
    fps: composition.fps,
    width: composition.width,
    height: composition.height,
    durationInFrames: composition.durationInFrames,
    durationInSeconds:
      composition.fps === 0
        ? 0
        : composition.durationInFrames / composition.fps,
    itemCount: composition.items.length
  };
}

function formatSeconds(seconds: number): string {
  return `${Number(seconds.toFixed(3))}s`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
