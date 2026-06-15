import { Audio, Img, OffthreadVideo } from "remotion";
import type { RendererItem } from "../renderer-types.js";

export type RenderableItem = RendererItem & {
  src?: string;
};

export interface RenderItemProps {
  item: RenderableItem;
}

export function RenderItem({ item }: RenderItemProps) {
  if (item.componentType === "Video") {
    return VideoItem({
      src: item.src
    });
  }

  if (item.componentType === "Image") {
    return ImageItem({
      src: item.src
    });
  }

  if (item.componentType === "Audio") {
    return AudioItem({
      src: item.src
    });
  }

  if (item.componentType === "Placeholder") {
    return PlaceholderItem();
  }

  return null;
}

export interface MediaItemProps {
  src?: string;
}

export function VideoItem({ src }: MediaItemProps) {
  if (!src) {
    return null;
  }

  return <OffthreadVideo src={src} />;
}

export function ImageItem({ src }: MediaItemProps) {
  if (!src) {
    return null;
  }

  return <Img src={src} />;
}

export function AudioItem({ src }: MediaItemProps) {
  if (!src) {
    return null;
  }

  return <Audio src={src} />;
}

export function PlaceholderItem() {
  return null;
}
