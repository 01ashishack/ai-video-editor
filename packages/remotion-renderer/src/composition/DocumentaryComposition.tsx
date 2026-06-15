import { Sequence } from "remotion";
import type { RendererComposition } from "../renderer-types.js";
import { RenderItem } from "./RenderItem.js";

export interface DocumentaryCompositionProps {
  composition: RendererComposition;
}

export function DocumentaryComposition({
  composition
}: DocumentaryCompositionProps) {
  return (
    <>
      {composition.items.map((item) => (
        <Sequence
          key={item.id}
          from={item.fromFrame}
          durationInFrames={item.durationInFrames}
        >
          <RenderItem item={item} />
        </Sequence>
      ))}
    </>
  );
}
