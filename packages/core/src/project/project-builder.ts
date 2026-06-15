import type { ID, ISODateString, ProjectSource } from "../models/index.js";
import { buildScenesFromSrt } from "../scenes/index.js";
import type { SrtDocument } from "../srt/index.js";
import { createProject } from "./project-factory.js";
import type { Project } from "./project-types.js";

export interface BuildProjectFromSrtOptions {
  projectId: ID;
  name: string;
  createdAt: ISODateString;
  sourceId: ID;
  sourceUri: string;
  importedAt?: ISODateString;
}

export function buildProjectFromSrt(
  document: SrtDocument,
  options: BuildProjectFromSrtOptions
): Project {
  const source: ProjectSource = {
    id: options.sourceId,
    kind: "srt",
    uri: options.sourceUri,
    importedAt: options.importedAt ?? options.createdAt,
    metadata: {
      cueCount: document.cues.length
    }
  };

  const project = createProject({
    projectId: options.projectId,
    name: options.name,
    createdAt: options.createdAt
  });

  return {
    ...project,
    sources: [source],
    scenes: buildScenesFromSrt(document, {
      sourceId: source.id
    })
  };
}
