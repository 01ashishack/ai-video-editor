import type {
  ValidationError,
  ValidationWarning
} from "../models/index.js";
import type { Project } from "../project/index.js";

export interface TimelineValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export function validateTimeline(project: Project): TimelineValidationResult {
  const errors: ValidationError[] = [];
  const sceneIds = new Set(project.scenes.map((scene) => scene.id));
  const assetIds = new Set(project.assets.map((asset) => asset.id));
  const clipIds = new Set<string>();
  const duplicateClipIds = new Set<string>();

  for (const track of project.timeline.tracks) {
    for (const clip of track.clips) {
      if (clipIds.has(clip.id)) {
        duplicateClipIds.add(clip.id);
      }

      clipIds.add(clip.id);

      if (clip.timelineRange.start < 0) {
        errors.push({
          code: "NEGATIVE_CLIP_START",
          message: `Clip start must be >= 0. ${clip.id}`,
          path: "/timeline/tracks"
        });
      }

      if (clip.timelineRange.duration <= 0) {
        errors.push({
          code: "INVALID_CLIP_DURATION",
          message: `Clip duration must be > 0. ${clip.id}`,
          path: "/timeline/tracks"
        });
      }

      if (clip.sceneId && !sceneIds.has(clip.sceneId)) {
        errors.push({
          code: "ORPHANED_SCENE_REFERENCE",
          message: `Scene not found. ${clip.sceneId}`,
          path: "/timeline/tracks"
        });
      }

      if (clip.source?.assetId && !assetIds.has(clip.source.assetId)) {
        errors.push({
          code: "ORPHANED_ASSET_REFERENCE",
          message: `Asset not found. ${clip.source.assetId}`,
          path: "/timeline/tracks"
        });
      }
    }

    for (let leftIndex = 0; leftIndex < track.clips.length; leftIndex += 1) {
      const leftClip = track.clips[leftIndex]!;
      const leftStart = leftClip.timelineRange.start;
      const leftEnd = leftStart + leftClip.timelineRange.duration;

      for (
        let rightIndex = leftIndex + 1;
        rightIndex < track.clips.length;
        rightIndex += 1
      ) {
        const rightClip = track.clips[rightIndex]!;
        const rightStart = rightClip.timelineRange.start;
        const rightEnd = rightStart + rightClip.timelineRange.duration;

        if (leftStart < rightEnd && rightStart < leftEnd) {
          errors.push({
            code: "OVERLAPPING_CLIPS",
            message: `Overlapping clips on track ${track.id}`,
            path: "/timeline/tracks"
          });
        }
      }
    }
  }

  for (const clipId of duplicateClipIds) {
    errors.push({
      code: "DUPLICATE_TIMELINE_CLIP_ID",
      message: `Duplicate timeline clip id. ${clipId}`,
      path: "/timeline/tracks"
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: []
  };
}
