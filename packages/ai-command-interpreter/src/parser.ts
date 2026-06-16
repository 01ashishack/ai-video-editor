import {
  createClipDeleteIntent,
  createClipMoveIntent,
  createClipSplitIntent,
  createClipTrimIntent,
  createSceneReplaceIntent
} from "./intent-builders.js";
import type { EditingIntent } from "./intent-types.js";

const CLIP_ID_PATTERN = "clip_[A-Za-z0-9]+";
const SCENE_REPLACE_PATTERN = /^replace scene ([1-9]\d*)$/i;
const CLIP_MOVE_PATTERN = new RegExp(
  `^move (${CLIP_ID_PATTERN}) (before|after) (${CLIP_ID_PATTERN})$`,
  "i"
);
const CLIP_TRIM_PATTERN = new RegExp(
  `^trim (${CLIP_ID_PATTERN}) to (\\d+(?:\\.\\d+)?) (seconds?|ms)$`,
  "i"
);
const CLIP_SPLIT_PATTERN = new RegExp(
  `^split (${CLIP_ID_PATTERN}) at (\\d+(?:\\.\\d+)?) (seconds?|ms)$`,
  "i"
);
const CLIP_DELETE_PATTERN = new RegExp(`^delete (${CLIP_ID_PATTERN})$`, "i");

export function parseEditingIntent(request: string): EditingIntent {
  const normalizedRequest = normalizeRequest(request);

  if (normalizedRequest.length === 0) {
    throw new Error("Invalid editing request syntax.");
  }

  const sceneReplaceMatch = SCENE_REPLACE_PATTERN.exec(normalizedRequest);
  if (sceneReplaceMatch) {
    return createSceneReplaceIntent({
      sceneNumber: Number(sceneReplaceMatch[1])
    });
  }

  const clipMoveMatch = CLIP_MOVE_PATTERN.exec(normalizedRequest);
  if (clipMoveMatch) {
    return createClipMoveIntent({
      clipId: clipMoveMatch[1],
      placement: clipMoveMatch[2].toLowerCase() as "before" | "after",
      targetClipId: clipMoveMatch[3]
    });
  }

  const clipTrimMatch = CLIP_TRIM_PATTERN.exec(normalizedRequest);
  if (clipTrimMatch) {
    return createClipTrimIntent({
      clipId: clipTrimMatch[1],
      duration: parseDurationMs(clipTrimMatch[2], clipTrimMatch[3])
    });
  }

  const clipSplitMatch = CLIP_SPLIT_PATTERN.exec(normalizedRequest);
  if (clipSplitMatch) {
    return createClipSplitIntent({
      clipId: clipSplitMatch[1],
      splitAt: parseDurationMs(clipSplitMatch[2], clipSplitMatch[3])
    });
  }

  const clipDeleteMatch = CLIP_DELETE_PATTERN.exec(normalizedRequest);
  if (clipDeleteMatch) {
    return createClipDeleteIntent({
      clipId: clipDeleteMatch[1]
    });
  }

  if (isAmbiguousRequest(normalizedRequest)) {
    throw new Error("Ambiguous editing request.");
  }

  throw new Error("Invalid editing request syntax.");
}

function normalizeRequest(request: string): string {
  return request.trim().replace(/\s+/g, " ");
}

function parseDurationMs(value: string, unit: string): number {
  const numericValue = Number(value);

  if (unit.toLowerCase().startsWith("second")) {
    return numericValue * 1000;
  }

  return numericValue;
}

function isAmbiguousRequest(request: string): boolean {
  return (
    /\b(this|it|intro|better)\b/i.test(request) ||
    /^(make|fix|shorten|improve)\b/i.test(request)
  );
}
