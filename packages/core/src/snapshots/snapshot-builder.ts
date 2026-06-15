import {
  deserializeProject,
  serializeProject,
  type Project
} from "../project/index.js";

export interface ProjectSnapshot {
  snapshotVersion: "0.1";
  sequence: number;
  createdAt: string;
  projectHash: string;
  project: string;
}

export function createProjectSnapshot(
  sequence: number,
  project: Project,
  createdAt: string
): ProjectSnapshot {
  return {
    snapshotVersion: "0.1",
    sequence,
    createdAt,
    projectHash: project.metadata.contentHash,
    project: serializeProject(project)
  };
}

export function restoreProjectSnapshot(snapshot: ProjectSnapshot): Project {
  return deserializeProject(snapshot.project);
}
