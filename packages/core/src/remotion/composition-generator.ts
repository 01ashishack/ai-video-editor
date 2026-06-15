import type { RemotionComposition } from "./remotion-adapter.js";

export interface RenderNode {
  id: string;
  type: "video" | "image" | "audio" | "placeholder";
  fromFrame: number;
  durationInFrames: number;
  assetId?: string;
  sceneId?: string;
}

export interface GeneratedComposition {
  compositionId: string;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  nodes: RenderNode[];
}

export function generateCompositionGraph(
  composition: RemotionComposition
): GeneratedComposition {
  return {
    compositionId: composition.compositionId,
    durationInFrames: composition.durationInFrames,
    fps: composition.fps,
    width: composition.width,
    height: composition.height,
    nodes: composition.clips.map((clip) => ({
      id: clip.id,
      type: toRenderNodeType(clip.mediaType),
      fromFrame: clip.fromFrame,
      durationInFrames: clip.durationInFrames,
      assetId: clip.assetId,
      sceneId: clip.sceneId
    }))
  };
}

function toRenderNodeType(
  mediaType: string
): "video" | "image" | "audio" | "placeholder" {
  if (mediaType === "video") {
    return "video";
  }

  if (mediaType === "image") {
    return "image";
  }

  if (mediaType === "audio") {
    return "audio";
  }

  return "placeholder";
}
