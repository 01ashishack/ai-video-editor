import { Player } from "@remotion/player";
import { DocumentaryComposition } from "../composition/index.js";
import type { RendererComposition } from "../renderer-types.js";

export interface PreviewPlayerProps {
  composition: RendererComposition;
  controls?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
}

export function PreviewPlayer({
  composition,
  controls = true,
  autoPlay = false,
  loop = false
}: PreviewPlayerProps) {
  return (
    <Player
      component={DocumentaryComposition}
      durationInFrames={composition.durationInFrames}
      fps={composition.fps}
      compositionWidth={composition.width}
      compositionHeight={composition.height}
      inputProps={{
        composition
      }}
      controls={controls}
      autoPlay={autoPlay}
      loop={loop}
    />
  );
}
