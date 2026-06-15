import type { ID } from "./ids.js";
import type { TimeRange, Ticks } from "./time.js";

export interface SceneSourceRef {
  sourceId: ID;
  kind: "srt-cue" | "voiceover-segment" | "manual-note";
  refId: ID;
  range?: TimeRange;
}

export interface SceneConstraints {
  lockedText?: boolean;
  lockedTiming?: boolean;
  targetDuration?: Ticks;
  minDuration?: Ticks;
  maxDuration?: Ticks;
}

export interface Scene {
  id: ID;
  order: number;
  source: "srt" | "voiceover" | "manual" | "ai";
  title: string;
  summary?: string;
  text: string;
  keywords: string[];
  narrativeRange?: TimeRange;
  sourceRefs: SceneSourceRef[];
  status: "unassigned" | "assigned" | "needs-review" | "locked";
  constraints: SceneConstraints;
}
