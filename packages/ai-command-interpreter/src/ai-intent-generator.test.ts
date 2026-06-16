import { describe, expect, it } from "vitest";
import { generateEditingIntents } from "./ai-intent-generator.js";
import { EDITING_INTENT_SCHEMA_VERSION } from "./intent-types.js";
import { MockLLMProvider } from "./llm-provider.js";

describe("generateEditingIntents", () => {
  it("generates a valid editing intent from provider output", async () => {
    const provider = new MockLLMProvider({
      defaultResponse: JSON.stringify([
        {
          schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
          type: "clip.trim",
          payload: {
            clipId: "clip_001",
            duration: 1200
          }
        }
      ])
    });

    await expect(
      generateEditingIntents("Trim clip_001 to 1200 ms.", provider)
    ).resolves.toEqual([
      {
        schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
        type: "clip.trim",
        payload: {
          clipId: "clip_001",
          duration: 1200
        }
      }
    ]);
  });

  it("generates multiple editing intents from provider output", async () => {
    const provider = new MockLLMProvider({
      defaultResponse: JSON.stringify({
        intents: [
          {
            schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
            type: "clip.delete",
            payload: {
              clipId: "clip_009"
            }
          },
          {
            schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
            type: "clip.split",
            payload: {
              clipId: "clip_008",
              splitAt: 3000
            }
          }
        ]
      })
    });

    await expect(
      generateEditingIntents("Delete clip_009, then split clip_008.", provider)
    ).resolves.toEqual([
      {
        schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
        type: "clip.delete",
        payload: {
          clipId: "clip_009"
        }
      },
      {
        schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
        type: "clip.split",
        payload: {
          clipId: "clip_008",
          splitAt: 3000
        }
      }
    ]);
  });

  it("rejects invalid generated intents", async () => {
    const provider = new MockLLMProvider({
      defaultResponse: JSON.stringify([
        {
          schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
          type: "clip.trim",
          payload: {
            clipId: "clip_001",
            duration: 0
          }
        }
      ])
    });

    await expect(
      generateEditingIntents("Trim clip_001.", provider)
    ).rejects.toThrow("/payload/duration: INVALID_NUMBER");
  });

  it("is deterministic with MockLLMProvider", async () => {
    const response = JSON.stringify([
      {
        schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
        type: "scene.replace",
        payload: {
          sceneNumber: 4
        }
      }
    ]);
    const leftProvider = new MockLLMProvider({
      defaultResponse: response
    });
    const rightProvider = new MockLLMProvider({
      defaultResponse: response
    });
    const request = "Replace scene 4.";

    await expect(generateEditingIntents(request, leftProvider)).resolves.toEqual(
      await generateEditingIntents(request, rightProvider)
    );
  });

  it("returns immutable intents without mutating provider output", async () => {
    const generated = [
      {
        schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
        type: "clip.move",
        payload: {
          clipId: "clip_010",
          placement: "after",
          targetClipId: "clip_020"
        }
      }
    ];
    const provider = new MockLLMProvider({
      defaultResponse: JSON.stringify(generated)
    });

    const intents = await generateEditingIntents(
      "Move clip_010 after clip_020.",
      provider
    );
    generated[0].payload.clipId = "clip_changed";

    expect(Object.isFrozen(intents)).toBe(true);
    expect(Object.isFrozen(intents[0])).toBe(true);
    expect(Object.isFrozen(intents[0]?.payload)).toBe(true);
    expect(() => {
      intents.push({
        schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
        type: "clip.delete",
        payload: {
          clipId: "clip_999"
        }
      });
    }).toThrow();
    expect(intents[0]).toEqual({
      schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
      type: "clip.move",
      payload: {
        clipId: "clip_010",
        placement: "after",
        targetClipId: "clip_020"
      }
    });
  });
});
