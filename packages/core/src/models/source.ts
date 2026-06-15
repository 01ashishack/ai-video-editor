import type { ID } from "./ids.js";
import type { ISODateString } from "./time.js";

export interface FileFingerprint {
  sizeBytes?: number;
  modifiedAt?: ISODateString;
  sha256?: string;
}

export interface ProjectSource {
  id: ID;
  kind: "srt" | "voiceover" | "asset-folder" | "manual";
  uri: string;
  importedAt: ISODateString;
  fingerprint?: FileFingerprint;
  metadata?: Record<string, unknown>;
}
