import type { Project } from "../project/index.js";

export interface TimelineReportScene {
  sceneId: string;
  title: string;
  clipId: string;
  assetId?: string;
  assetName?: string;
  duration: number;
  assigned: boolean;
}

export interface TimelineReport {
  scenes: TimelineReportScene[];
}

export function generateTimelineReport(project: Project): TimelineReport {
  const sceneById = new Map(project.scenes.map((scene) => [scene.id, scene]));
  const assetById = new Map(project.assets.map((asset) => [asset.id, asset]));
  const rows = project.timeline.tracks.flatMap((track) =>
    track.clips
      .filter((clip) => clip.sceneId !== undefined)
      .map((clip) => {
        const scene = sceneById.get(clip.sceneId!);
        const assetId = clip.source?.assetId;
        const asset = assetId ? assetById.get(assetId) : undefined;

        return {
          sceneOrder: scene?.order ?? Number.MAX_SAFE_INTEGER,
          row: {
            sceneId: clip.sceneId!,
            title: scene?.title ?? "",
            clipId: clip.id,
            assetId,
            assetName: asset?.displayName,
            duration: clip.timelineRange.duration,
            assigned: assetId !== undefined
          }
        };
      })
  );

  return {
    scenes: rows
      .sort((left, right) => left.sceneOrder - right.sceneOrder)
      .map((item) => item.row)
  };
}
