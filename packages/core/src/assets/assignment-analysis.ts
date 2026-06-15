import type { Project } from "../project/index.js";

export interface AssignmentAnalysis {
  sceneCount: number;
  assignedSceneCount: number;
  unassignedSceneCount: number;
  coveragePercent: number;
  assignedScenes: string[];
  unassignedScenes: string[];
}

export function generateAssignmentAnalysis(project: Project): AssignmentAnalysis {
  const assignedSceneIds = new Set(
    project.timeline.tracks.flatMap((track) =>
      track.clips
        .filter((clip) => clip.sceneId !== undefined && clip.source?.assetId)
        .map((clip) => clip.sceneId!)
    )
  );
  const assignedScenes: string[] = [];
  const unassignedScenes: string[] = [];

  for (const scene of project.scenes) {
    if (assignedSceneIds.has(scene.id)) {
      assignedScenes.push(scene.id);
    } else {
      unassignedScenes.push(scene.id);
    }
  }

  const sceneCount = project.scenes.length;
  const assignedSceneCount = assignedScenes.length;

  return {
    sceneCount,
    assignedSceneCount,
    unassignedSceneCount: unassignedScenes.length,
    coveragePercent:
      sceneCount === 0 ? 0 : (assignedSceneCount / sceneCount) * 100,
    assignedScenes,
    unassignedScenes
  };
}
