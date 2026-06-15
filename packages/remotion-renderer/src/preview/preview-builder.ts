import {
  buildRemotionComposition,
  buildRenderPlan,
  generateCompositionGraph,
  type Project
} from "@aide/core";
import {
  resolveRendererComposition,
  type AssetResolver,
  type ResolvedRendererComposition
} from "../assets/index.js";
import { createRendererComposition } from "../render-plan-adapter.js";

export interface BuildPreviewCompositionOptions {
  resolver: AssetResolver;
  fps?: number;
  width?: number;
  height?: number;
}

export function buildPreviewComposition(
  project: Project,
  options: BuildPreviewCompositionOptions
): ResolvedRendererComposition {
  const remotionComposition = buildRemotionComposition(project, {
    fps: options.fps,
    width: options.width,
    height: options.height
  });
  const compositionGraph = generateCompositionGraph(remotionComposition);
  const renderPlan = buildRenderPlan(compositionGraph);
  const rendererComposition = createRendererComposition(renderPlan);

  return resolveRendererComposition(rendererComposition, options.resolver);
}
