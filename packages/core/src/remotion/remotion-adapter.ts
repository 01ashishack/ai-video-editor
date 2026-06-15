import type { Project } from "../project/index.js";

export interface RemotionComposition {
  compositionId: string;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  clips: RemotionClip[];
}

export interface RemotionClip {
  id: string;
  assetId?: string;
  sceneId?: string;
  fromFrame: number;
  durationInFrames: number;
  mediaType: string;
}

export function buildRemotionComposition(
  project: Project,
  options: {
    fps?: number;
    width?: number;
    height?: number;
  } = {}
): RemotionComposition {
  const fps = options.fps ?? 30;
  const width = options.width ?? 1920;
  const height = options.height ?? 1080;
  const clips = project.timeline.tracks.flatMap((track) =>
    track.clips.map((clip): RemotionClip => ({
      id: clip.id,
      assetId: clip.source?.assetId,
      sceneId: clip.sceneId,
      fromFrame: millisecondsToFrames(clip.timelineRange.start, fps),
      durationInFrames: millisecondsToFrames(
        clip.timelineRange.duration,
        fps
      ),
      mediaType: clip.mediaType
    }))
  );

  return {
    compositionId: `${project.id}_composition`,
    durationInFrames: clips.reduce(
      (maxEndFrame, clip) =>
        Math.max(maxEndFrame, clip.fromFrame + clip.durationInFrames),
      0
    ),
    fps,
    width,
    height,
    clips
  };
}

function millisecondsToFrames(milliseconds: number, fps: number): number {
  return Math.floor((milliseconds / 1000) * fps);
}
