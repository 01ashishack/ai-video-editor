import { describe, expect, it } from "vitest";
import {
  createClipDeleteIntent,
  createClipMoveIntent,
  createClipSplitIntent,
  createClipTrimIntent,
  createSceneReplaceIntent
} from "./intent-builders.js";
import type { EditingIntent } from "./intent-types.js";
import { planEditingIntent } from "./planner.js";

describe("planEditingIntent", () => {
  it("plans scene replace intents", () => {
    const intent = createSceneReplaceIntent({
      sceneNumber: 4
    });

    expect(planEditingIntent(intent)).toEqual([
      {
        schemaVersion: "0.1",
        type: "scene.replace",
        payload: {
          sceneNumber: 4
        }
      }
    ]);
  });

  it("plans clip move intents", () => {
    const intent = createClipMoveIntent({
      clipId: "clip_10",
      placement: "after",
      targetClipId: "clip_20"
    });

    expect(planEditingIntent(intent)).toEqual([
      {
        schemaVersion: "0.1",
        type: "clip.move",
        payload: {
          clipId: "clip_10",
          placement: "after",
          targetClipId: "clip_20"
        }
      }
    ]);
  });

  it("plans clip trim intents", () => {
    const intent = createClipTrimIntent({
      clipId: "clip_7",
      duration: 5000
    });

    expect(planEditingIntent(intent)).toEqual([
      {
        schemaVersion: "0.1",
        type: "clip.trim",
        payload: {
          clipId: "clip_7",
          duration: 5000
        }
      }
    ]);
  });

  it("plans clip split intents", () => {
    const intent = createClipSplitIntent({
      clipId: "clip_8",
      splitAt: 3000
    });

    expect(planEditingIntent(intent)).toEqual([
      {
        schemaVersion: "0.1",
        type: "clip.split",
        payload: {
          clipId: "clip_8",
          splitAt: 3000
        }
      }
    ]);
  });

  it("plans clip delete intents", () => {
    const intent = createClipDeleteIntent({
      clipId: "clip_9"
    });

    expect(planEditingIntent(intent)).toEqual([
      {
        schemaVersion: "0.1",
        type: "clip.delete",
        payload: {
          clipId: "clip_9"
        }
      }
    ]);
  });

  it("produces stable output for identical inputs", () => {
    const intent = createClipTrimIntent({
      clipId: "clip_7",
      duration: 5000
    });

    expect(planEditingIntent(intent)).toEqual(planEditingIntent(intent));
  });

  it("does not mutate input intents", () => {
    const intent = createClipMoveIntent({
      clipId: "clip_10",
      start: 1200
    });
    const originalIntent = structuredClone(intent);
    const plan = planEditingIntent(intent);

    expect(intent).toEqual(originalIntent);
    expect(plan[0]?.payload).not.toBe(intent.payload);
    expect(Object.isFrozen(plan)).toBe(true);
    expect(Object.isFrozen(plan[0])).toBe(true);
    expect(Object.isFrozen(plan[0]?.payload)).toBe(true);
  });

  it("rejects invalid intents", () => {
    expect(() =>
      planEditingIntent({
        schemaVersion: "0.1",
        type: "clip.trim",
        payload: {
          clipId: "clip_7",
          duration: 0
        }
      } as EditingIntent)
    ).toThrow("/payload/duration: INVALID_NUMBER");
  });
});
