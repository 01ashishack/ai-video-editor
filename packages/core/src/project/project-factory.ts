import type { Timeline } from "../models/index.js";
import type { Project, ProjectFactoryOptions } from "./project-types.js";

export function createProject(options: ProjectFactoryOptions): Project {
  return {
    id: options.projectId,
    schemaVersion: "0.1",
    name: options.name,
    metadata: {
      commandCount: 0,
      hashAlgorithm: "sha256",
      contentHash: ""
    },
    sources: [],
    assets: [],
    scenes: [],
    timeline: createEmptyTimeline(options.projectId),
    createdAt: options.createdAt,
    updatedAt: options.createdAt
  };
}

function createEmptyTimeline(projectId: string): Timeline {
  return {
    id: `${projectId}_timeline`,
    tracks: [],
    transitions: [],
    markers: []
  };
}
