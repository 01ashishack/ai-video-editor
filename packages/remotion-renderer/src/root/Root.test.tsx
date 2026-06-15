import type { ReactElement, ReactNode } from "react";
import { Composition } from "remotion";
import { describe, expect, it, vi } from "vitest";
import { DocumentaryComposition } from "../composition/index.js";
import type { RendererComposition } from "../renderer-types.js";
import { Root } from "./Root.js";

vi.mock("remotion", () => ({
  Audio: ({ children }: { children?: ReactNode }) => children ?? null,
  Composition: () => null,
  getInputProps: () => ({}),
  Img: ({ children }: { children?: ReactNode }) => children ?? null,
  OffthreadVideo: ({ children }: { children?: ReactNode }) => children ?? null,
  Sequence: ({ children }: { children: ReactNode }) => children
}));

interface CompositionProps {
  id: string;
  component: typeof DocumentaryComposition;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  defaultProps: {
    composition: RendererComposition;
  };
}

function createComposition(): RendererComposition {
  return {
    compositionId: "project_001_composition",
    durationInFrames: 120,
    fps: 30,
    width: 1920,
    height: 1080,
    items: [
      {
        id: "item_001",
        componentType: "Video",
        fromFrame: 0,
        durationInFrames: 30
      }
    ]
  };
}

function renderRoot(
  composition: RendererComposition
): ReactElement<CompositionProps> {
  return Root({
    composition
  }) as ReactElement<CompositionProps>;
}

function summarizeRoot(composition: RendererComposition) {
  const element = renderRoot(composition);

  return {
    type: element.type,
    id: element.props.id,
    component: element.props.component,
    durationInFrames: element.props.durationInFrames,
    fps: element.props.fps,
    width: element.props.width,
    height: element.props.height,
    defaultProps: element.props.defaultProps
  };
}

describe("Root", () => {
  it("registers composition", () => {
    const element = renderRoot(createComposition());

    expect(element.type).toBe(Composition);
    expect(element.props.component).toBe(DocumentaryComposition);
  });

  it("passes id", () => {
    const composition = createComposition();

    expect(renderRoot(composition).props.id).toBe(
      "project-001-composition"
    );
  });

  it("passes fps", () => {
    const composition = createComposition();

    expect(renderRoot(composition).props.fps).toBe(30);
  });

  it("passes width", () => {
    const composition = createComposition();

    expect(renderRoot(composition).props.width).toBe(1920);
  });

  it("passes height", () => {
    const composition = createComposition();

    expect(renderRoot(composition).props.height).toBe(1080);
  });

  it("passes durationInFrames", () => {
    const composition = createComposition();

    expect(renderRoot(composition).props.durationInFrames).toBe(120);
  });

  it("passes composition via defaultProps", () => {
    const composition = createComposition();

    expect(renderRoot(composition).props.defaultProps).toEqual({
      composition
    });
  });

  it("creates deterministic output", () => {
    const composition = createComposition();

    expect(summarizeRoot(composition)).toEqual(summarizeRoot(composition));
  });

  it("does not mutate input", () => {
    const composition = createComposition();
    const originalComposition = structuredClone(composition);
    const originalItems = composition.items;

    renderRoot(composition);

    expect(composition).toEqual(originalComposition);
    expect(composition.items).toBe(originalItems);
  });
});
