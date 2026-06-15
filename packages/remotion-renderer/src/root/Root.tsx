import { Composition, getInputProps } from "remotion";
import type { ComponentType } from "react";
import { toRemotionCompositionId } from "../composition/composition-id.js";
import { DocumentaryComposition } from "../composition/index.js";
import type { RendererComposition } from "../renderer-types.js";

export interface RootProps {
  composition?: RendererComposition;
}

export function Root({ composition }: RootProps) {
  const inputProps = getInputProps() as RootProps;
  const resolvedComposition = composition ?? inputProps.composition;

  if (!resolvedComposition) {
    return null;
  }

  return (
    <Composition
      id={toRemotionCompositionId(resolvedComposition.compositionId)}
      component={
        DocumentaryComposition as unknown as ComponentType<Record<string, unknown>>
      }
      durationInFrames={resolvedComposition.durationInFrames}
      fps={resolvedComposition.fps}
      width={resolvedComposition.width}
      height={resolvedComposition.height}
      defaultProps={{
        composition: resolvedComposition
      }}
    />
  );
}
