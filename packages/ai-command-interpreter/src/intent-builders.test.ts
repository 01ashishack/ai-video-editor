import { describe, expect, it } from "vitest";
import {
  createClipDeleteIntent,
  createClipMoveIntent,
  createClipSplitIntent,
  createClipTrimIntent,
  createEditingIntent,
  createSceneReplaceIntent
} from "./intent-builders.js";

describe("editing intent builders", () => {
  it("creates valid scene replace intents", () => {
    expect(
      createSceneReplaceIntent({
        sceneId: "scene_001",
        text: "Replace this scene with a tighter narration."
      })
    ).toEqual({
      schemaVersion: "0.1",
      type: "scene.replace",
      payload: {
        sceneId: "scene_001",
        text: "Replace this scene with a tighter narration."
      }
    });
  });

  it("creates valid clip move intents", () => {
    expect(
      createClipMoveIntent({
        clipId: "clip_001",
        start: 1200
      })
    ).toEqual({
      schemaVersion: "0.1",
      type: "clip.move",
      payload: {
        clipId: "clip_001",
        start: 1200
      }
    });
  });

  it("creates valid clip trim intents", () => {
    expect(
      createClipTrimIntent({
        clipId: "clip_001",
        duration: 2400
      })
    ).toEqual({
      schemaVersion: "0.1",
      type: "clip.trim",
      payload: {
        clipId: "clip_001",
        duration: 2400
      }
    });
  });

  it("creates valid clip split intents", () => {
    expect(
      createClipSplitIntent({
        clipId: "clip_001",
        splitAt: 1000
      })
    ).toEqual({
      schemaVersion: "0.1",
      type: "clip.split",
      payload: {
        clipId: "clip_001",
        splitAt: 1000
      }
    });
  });

  it("creates valid clip delete intents", () => {
    expect(
      createClipDeleteIntent({
        clipId: "clip_001"
      })
    ).toEqual({
      schemaVersion: "0.1",
      type: "clip.delete",
      payload: {
        clipId: "clip_001"
      }
    });
  });

  it("creates intents through the generic request factory", () => {
    expect(
      createEditingIntent({
        type: "clip.trim",
        payload: {
          clipId: "clip_001",
          duration: 1800
        }
      })
    ).toEqual(createClipTrimIntent({ clipId: "clip_001", duration: 1800 }));
  });

  it("rejects invalid payloads", () => {
    expect(() =>
      createClipMoveIntent({
        clipId: "clip_001",
        start: -1
      })
    ).toThrow("/payload/start: INVALID_NUMBER");

    expect(() =>
      createSceneReplaceIntent({
        sceneId: "",
        text: "Replacement text."
      })
    ).toThrow("/payload/sceneId: INVALID_STRING");
  });

  it("creates deterministic output for identical requests", () => {
    const request = {
      type: "clip.split" as const,
      payload: {
        clipId: "clip_001",
        splitAt: 900
      }
    };

    expect(createEditingIntent(request)).toEqual(createEditingIntent(request));
  });

  it("does not mutate input payload objects", () => {
    const payload = {
      clipId: "clip_001",
      duration: 2400
    };

    const intent = createClipTrimIntent(payload);
    payload.duration = 3600;

    expect(intent.payload.duration).toBe(2400);
  });

  it("returns immutable intents", () => {
    const intent = createClipDeleteIntent({
      clipId: "clip_001"
    });

    expect(Object.isFrozen(intent)).toBe(true);
    expect(Object.isFrozen(intent.payload)).toBe(true);
    expect(() => {
      (intent.payload as { clipId: string }).clipId = "clip_changed";
    }).toThrow();
    expect(intent.payload.clipId).toBe("clip_001");
  });
});
