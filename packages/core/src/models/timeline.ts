import type { ID } from "./ids.js";
import type { TimeRange, Ticks } from "./time.js";

export interface Timeline {
  id: ID;
  tracks: Track[];
  transitions: TimelineTransition[];
  markers: TimelineMarker[];
}

export interface Track {
  id: ID;
  kind: "video" | "audio" | "subtitle";
  role:
    | "primary-video"
    | "b-roll"
    | "voiceover"
    | "music"
    | "effects"
    | "subtitles"
    | "scratch";
  name: string;
  order: number;
  muted?: boolean;
  locked?: boolean;
  visible?: boolean;
  clips: TimelineClip[];
}

export interface ClipSource {
  assetId: ID;
  sourceRange?: TimeRange;
}

export interface ClipLink {
  clipId: ID;
  relation:
    | "linked-audio"
    | "linked-video"
    | "subtitle-for"
    | "voiceover-for"
    | "replacement-of";
}

export interface ClipRenderProperties {
  opacity?: number;
  volume?: number;
  fit?: "contain" | "cover" | "stretch";
  position?: {
    x: number;
    y: number;
  };
  scale?: number;
}

export interface TimelineClip {
  id: ID;
  trackId: ID;
  sceneId?: ID;
  mediaType: "video" | "audio" | "image" | "subtitle" | "placeholder";
  role:
    | "primary-visual"
    | "b-roll"
    | "voiceover"
    | "music"
    | "subtitle"
    | "placeholder";
  timelineRange: TimeRange;
  source?: ClipSource;
  text?: string;
  enabled: boolean;
  locked: boolean;
  links: ClipLink[];
  render: ClipRenderProperties;
}

export interface TimelineTransition {
  id: ID;
  kind: "crossfade" | "fade-in" | "fade-out" | "cut";
  trackId: ID;
  fromClipId?: ID;
  toClipId?: ID;
  start: Ticks;
  duration: Ticks;
  properties?: Record<string, unknown>;
}

export interface TimelineMarker {
  id: ID;
  time: Ticks;
  label: string;
  kind: "chapter" | "note" | "warning" | "sync";
}
