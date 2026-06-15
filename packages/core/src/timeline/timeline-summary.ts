import type { Project } from "../project/index.js";

export interface TimelineSummary {
  trackCount: number;
  clipCount: number;
  assignedClipCount: number;
  placeholderClipCount: number;
  sceneCount: number;
  assetCount: number;
  totalDuration: number;
}

export function generateTimelineSummary(project: Project): TimelineSummary {
  const clips = project.timeline.tracks.flatMap((track) => track.clips);
  const assignedClipCount = clips.filter((clip) => {
    return clip.source?.assetId !== undefined;
  }).length;
  const totalDuration = project.timeline.tracks.reduce((maxEndTime, track) => {
    const trackEndTime = track.clips.reduce((clipMaxEndTime, clip) => {
      const clipEndTime = clip.timelineRange.start + clip.timelineRange.duration;

      return Math.max(clipMaxEndTime, clipEndTime);
    }, 0);

    return Math.max(maxEndTime, trackEndTime);
  }, 0);

  return {
    trackCount: project.timeline.tracks.length,
    clipCount: clips.length,
    assignedClipCount,
    placeholderClipCount: clips.length - assignedClipCount,
    sceneCount: project.scenes.length,
    assetCount: project.assets.length,
    totalDuration
  };
}
