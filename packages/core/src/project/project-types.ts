import type {
  Asset,
  ID,
  ISODateString,
  ProjectSource,
  Scene,
  Timeline
} from "../models/index.js";

export interface ProjectMetadata {
  commandCount: number;
  lastCommandId?: ID;
  hashAlgorithm: "sha256";
  contentHash: string;
}

export interface Project {
  id: ID;
  schemaVersion: "0.1";
  name: string;
  metadata: ProjectMetadata;
  sources: ProjectSource[];
  assets: Asset[];
  scenes: Scene[];
  timeline: Timeline;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface ProjectFactoryOptions {
  projectId: ID;
  name: string;
  createdAt: ISODateString;
}
