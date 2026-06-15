import type { GeneratedComposition, RenderNode } from "./composition-generator.js";

export interface RenderPlanItem {
  id: string;
  componentType: "Video" | "Image" | "Audio" | "Placeholder";
  fromFrame: number;
  durationInFrames: number;
  assetId?: string;
  sceneId?: string;
}

export interface RenderPlan {
  compositionId: string;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  items: RenderPlanItem[];
}

export function buildRenderPlan(
  composition: GeneratedComposition
): RenderPlan {
  return {
    compositionId: composition.compositionId,
    durationInFrames: composition.durationInFrames,
    fps: composition.fps,
    width: composition.width,
    height: composition.height,
    items: composition.nodes.map((node) => ({
      id: node.id,
      componentType: toComponentType(node),
      fromFrame: node.fromFrame,
      durationInFrames: node.durationInFrames,
      assetId: node.assetId,
      sceneId: node.sceneId
    }))
  };
}

function toComponentType(
  node: RenderNode
): "Video" | "Image" | "Audio" | "Placeholder" {
  if (node.type === "video") {
    return "Video";
  }

  if (node.type === "image") {
    return "Image";
  }

  if (node.type === "audio") {
    return "Audio";
  }

  return "Placeholder";
}
