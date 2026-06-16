import { describe, expect, it } from "vitest";
import { orchestrateEditingRequest } from "./ai-orchestrator.js";
import { EDITING_INTENT_SCHEMA_VERSION } from "./intent-types.js";
import { MockLLMProvider } from "./llm-provider.js";
import type {
  LLMProvider,
  LLMRequest,
  LLMResponse
} from "./llm-provider-types.js";

describe("orchestrateEditingRequest", () => {
  it("routes supported single-action requests through the rule parser", async () => {
    const provider = new TrackingLLMProvider(
      JSON.stringify([
        {
          schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
          type: "clip.delete",
          payload: {
            clipId: "clip_from_provider"
          }
        }
      ])
    );

    await expect(
      orchestrateEditingRequest("trim clip_7 to 5 seconds", provider)
    ).resolves.toEqual([
      {
        schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
        type: "clip.trim",
        payload: {
          clipId: "clip_7",
          duration: 5000
        }
      }
    ]);
    expect(provider.callCount).toBe(0);
  });

  it("routes supported multi-action requests through the multi-intent parser", async () => {
    const provider = new TrackingLLMProvider("[]");

    await expect(
      orchestrateEditingRequest(
        "delete clip_9 and split clip_8 at 3000 ms",
        provider
      )
    ).resolves.toEqual([
      {
        schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
        type: "clip.delete",
        payload: {
          clipId: "clip_9"
        }
      },
      {
        schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
        type: "clip.split",
        payload: {
          clipId: "clip_8",
          splitAt: 3000
        }
      }
    ]);
    expect(provider.callCount).toBe(0);
  });

  it("uses the AI intent generator when rule parsing fails", async () => {
    const provider = new TrackingLLMProvider(
      JSON.stringify([
        {
          schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
          type: "scene.replace",
          payload: {
            sceneNumber: 4
          }
        }
      ])
    );

    await expect(
      orchestrateEditingRequest("make scene four punchier", provider)
    ).resolves.toEqual([
      {
        schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
        type: "scene.replace",
        payload: {
          sceneNumber: 4
        }
      }
    ]);
    expect(provider.callCount).toBe(1);
    expect(provider.lastRequest).toEqual({
      prompt: "make scene four punchier"
    });
  });

  it("rejects invalid AI fallback output", async () => {
    const provider = new MockLLMProvider({
      defaultResponse: JSON.stringify([
        {
          schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
          type: "clip.trim",
          payload: {
            clipId: "clip_7",
            duration: 0
          }
        }
      ])
    });

    await expect(
      orchestrateEditingRequest("shorten the important clip", provider)
    ).rejects.toThrow("/payload/duration: INVALID_NUMBER");
  });

  it("is deterministic for identical requests and mock provider responses", async () => {
    const response = JSON.stringify([
      {
        schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
        type: "clip.move",
        payload: {
          clipId: "clip_10",
          placement: "after",
          targetClipId: "clip_20"
        }
      }
    ]);
    const leftProvider = new MockLLMProvider({
      defaultResponse: response
    });
    const rightProvider = new MockLLMProvider({
      defaultResponse: response
    });
    const request = "move the selected clip later";

    await expect(orchestrateEditingRequest(request, leftProvider)).resolves.toEqual(
      await orchestrateEditingRequest(request, rightProvider)
    );
  });

  it("returns immutable intents without mutating caller data", async () => {
    const request = "replace scene 12";
    const provider = new TrackingLLMProvider("[]");

    const intents = await orchestrateEditingRequest(request, provider);

    expect(request).toBe("replace scene 12");
    expect(provider.callCount).toBe(0);
    expect(Object.isFrozen(intents)).toBe(true);
    expect(Object.isFrozen(intents[0])).toBe(true);
    expect(Object.isFrozen(intents[0]?.payload)).toBe(true);
    expect(() => {
      intents.push({
        schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
        type: "clip.delete",
        payload: {
          clipId: "clip_extra"
        }
      });
    }).toThrow();
  });
});

class TrackingLLMProvider implements LLMProvider {
  callCount = 0;
  lastRequest: LLMRequest | undefined;

  constructor(private readonly response: string) {}

  async generate(request: LLMRequest): Promise<LLMResponse> {
    this.callCount += 1;
    this.lastRequest = {
      ...request
    };

    return {
      content: this.response
    };
  }
}
