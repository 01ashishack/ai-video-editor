import type { Ticks } from "../models/index.js";

export interface SrtCue {
  index: number;
  start: Ticks;
  end: Ticks;
  rawText: string;
}

export interface SrtDocument {
  cues: SrtCue[];
}
