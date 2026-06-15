import { registerRoot } from "remotion";
import { describe, expect, it, vi } from "vitest";

vi.mock("remotion", () => ({
  Audio: () => null,
  Composition: () => null,
  getInputProps: () => ({}),
  Img: () => null,
  OffthreadVideo: () => null,
  registerRoot: vi.fn(),
  Sequence: ({ children }: { children: unknown }) => children
}));

describe("remotion-root", () => {
  it("registers Root with Remotion", async () => {
    vi.resetModules();
    vi.mocked(registerRoot).mockClear();
    const { Root } = await import("./root/index.js");

    await import("./remotion-root.js");

    expect(registerRoot).toHaveBeenCalledTimes(1);
    expect(registerRoot).toHaveBeenCalledWith(Root);
  });
});
