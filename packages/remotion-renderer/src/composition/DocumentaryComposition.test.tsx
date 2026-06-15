import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode
} from "react";
import { describe, expect, it, vi } from "vitest";
import type { RendererComposition, RendererItem } from "../renderer-types.js";
import { DocumentaryComposition } from "./DocumentaryComposition.js";
import { RenderItem } from "./RenderItem.js";

vi.mock("remotion", () => ({
  Audio: ({ children }: { children?: ReactNode }) => children ?? null,
  Img: ({ children }: { children?: ReactNode }) => children ?? null,
  OffthreadVideo: ({ children }: { children?: ReactNode }) => children ?? null,
  Sequence: ({ children }: { children: ReactNode }) => children
}));

interface SequenceProps {
  from: number;
  durationInFrames: number;
  children: ReactElement<{
    item: RendererItem;
  }>;
}

function createComposition(items: RendererItem[] = []): RendererComposition {
  return {
    compositionId: "project_001_composition",
    durationInFrames: 120,
    fps: 30,
    width: 1920,
    height: 1080,
    items
  };
}

function createItem(
  id: string,
  fromFrame: number,
  durationInFrames: number
): RendererItem {
  return {
    id,
    componentType: "Video",
    fromFrame,
    durationInFrames
  };
}

function getSequenceElements(
  composition: RendererComposition
): ReactElement<SequenceProps>[] {
  const element = DocumentaryComposition({
    composition
  }) as ReactElement<{
    children?: ReactNode;
  }>;

  return Children.toArray(element.props.children).filter(
    isValidElement
  ) as ReactElement<SequenceProps>[];
}

function summarizeComposition(composition: RendererComposition) {
  return getSequenceElements(composition).map((sequence) => ({
    from: sequence.props.from,
    durationInFrames: sequence.props.durationInFrames,
    childType: sequence.props.children.type,
    item: sequence.props.children.props.item
  }));
}

describe("DocumentaryComposition", () => {
  it("renders without crashing", () => {
    const composition = createComposition([createItem("item_001", 0, 30)]);

    expect(() => DocumentaryComposition({ composition })).not.toThrow();
  });

  it("renders all items", () => {
    const composition = createComposition([
      createItem("item_001", 0, 30),
      createItem("item_002", 30, 60)
    ]);

    expect(getSequenceElements(composition)).toHaveLength(2);
  });

  it("preserves order", () => {
    const composition = createComposition([
      createItem("item_001", 0, 30),
      createItem("item_002", 30, 60),
      createItem("item_003", 90, 30)
    ]);

    expect(
      getSequenceElements(composition).map(
        (sequence) => sequence.props.children.props.item.id
      )
    ).toEqual(["item_001", "item_002", "item_003"]);
  });

  it("passes frame timing correctly", () => {
    const composition = createComposition([
      createItem("item_001", 12, 48),
      createItem("item_002", 60, 30)
    ]);

    expect(
      getSequenceElements(composition).map((sequence) => ({
        from: sequence.props.from,
        durationInFrames: sequence.props.durationInFrames
      }))
    ).toEqual([
      {
        from: 12,
        durationInFrames: 48
      },
      {
        from: 60,
        durationInFrames: 30
      }
    ]);
  });

  it("supports empty compositions", () => {
    expect(getSequenceElements(createComposition())).toEqual([]);
  });

  it("creates deterministic output", () => {
    const composition = createComposition([
      createItem("item_001", 0, 30),
      createItem("item_002", 30, 60)
    ]);

    expect(summarizeComposition(composition)).toEqual(
      summarizeComposition(composition)
    );
  });

  it("uses RenderItem for every item", () => {
    const composition = createComposition([
      createItem("item_001", 0, 30),
      createItem("item_002", 30, 60)
    ]);

    expect(
      getSequenceElements(composition).map(
        (sequence) => sequence.props.children.type
      )
    ).toEqual([RenderItem, RenderItem]);
  });
});
