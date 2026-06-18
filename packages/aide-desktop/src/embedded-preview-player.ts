import {
  PreviewPlayer,
  type RendererComposition
} from "@ai-documentary-editor/remotion-renderer";

export interface EmbeddedPreviewPlayerState {
  composition: RendererComposition;
  currentFrame: number;
  durationInFrames: number;
  playing: boolean;
  playerElement: unknown;
}

export function initializeEmbeddedPreviewPlayer(
  composition: RendererComposition
): EmbeddedPreviewPlayerState {
  const playerElement = PreviewPlayer({
    composition,
    controls: false,
    autoPlay: false,
    loop: false
  });

  return freezePlayerState({
    composition,
    currentFrame: 0,
    durationInFrames: composition.durationInFrames,
    playing: false,
    playerElement
  });
}

export function playEmbeddedPreview(
  state: EmbeddedPreviewPlayerState
): EmbeddedPreviewPlayerState {
  return freezePlayerState({
    ...state,
    playing: true
  });
}

export function pauseEmbeddedPreview(
  state: EmbeddedPreviewPlayerState
): EmbeddedPreviewPlayerState {
  return freezePlayerState({
    ...state,
    playing: false
  });
}

export function renderEmbeddedPreviewPlayer(
  state: EmbeddedPreviewPlayerState
): string {
  return `<div class="embedded-preview-player" data-composition-id="${escapeHtml(state.composition.compositionId)}" data-player-state="${state.playing ? "playing" : "paused"}">
          <div class="embedded-preview-stage" data-remotion-player-host>[ Embedded Preview ]</div>
          <div class="embedded-preview-controls" aria-label="Preview controls">
            <button type="button" data-preview-action="play">Play</button>
            <button type="button" data-preview-action="pause">Pause</button>
            <span>Current frame: <strong data-current-frame>${state.currentFrame}</strong></span>
            <span>Duration: <strong>${state.durationInFrames} frames</strong></span>
          </div>
        </div>`;
}

function freezePlayerState(
  state: EmbeddedPreviewPlayerState
): EmbeddedPreviewPlayerState {
  return Object.freeze({
    composition: state.composition,
    currentFrame: state.currentFrame,
    durationInFrames: state.durationInFrames,
    playing: state.playing,
    playerElement: state.playerElement
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
