import type {
  Scene,
  SceneConstraints,
  TimeRange
} from "../models/index.js";
import type { SrtCue, SrtDocument } from "../srt/index.js";
import type { SceneBuilderOptions } from "./scene-builder-types.js";
import { deriveSceneTitle } from "./scene-utils.js";

const DEFAULT_SOURCE_ID = "srt_source_001";
const DEFAULT_MAX_TITLE_LENGTH = 80;
const DEFAULT_MAX_KEYWORDS = 8;

export function buildScenesFromSrt(
  document: SrtDocument,
  options: SceneBuilderOptions = {}
): Scene[] {
  return document.cues.map((cue, cueIndex) =>
    buildSceneFromCue(cue, cueIndex, options)
  );
}

function buildSceneFromCue(
  cue: SrtCue,
  cueIndex: number,
  options: SceneBuilderOptions
): Scene {
  const narrativeRange = getCueNarrativeRange(cue);
  const constraints = getSceneConstraints(narrativeRange, options);
  const text = cue.rawText;

  return {
    id: formatSceneId(cueIndex + 1),
    order: cueIndex + 1,
    source: "srt",
    title: deriveSceneTitle(
      text,
      options.maxTitleLength ?? DEFAULT_MAX_TITLE_LENGTH
    ),
    text,
    keywords: deriveKeywords(text, options.maxKeywords ?? DEFAULT_MAX_KEYWORDS),
    narrativeRange,
    sourceRefs: [
      {
        sourceId: options.sourceId ?? DEFAULT_SOURCE_ID,
        kind: "srt-cue",
        refId: formatCueRefId(cue.index),
        range: narrativeRange
      }
    ],
    status: options.defaultStatus ?? "unassigned",
    constraints
  };
}

function getCueNarrativeRange(cue: SrtCue): TimeRange {
  return {
    start: cue.start,
    duration: cue.end - cue.start
  };
}

function getSceneConstraints(
  narrativeRange: TimeRange,
  options: SceneBuilderOptions
): SceneConstraints {
  return {
    lockedText: true,
    lockedTiming: true,
    targetDuration: narrativeRange.duration,
    ...options.defaultConstraints
  };
}

function deriveKeywords(text: string, maxKeywords: number): string[] {
  const stopwords = new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "before",
    "by",
    "for",
    "from",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "that",
    "the",
    "this",
    "to",
    "with"
  ]);

  const keywords: string[] = [];
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopwords.has(word));

  for (const word of words) {
    if (!keywords.includes(word)) {
      keywords.push(word);
    }

    if (keywords.length >= maxKeywords) {
      break;
    }
  }

  return keywords;
}

function formatSceneId(order: number): string {
  return `scene_${String(order).padStart(3, "0")}`;
}

function formatCueRefId(index: number): string {
  return `cue_${String(index).padStart(3, "0")}`;
}
