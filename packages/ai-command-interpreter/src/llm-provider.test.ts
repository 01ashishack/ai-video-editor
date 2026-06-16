import { describe, expect, it } from "vitest";
import { MockLLMProvider } from "./llm-provider.js";

describe("MockLLMProvider", () => {
  it("invokes provider with a request", async () => {
    const provider = new MockLLMProvider({
      defaultResponse: "mock response"
    });

    await expect(
      provider.generate({
        prompt: "Generate an editing intent."
      })
    ).resolves.toEqual({
      content: "mock response"
    });
  });

  it("returns deterministic responses", async () => {
    const leftProvider = new MockLLMProvider({
      responses: ["first", "second"],
      defaultResponse: "fallback"
    });
    const rightProvider = new MockLLMProvider({
      responses: ["first", "second"],
      defaultResponse: "fallback"
    });
    const request = {
      prompt: "Same prompt."
    };

    await expect(leftProvider.generate(request)).resolves.toEqual(
      await rightProvider.generate(request)
    );
    await expect(leftProvider.generate(request)).resolves.toEqual(
      await rightProvider.generate(request)
    );
    await expect(leftProvider.generate(request)).resolves.toEqual(
      await rightProvider.generate(request)
    );
  });

  it("supports configurable responses", async () => {
    const provider = new MockLLMProvider({
      responses: ["first", "second"],
      defaultResponse: "fallback"
    });
    const request = {
      prompt: "Return configured response."
    };

    await expect(provider.generate(request)).resolves.toEqual({
      content: "first"
    });
    await expect(provider.generate(request)).resolves.toEqual({
      content: "second"
    });
    await expect(provider.generate(request)).resolves.toEqual({
      content: "fallback"
    });
  });

  it("rejects invalid requests", async () => {
    const provider = new MockLLMProvider();

    await expect(
      provider.generate({
        prompt: ""
      })
    ).rejects.toThrow("LLM request prompt must be a non-empty string.");
    await expect(provider.generate(null as never)).rejects.toThrow(
      "LLM request must be an object."
    );
  });
});
