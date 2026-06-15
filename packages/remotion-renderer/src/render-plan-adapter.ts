import type { RenderPlan } from "@aide/core";
import type { RendererComposition } from "./renderer-types.js";

export function createRendererComposition(
  renderPlan: RenderPlan
): RendererComposition {
  return {
    compositionId: renderPlan.compositionId,
    durationInFrames: renderPlan.durationInFrames,
    fps: renderPlan.fps,
    width: renderPlan.width,
    height: renderPlan.height,
    items: renderPlan.items.map((item) => ({
      id: item.id,
      componentType: item.componentType,
      fromFrame: item.fromFrame,
      durationInFrames: item.durationInFrames,
      assetId: item.assetId,
      sceneId: item.sceneId
    }))
  };
}
