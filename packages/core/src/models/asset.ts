import type { ID } from "./ids.js";
import type { ISODateString, Rational, Ticks } from "./time.js";
import type { FileFingerprint } from "./source.js";

export interface AssetMediaMetadata {
  duration?: Ticks;
  width?: number;
  height?: number;
  frameRate?: Rational;
  sampleRate?: number;
  channels?: number;
  codec?: string;
  container?: string;
}

export interface AssetAnalysis {
  keywords?: string[];
  transcript?: string;
  thumbnailUri?: string;
  waveformUri?: string;
}

export interface Asset {
  id: ID;
  kind: "video" | "audio" | "image";
  uri: string;
  displayName: string;
  importedAt: ISODateString;
  fingerprint?: FileFingerprint;
  media: AssetMediaMetadata;
  tags: string[];
  notes?: string;
  status: "online" | "missing" | "unsupported" | "pending-analysis";
  analysis?: AssetAnalysis;
}
