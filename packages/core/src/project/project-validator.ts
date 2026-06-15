import type {
  ValidationError,
  ValidationWarning
} from "../models/index.js";
import type { Project } from "./project-types.js";

export interface ProjectValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export function validateProject(project: Project): ProjectValidationResult {
  const errors: ValidationError[] = [];

  if (!project.id) {
    errors.push({
      code: "PROJECT_ID_REQUIRED",
      message: "Project id is required.",
      path: "/id"
    });
  }

  if (!project.timeline) {
    errors.push({
      code: "PROJECT_TIMELINE_REQUIRED",
      message: "Project timeline is required.",
      path: "/timeline"
    });
  }

  errors.push(
    ...findDuplicateIds(
      project.scenes.map((scene) => scene.id),
      "DUPLICATE_SCENE_ID",
      "Duplicate scene id.",
      "/scenes"
    )
  );
  errors.push(
    ...findDuplicateIds(
      project.sources.map((source) => source.id),
      "DUPLICATE_SOURCE_ID",
      "Duplicate source id.",
      "/sources"
    )
  );
  errors.push(
    ...findDuplicateIds(
      project.timeline?.tracks.map((track) => track.id) ?? [],
      "DUPLICATE_TRACK_ID",
      "Duplicate track id.",
      "/timeline/tracks"
    )
  );
  errors.push(
    ...findDuplicateIds(
      project.scenes.map((scene) => String(scene.order)),
      "DUPLICATE_SCENE_ORDER",
      "Duplicate scene order.",
      "/scenes"
    )
  );
  errors.push(
    ...findDuplicateIds(
      project.timeline?.tracks.flatMap((track) =>
        track.clips.map((clip) => clip.id)
      ) ?? [],
      "DUPLICATE_TIMELINE_CLIP_ID",
      "Duplicate timeline clip id.",
      "/timeline/tracks"
    )
  );

  return {
    valid: errors.length === 0,
    errors,
    warnings: []
  };
}

function findDuplicateIds(
  values: string[],
  code: string,
  message: string,
  path: string
): ValidationError[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }

    seen.add(value);
  }

  return Array.from(duplicates).map((value) => ({
    code,
    message: `${message} ${value}`,
    path
  }));
}
