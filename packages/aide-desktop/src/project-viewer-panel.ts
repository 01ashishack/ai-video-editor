import { type Project, type TimelineClip } from "@aide/core";
import { createTimelinePanel } from "./timeline-panel.js";
import { createApplicationPage, createHtmlPageUrl } from "./window.js";

export interface ProjectViewerScene {
  id: string;
  name: string;
  order: number;
  clips: ProjectViewerClip[];
}

export interface ProjectViewerClip {
  id: string;
  name: string;
  start: number;
}

export interface ProjectViewerAsset {
  id: string;
  name: string;
  kind: string;
}

export interface ProjectViewerModel {
  projectId: string;
  scenes: ProjectViewerScene[];
  assets: ProjectViewerAsset[];
  totalClipCount: number;
  totalAssetCount: number;
}

export function createProjectViewerModel(project: Project): ProjectViewerModel {
  const clips = project.timeline.tracks.flatMap((track) => track.clips);

  return {
    projectId: project.id,
    scenes: [...project.scenes].sort(compareScenes).map((scene) => ({
      id: scene.id,
      name: scene.title,
      order: scene.order,
      clips: clips
        .filter((clip) => clip.sceneId === scene.id)
        .sort(compareClips)
        .map((clip) => ({
          id: clip.id,
          name: getClipName(clip),
          start: clip.timelineRange.start
        }))
    })),
    assets: [...project.assets].sort(compareAssets).map((asset) => ({
      id: asset.id,
      name: asset.displayName || asset.id,
      kind: asset.kind
    })),
    totalClipCount: clips.length,
    totalAssetCount: project.assets.length
  };
}

export function createProjectViewerPanel(project: Project): string {
  return renderProjectViewerModel(createProjectViewerModel(project));
}

export function createProjectViewerPage(project: Project): string {
  return createProjectWorkspacePage(project);
}

export function createProjectViewerPageUrl(project: Project): string {
  return createProjectWorkspacePageUrl(project);
}

export function createProjectWorkspacePage(project: Project): string {
  return createApplicationPage(
    `${createProjectViewerPanel(project)}
      ${createTimelinePanel(project)}`
  );
}

export function createProjectWorkspacePageUrl(project: Project): string {
  return createHtmlPageUrl(createProjectWorkspacePage(project));
}

export function renderProjectViewerModel(model: ProjectViewerModel): string {
  return `<h1>AI Video Editor</h1>
      <section class="panel" aria-label="Project viewer">
        <h2>Project</h2>
        <dl class="summary">
          <dt>Project ID</dt><dd>${escapeHtml(model.projectId)}</dd>
          <dt>Clip Count</dt><dd>${model.totalClipCount}</dd>
          <dt>Asset Count</dt><dd>${model.totalAssetCount}</dd>
        </dl>
        ${renderSceneTree(model.scenes)}
        <h2>Assets</h2>
        ${renderAssetTree(model.assets)}
      </section>`;
}

function renderSceneTree(scenes: ProjectViewerScene[]): string {
  if (scenes.length === 0) {
    return '<p class="muted">No scenes</p>';
  }

  return `<ul class="tree" aria-label="Scenes">
          ${scenes.map(renderScene).join("\n          ")}
        </ul>`;
}

function renderScene(scene: ProjectViewerScene): string {
  const clips =
    scene.clips.length === 0
      ? '<span class="muted">No clips</span>'
      : `<ul>
              ${scene.clips.map(renderClip).join("\n              ")}
            </ul>`;

  return `<li data-scene-id="${escapeHtml(scene.id)}">
            <strong>Scene ${scene.order}: ${escapeHtml(scene.name)}</strong>
            ${clips}
          </li>`;
}

function renderClip(clip: ProjectViewerClip): string {
  return `<li data-clip-id="${escapeHtml(clip.id)}">${escapeHtml(clip.name)}</li>`;
}

function renderAssetTree(assets: ProjectViewerAsset[]): string {
  if (assets.length === 0) {
    return '<p class="muted">No assets</p>';
  }

  return `<ul class="tree" aria-label="Assets">
          ${assets
            .map(
              (asset) =>
                `<li data-asset-id="${escapeHtml(asset.id)}">${escapeHtml(asset.name)} <span class="muted">(${escapeHtml(asset.kind)})</span></li>`
            )
            .join("\n          ")}
        </ul>`;
}

function compareScenes(
  left: Project["scenes"][number],
  right: Project["scenes"][number]
): number {
  return left.order - right.order || left.id.localeCompare(right.id);
}

function compareClips(left: TimelineClip, right: TimelineClip): number {
  return (
    left.timelineRange.start - right.timelineRange.start ||
    left.id.localeCompare(right.id)
  );
}

function compareAssets(
  left: Project["assets"][number],
  right: Project["assets"][number]
): number {
  return left.id.localeCompare(right.id);
}

function getClipName(clip: TimelineClip): string {
  return clip.text?.trim() || clip.id;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
