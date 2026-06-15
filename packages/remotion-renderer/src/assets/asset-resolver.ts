import type { RendererComposition } from "../renderer-types.js";

export interface AssetSource {
  assetId: string;
  src: string;
}

export interface AssetResolver {
  resolve(assetId: string): string | undefined;
}

export interface ResolvedRenderItem {
  id: string;
  componentType: "Video" | "Image" | "Audio" | "Placeholder";
  fromFrame: number;
  durationInFrames: number;
  assetId?: string;
  sceneId?: string;
  src?: string;
}

export interface ResolvedRendererComposition {
  compositionId: string;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  items: ResolvedRenderItem[];
}

export function resolveRendererComposition(
  composition: RendererComposition,
  resolver: AssetResolver
): ResolvedRendererComposition {
  return {
    compositionId: composition.compositionId,
    durationInFrames: composition.durationInFrames,
    fps: composition.fps,
    width: composition.width,
    height: composition.height,
    items: composition.items.map((item) => ({
      id: item.id,
      componentType: item.componentType,
      fromFrame: item.fromFrame,
      durationInFrames: item.durationInFrames,
      assetId: item.assetId,
      sceneId: item.sceneId,
      src: item.assetId ? resolver.resolve(item.assetId) : undefined
    }))
  };
}
