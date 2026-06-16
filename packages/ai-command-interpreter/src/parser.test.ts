import { describe, expect, it } from "vitest";
import { parseEditingIntent } from "./parser.js";

describe("parseEditingIntent", () => {
  it("parses scene replace requests", () => {
    expect(parseEditingIntent("replace scene 4")).toEqual({
      schemaVersion: "0.1",
      type: "scene.replace",
      payload: {
        sceneNumber: 4
      }
    });
    expect(parseEditingIntent("replace scene 12")).toEqual({
      schemaVersion: "0.1",
      type: "scene.replace",
      payload: {
        sceneNumber: 12
      }
    });
  });

  it("parses clip move requests", () => {
    expect(parseEditingIntent("move clip_10 after clip_20")).toEqual({
      schemaVersion: "0.1",
      type: "clip.move",
      payload: {
        clipId: "clip_10",
        placement: "after",
        targetClipId: "clip_20"
      }
    });
    expect(parseEditingIntent("move clip_10 before clip_20")).toEqual({
      schemaVersion: "0.1",
      type: "clip.move",
      payload: {
        clipId: "clip_10",
        placement: "before",
        targetClipId: "clip_20"
      }
    });
  });

  it("parses clip trim requests", () => {
    expect(parseEditingIntent("trim clip_7 to 5 seconds")).toEqual({
      schemaVersion: "0.1",
      type: "clip.trim",
      payload: {
        clipId: "clip_7",
        duration: 5000
      }
    });
    expect(parseEditingIntent("trim clip_7 to 5000 ms")).toEqual({
      schemaVersion: "0.1",
      type: "clip.trim",
      payload: {
        clipId: "clip_7",
        duration: 5000
      }
    });
  });

  it("parses clip split requests", () => {
    expect(parseEditingIntent("split clip_8 at 3 seconds")).toEqual({
      schemaVersion: "0.1",
      type: "clip.split",
      payload: {
        clipId: "clip_8",
        splitAt: 3000
      }
    });
    expect(parseEditingIntent("split clip_8 at 3000 ms")).toEqual({
      schemaVersion: "0.1",
      type: "clip.split",
      payload: {
        clipId: "clip_8",
        splitAt: 3000
      }
    });
  });

  it("parses clip delete requests", () => {
    expect(parseEditingIntent("delete clip_9")).toEqual({
      schemaVersion: "0.1",
      type: "clip.delete",
      payload: {
        clipId: "clip_9"
      }
    });
  });

  it("rejects invalid syntax", () => {
    expect(() => parseEditingIntent("replace scene zero")).toThrow(
      "Invalid editing request syntax."
    );
    expect(() => parseEditingIntent("trim clip_7 to five seconds")).toThrow(
      "Invalid editing request syntax."
    );
    expect(() => parseEditingIntent("move clip_10 after")).toThrow(
      "Invalid editing request syntax."
    );
  });

  it("rejects ambiguous requests", () => {
    for (const request of [
      "make scene better",
      "fix intro",
      "shorten it",
      "move this clip"
    ]) {
      expect(() => parseEditingIntent(request)).toThrow(
        "Ambiguous editing request."
      );
    }
  });

  it("normalizes whitespace", () => {
    expect(parseEditingIntent("  trim   clip_7   to   5   seconds  ")).toEqual(
      parseEditingIntent("trim clip_7 to 5 seconds")
    );
  });

  it("creates deterministic output", () => {
    const request = "split clip_8 at 3 seconds";

    expect(parseEditingIntent(request)).toEqual(parseEditingIntent(request));
  });

  it("returns immutable intents", () => {
    const intent = parseEditingIntent("delete clip_9");

    expect(Object.isFrozen(intent)).toBe(true);
    expect(Object.isFrozen(intent.payload)).toBe(true);
    expect(() => {
      (intent.payload as { clipId: string }).clipId = "clip_changed";
    }).toThrow();
    expect(intent.payload).toEqual({
      clipId: "clip_9"
    });
  });
});
