import { deserializeProject, type Project } from "@aide/core";
import type { AideCliEnvironment } from "./cli.js";

export async function showProjectFile(
  projectFile: string,
  environment: Pick<AideCliEnvironment, "readTextFile" | "stdout" | "stderr">
): Promise<number> {
  if (!projectFile) {
    environment.stderr("Usage: aide show <project-file>\n");
    return 1;
  }

  const project = deserializeProject(await environment.readTextFile(projectFile));

  environment.stdout(formatProjectView(project));

  return 0;
}

export function formatProjectView(project: Project): string {
  return [
    `Project ID: ${project.id}`,
    `Scene count: ${project.scenes.length}`,
    `Clip count: ${countClips(project)}`,
    `Asset count: ${project.assets.length}`,
    "Timeline:",
    formatTimeline(project),
    ""
  ].join("\n");
}

function countClips(project: Project): number {
  return project.timeline.tracks.reduce(
    (total, track) => total + track.clips.length,
    0
  );
}

function formatTimeline(project: Project): string {
  if (project.timeline.tracks.length === 0) {
    return "(empty)";
  }

  return project.timeline.tracks.map(formatTrack).join("\n");
}

function formatTrack(projectTrack: Project["timeline"]["tracks"][number]): string {
  const clipLines =
    projectTrack.clips.length > 0
      ? projectTrack.clips.map((clip) => `  - ${formatClip(clip)}`).join("\n")
      : "  (no clips)";

  return [
    `- Track ${projectTrack.id} (${projectTrack.kind}, ${projectTrack.role}) clips=${projectTrack.clips.length}`,
    clipLines
  ].join("\n");
}

function formatClip(
  clip: Project["timeline"]["tracks"][number]["clips"][number]
): string {
  const scene = clip.sceneId ? ` scene=${clip.sceneId}` : "";

  return `${clip.id}${scene} start=${clip.timelineRange.start} duration=${clip.timelineRange.duration}`;
}
