import { describe, expect, it } from "vitest";
import { parseEditingIntent } from "./parser.js";
import { parseEditingIntents } from "./multi-intent-parser.js";

describe("parseEditingIntents", () => {
  it("parses two actions", () => {
    expect(
      parseEditingIntents("move clip_2 after clip_1 and trim clip_3 to 5 seconds")
    ).toEqual([
      parseEditingIntent("move clip_2 after clip_1"),
      parseEditingIntent("trim clip_3 to 5 seconds")
    ]);
  });

  it("parses three actions", () => {
    expect(
      parseEditingIntents(
        "replace scene 1, then split clip_3 at 3 seconds, delete clip_4"
      )
    ).toEqual([
      parseEditingIntent("replace scene 1"),
      parseEditingIntent("split clip_3 at 3 seconds"),
      parseEditingIntent("delete clip_4")
    ]);
  });

  it("preserves ordering", () => {
    const intents = parseEditingIntents(
      "delete clip_1 then trim clip_2 to 5000 ms then split clip_3 at 3000 ms"
    );

    expect(intents.map((intent) => intent.type)).toEqual([
      "clip.delete",
      "clip.trim",
      "clip.split"
    ]);
  });

  it("creates deterministic output", () => {
    const request = "replace scene 1, then move clip_5 before clip_6";

    expect(parseEditingIntents(request)).toEqual(parseEditingIntents(request));
  });

  it("does not mutate parsed intents", () => {
    const intents = parseEditingIntents(
      "move clip_2 after clip_1 and trim clip_3 to 5 seconds"
    );

    expect(Object.isFrozen(intents)).toBe(true);
    expect(Object.isFrozen(intents[0])).toBe(true);
    expect(Object.isFrozen(intents[0]?.payload)).toBe(true);
    expect(() => {
      intents.push(parseEditingIntent("delete clip_4"));
    }).toThrow();
  });
});
