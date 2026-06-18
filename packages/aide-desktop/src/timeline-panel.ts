import { type Project, type TimelineClip } from "@aide/core";

export interface TimelinePanelClip {
  id: string;
  name: string;
  start: number;
  duration: number;
  end: number;
}

export interface TimelinePanelTrack {
  id: string;
  name: string;
  kind: string;
  order: number;
  clips: TimelinePanelClip[];
}

export interface TimelinePanelScene {
  id: string;
  name: string;
  order: number;
  tracks: TimelinePanelTrack[];
}

export interface TimelinePanelModel {
  scenes: TimelinePanelScene[];
}

export function createTimelinePanelModel(project: Project): TimelinePanelModel {
  const tracks = [...project.timeline.tracks].sort(compareTracks);

  return {
    scenes: [...project.scenes].sort(compareScenes).map((scene) => ({
      id: scene.id,
      name: scene.title,
      order: scene.order,
      tracks: tracks
        .map((track) => ({
          id: track.id,
          name: track.name,
          kind: track.kind,
          order: track.order,
          clips: track.clips
            .filter((clip) => clip.sceneId === scene.id)
            .sort(compareClips)
            .map(createTimelineClip)
        }))
        .filter((track) => track.clips.length > 0)
    }))
  };
}

export function createTimelinePanel(project: Project): string {
  return renderTimelinePanelModel(createTimelinePanelModel(project));
}

export function renderTimelinePanelModel(model: TimelinePanelModel): string {
  if (model.scenes.length === 0) {
    return `<section class="panel timeline-panel" aria-label="Timeline">
        <h2>Timeline</h2>
        <p class="muted">No timeline scenes</p>
      </section>`;
  }

  return `<section class="panel timeline-panel" aria-label="Timeline">
        <h2>Timeline</h2>
        ${model.scenes.map(renderScene).join("\n        ")}
      </section>`;
}

function renderScene(scene: TimelinePanelScene): string {
  const tracks =
    scene.tracks.length === 0
      ? '<p class="muted">No timeline clips</p>'
      : scene.tracks.map(renderTrack).join("\n          ");

  return `<section class="timeline-scene" data-scene-id="${escapeHtml(scene.id)}">
          <h3>Scene ${scene.order}: ${escapeHtml(scene.name)}</h3>
          ${tracks}
        </section>`;
}

function renderTrack(track: TimelinePanelTrack): string {
  return `<div class="timeline-track" data-track-id="${escapeHtml(track.id)}">
            <h4>${escapeHtml(formatTrackName(track))}</h4>
            ${track.clips.map(renderClip).join("\n            ")}
          </div>`;
}

function renderClip(clip: TimelinePanelClip): string {
  return `<div class="timeline-clip" data-clip-id="${escapeHtml(clip.id)}">
              <span class="timeline-clip-name">[${escapeHtml(clip.name)}]</span>
              <span>${formatTime(clip.start)}</span>
              <span class="timeline-bar">${createTimelineBar(clip.duration)}</span>
              <span>${formatTime(clip.end)}</span>
              <span class="timeline-duration">duration ${formatTime(clip.duration)}</span>
            </div>`;
}

function createTimelineClip(clip: TimelineClip): TimelinePanelClip {
  return {
    id: clip.id,
    name: clip.text?.trim() || clip.id,
    start: clip.timelineRange.start,
    duration: clip.timelineRange.duration,
    end: clip.timelineRange.start + clip.timelineRange.duration
  };
}

function compareScenes(
  left: Project["scenes"][number],
  right: Project["scenes"][number]
): number {
  return left.order - right.order || left.id.localeCompare(right.id);
}

function compareTracks(
  left: Project["timeline"]["tracks"][number],
  right: Project["timeline"]["tracks"][number]
): number {
  return left.order - right.order || left.id.localeCompare(right.id);
}

function compareClips(left: TimelineClip, right: TimelineClip): number {
  return (
    left.timelineRange.start - right.timelineRange.start ||
    left.id.localeCompare(right.id)
  );
}

function formatTrackName(track: TimelinePanelTrack): string {
  const kind = `${track.kind.charAt(0).toUpperCase()}${track.kind.slice(1)}`;

  return `${kind} Track: ${track.name}`;
}

function formatTime(milliseconds: number): string {
  const seconds = milliseconds / 1000;

  return `${Number(seconds.toFixed(3))}s`;
}

function createTimelineBar(duration: number): string {
  return "─".repeat(Math.max(5, Math.round(duration / 1000)));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
