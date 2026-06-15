import { createHash } from "node:crypto";
import type { Project } from "./project-types.js";
import { serializeProject } from "./project-store.js";

export function calculateProjectHash(project: Project): string {
  const hashableProject = clearContentHash(project);
  const serializedProject = serializeProject(hashableProject);

  return createHash("sha256").update(serializedProject, "utf8").digest("hex");
}

export function updateProjectMetadata(
  project: Project,
  commandId?: string
): Project {
  const projectWithUpdatedMetadata: Project = {
    ...project,
    metadata: {
      ...project.metadata,
      commandCount: project.metadata.commandCount + 1,
      lastCommandId: commandId ?? project.metadata.lastCommandId,
      contentHash: ""
    }
  };
  const contentHash = calculateProjectHash(projectWithUpdatedMetadata);

  return {
    ...projectWithUpdatedMetadata,
    metadata: {
      ...projectWithUpdatedMetadata.metadata,
      contentHash
    }
  };
}

function clearContentHash(project: Project): Project {
  return {
    ...project,
    metadata: {
      ...project.metadata,
      contentHash: ""
    }
  };
}
