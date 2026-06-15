import type { SrtCue, SrtDocument } from "./srt-types.js";

const TIMESTAMP_PATTERN = /^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/;
const TIMING_LINE_PATTERN =
  /^(\d{2}:\d{2}:\d{2},\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2},\d{3})$/;

export function parseSrt(input: string): SrtDocument {
  const normalizedInput = input.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const blocks = normalizedInput
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);

  const cues = blocks.map(parseCueBlock);

  return { cues };
}

function parseCueBlock(block: string): SrtCue {
  const lines = block.split("\n");
  const indexLine = lines[0]?.trim();
  const timingLine = lines[1]?.trim();
  const textLines = lines.slice(2);

  if (!indexLine || !timingLine || textLines.length === 0) {
    throw new Error("Invalid SRT cue block.");
  }

  const index = Number.parseInt(indexLine, 10);

  if (!Number.isInteger(index)) {
    throw new Error(`Invalid SRT cue index: ${indexLine}`);
  }

  const timingMatch = timingLine.match(TIMING_LINE_PATTERN);

  if (!timingMatch) {
    throw new Error(`Invalid SRT timing line: ${timingLine}`);
  }

  const [, startValue, endValue] = timingMatch;
  const start = parseTimestamp(startValue);
  const end = parseTimestamp(endValue);

  if (end <= start) {
    throw new Error(`SRT cue end must be after start: ${timingLine}`);
  }

  return {
    index,
    start,
    end,
    rawText: textLines.join("\n")
  };
}

function parseTimestamp(value: string): number {
  const match = value.match(TIMESTAMP_PATTERN);

  if (!match) {
    throw new Error(`Invalid SRT timestamp: ${value}`);
  }

  const [, hoursValue, minutesValue, secondsValue, millisecondsValue] = match;
  const hours = Number.parseInt(hoursValue, 10);
  const minutes = Number.parseInt(minutesValue, 10);
  const seconds = Number.parseInt(secondsValue, 10);
  const milliseconds = Number.parseInt(millisecondsValue, 10);

  return ((hours * 60 + minutes) * 60 + seconds) * 1000 + milliseconds;
}
