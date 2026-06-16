import type { Project, TimelineClip } from "@aide/core";
import type { EditingIntent } from "./intent-types.js";
import type {
  ResolvedClipMoveIntent,
  ResolvedIntent,
  ResolvedSceneReplaceIntent
} from "./resolver-types.js";

export function resolveEditingIntent(
  project: Project,
  intent: EditingIntent
): ResolvedIntent {
  switch (intent.type) {
    case "scene.replace":
      return freezeResolvedIntent({
        schemaVersion: intent.schemaVersion,
        type: "scene.replace",
        payload: resolveSceneReplacePayload(project, intent.payload)
      });
    case "clip.move":
      return freezeResolvedIntent({
        schemaVersion: intent.schemaVersion,
        type: "clip.move",
        payload: resolveClipMovePayload(project, intent.payload)
      });
    case "clip.trim":
      return freezeResolvedIntent({
        schemaVersion: intent.schemaVersion,
        type: "clip.trim",
        payload: {
          clipId: resolveClipId(project, intent.payload),
          duration: intent.payload.duration
        }
      });
    case "clip.split":
      return freezeResolvedIntent({
        schemaVersion: intent.schemaVersion,
        type: "clip.split",
        payload: {
          clipId: resolveClipId(project, intent.payload),
          splitAt: intent.payload.splitAt
        }
      });
    case "clip.delete":
      return freezeResolvedIntent({
        schemaVersion: intent.schemaVersion,
        type: "clip.delete",
        payload: {
          clipId: resolveClipId(project, intent.payload)
        }
      });
  }
}

function resolveSceneReplacePayload(
  project: Project,
  payload: Readonly<Record<string, unknown>>
): ResolvedSceneReplaceIntent["payload"] {
  if (typeof payload.sceneId === "string") {
    assertSceneExists(project, payload.sceneId);

    return typeof payload.text === "string"
      ? {
          sceneId: payload.sceneId,
          text: payload.text
        }
      : {
          sceneId: payload.sceneId
        };
  }

  if (typeof payload.sceneNumber === "number") {
    return {
      sceneId: resolveSceneId(project, payload.sceneNumber)
    };
  }

  throw new Error("Scene reference missing.");
}

function resolveClipMovePayload(
  project: Project,
  payload: Readonly<Record<string, unknown>>
): ResolvedClipMoveIntent["payload"] {
  const clipId = resolveClipId(project, payload);

  if (typeof payload.start === "number") {
    return {
      clipId,
      start: payload.start
    };
  }

  if (payload.placement !== "before" && payload.placement !== "after") {
    throw new Error("Relative clip move placement missing.");
  }

  const targetClip = resolveTargetClip(project, payload);
  const start =
    payload.placement === "before"
      ? targetClip.timelineRange.start
      : targetClip.timelineRange.start + targetClip.timelineRange.duration;

  return {
    clipId,
    start
  };
}

function resolveSceneId(project: Project, sceneNumber: number): string {
  const scene = project.scenes.find((item) => item.order === sceneNumber);

  if (!scene) {
    throw new Error(`Scene not found for number: ${sceneNumber}.`);
  }

  return scene.id;
}

function assertSceneExists(project: Project, sceneId: string): void {
  if (!project.scenes.some((scene) => scene.id === sceneId)) {
    throw new Error(`Scene not found: ${sceneId}.`);
  }
}

function resolveClipId(
  project: Project,
  payload: Readonly<Record<string, unknown>>
): string {
  if (typeof payload.clipId === "string") {
    assertClipExists(project, payload.clipId);
    return payload.clipId;
  }

  if (typeof payload.clipNumber === "number") {
    return resolveClipByNumber(project, payload.clipNumber).id;
  }

  throw new Error("Clip reference missing.");
}

function resolveTargetClip(
  project: Project,
  payload: Readonly<Record<string, unknown>>
): TimelineClip {
  if (typeof payload.targetClipId === "string") {
    return findClipById(project, payload.targetClipId);
  }

  if (typeof payload.targetClipNumber === "number") {
    return resolveClipByNumber(project, payload.targetClipNumber);
  }

  throw new Error("Target clip reference missing.");
}

function assertClipExists(project: Project, clipId: string): void {
  findClipById(project, clipId);
}

function findClipById(project: Project, clipId: string): TimelineClip {
  const clip = flattenClips(project).find((item) => item.id === clipId);

  if (!clip) {
    throw new Error(`Clip not found: ${clipId}.`);
  }

  return clip;
}

function resolveClipByNumber(project: Project, clipNumber: number): TimelineClip {
  if (!Number.isInteger(clipNumber) || clipNumber <= 0) {
    throw new Error(`Clip not found for number: ${clipNumber}.`);
  }

  const clip = flattenClips(project)[clipNumber - 1];

  if (!clip) {
    throw new Error(`Clip not found for number: ${clipNumber}.`);
  }

  return clip;
}

function flattenClips(project: Project): TimelineClip[] {
  return project.timeline.tracks.flatMap((track) => track.clips);
}

function freezeResolvedIntent<TIntent extends ResolvedIntent>(
  intent: TIntent
): TIntent {
  Object.freeze(intent.payload);
  return Object.freeze(intent);
}
