import type { EditingIntent } from "./intent-types.js";
import { parseEditingIntent } from "./parser.js";

const ACTION_SEPARATOR_PATTERN = /\s*(?:,\s*(?:then\s+)?|\s+then\s+|\s+and\s+)\s*/i;

export function parseEditingIntents(request: string): EditingIntent[] {
  const segments = splitRequest(request);

  if (segments.length === 0) {
    throw new Error("Invalid editing request syntax.");
  }

  return Object.freeze(
    segments.map((segment) => parseEditingIntent(segment))
  ) as EditingIntent[];
}

function splitRequest(request: string): string[] {
  return request
    .trim()
    .replace(/\s+/g, " ")
    .split(ACTION_SEPARATOR_PATTERN)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
}
