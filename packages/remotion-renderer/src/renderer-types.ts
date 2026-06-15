export interface RendererItem {
  id: string;
  componentType: "Video" | "Image" | "Audio" | "Placeholder";
  fromFrame: number;
  durationInFrames: number;
  assetId?: string;
  sceneId?: string;
}

export interface RendererComposition {
  compositionId: string;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  items: RendererItem[];
}
