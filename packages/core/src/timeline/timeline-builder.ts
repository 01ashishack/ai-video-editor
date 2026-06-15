import type {
  TimelineClip,
  Ticks,
  Track
} from "../models/index.js";
import type { Project } from "../project/index.js";

export interface TimelineBuilderOptions {
  trackId?: string;
  trackName?: string;
  startAt?: Ticks;
  defaultClipDuration?: Ticks;
}

const DEFAULT_TRACK_ID = "track_primary_video_001";
const DEFAULT_TRACK_NAME = "Primary Video";
const DEFAULT_START_AT = 0;
const DEFAULT_CLIP_DURATION = 5000;

export function buildTimelineFromScenes(
  project: Project,
  options: TimelineBuilderOptions = {}
): Project {
  const trackId = options.trackId ?? DEFAULT_TRACK_ID;
  const sortedScenes = [...project.scenes].sort((left, right) => {
    return left.order - right.order;
  });
  let cursor = options.startAt ?? DEFAULT_START_AT;

  const clips = sortedScenes.map((scene, index) => {
    const duration =
      scene.narrativeRange?.duration ?? options.defaultClipDuration ?? DEFAULT_CLIP_DURATION;
    const clip: TimelineClip = {
      id: formatTimelineClipId(index + 1),
      trackId,
      sceneId: scene.id,
      mediaType: "placeholder",
      role: "placeholder",
      timelineRange: {
        start: cursor,
        duration
      },
      text: scene.title,
      enabled: true,
      locked: false,
      links: [],
      render: {}
    };

    cursor += duration;

    return clip;
  });

  const primaryVideoTrack: Track = {
    id: trackId,
    kind: "video",
    role: "primary-video",
    name: options.trackName ?? DEFAULT_TRACK_NAME,
    order: 1,
    clips
  };

  return {
    ...project,
    timeline: {
      ...project.timeline,
      tracks: [primaryVideoTrack]
    }
  };
}

function formatTimelineClipId(order: number): string {
  return `clip_placeholder_${String(order).padStart(3, "0")}`;
}
