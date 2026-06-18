import { deserializeProject, type Project, type TimelineClip } from "@aide/core";
import type { AideCliEnvironment } from "./cli.js";

export async function showTimelineFile(
  projectFile: string,
  environment: Pick<AideCliEnvironment, "readTextFile" | "stdout" | "stderr">
): Promise<number> {
  if (!projectFile) {
    environment.stderr("Usage: aide timeline <project-file>\n");
    return 1;
  }

  const project = deserializeProject(await environment.readTextFile(projectFile));

  environment.stdout(formatTimelineVisualization(project));

  return 0;
}

export function formatTimelineVisualization(project: Project): string {
  const sortedScenes = [...project.scenes].sort(compareScenes);
  const sortedTracks = [...project.timeline.tracks].sort(compareTracks);
  const knownSceneIds = new Set(sortedScenes.map((scene) => scene.id));
  const lines = [
    `Project: ${project.id}`,
    `Total duration: ${formatDuration(getTotalDuration(project))}`
  ];

  if (
    sortedScenes.length === 0 &&
    sortedTracks.every((track) => track.clips.length === 0)
  ) {
    return [...lines, "", "Timeline: (empty)", ""].join("\n");
  }

  for (const scene of sortedScenes) {
    lines.push("", formatSceneHeader(scene));

    const sceneTrackBlocks = sortedTracks
      .map((track) =>
        formatTrackBlock(
          track,
          track.clips.filter((clip) => clip.sceneId === scene.id)
        )
      )
      .filter((block): block is string => block.length > 0);

    if (sceneTrackBlocks.length === 0) {
      lines.push("(no clips)");
    } else {
      lines.push(sceneTrackBlocks.join("\n\n"));
    }
  }

  const unassignedTrackBlocks = sortedTracks
    .map((track) =>
      formatTrackBlock(
        track,
        track.clips.filter(
          (clip) => !clip.sceneId || !knownSceneIds.has(clip.sceneId)
        )
      )
    )
    .filter((block): block is string => block.length > 0);

  if (unassignedTrackBlocks.length > 0) {
    lines.push("", "Unassigned Clips", unassignedTrackBlocks.join("\n\n"));
  }

  return [...lines, ""].join("\n");
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

function formatSceneHeader(scene: Project["scenes"][number]): string {
  return `Scene ${scene.order}: ${scene.title} (${scene.id})`;
}

function formatTrackBlock(
  track: Project["timeline"]["tracks"][number],
  clips: TimelineClip[]
): string {
  if (clips.length === 0) {
    return "";
  }

  return [
    `${formatTrackKind(track.kind)} Track: ${track.name} (${track.id})`,
    ...[...clips].sort(compareClips).map(formatClipLine)
  ].join("\n");
}

function formatTrackKind(kind: Project["timeline"]["tracks"][number]["kind"]): string {
  return `${kind.charAt(0).toUpperCase()}${kind.slice(1)}`;
}

function formatClipLine(clip: TimelineClip): string {
  const start = clip.timelineRange.start;
  const end = clip.timelineRange.start + clip.timelineRange.duration;

  return `[${formatClipLabel(clip)}] ${formatDuration(start)} ${formatBar(clip.timelineRange.duration)} ${formatDuration(end)}`;
}

function formatClipLabel(clip: TimelineClip): string {
  return clip.text && clip.text.trim().length > 0 ? clip.text : clip.id;
}

function getTotalDuration(project: Project): number {
  return project.timeline.tracks.reduce((projectEnd, track) => {
    const trackEnd = track.clips.reduce((clipEnd, clip) => {
      return Math.max(clipEnd, clip.timelineRange.start + clip.timelineRange.duration);
    }, 0);

    return Math.max(projectEnd, trackEnd);
  }, 0);
}

function formatDuration(milliseconds: number): string {
  const seconds = milliseconds / 1000;

  if (Number.isInteger(seconds)) {
    return `${seconds}s`;
  }

  return `${Number(seconds.toFixed(3))}s`;
}

function formatBar(duration: number): string {
  return "─".repeat(Math.max(5, Math.round(duration / 1000)));
}
