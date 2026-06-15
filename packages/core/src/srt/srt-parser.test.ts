import { describe, expect, it } from "vitest";
import { parseSrt } from "./srt-parser.js";

describe("parseSrt", () => {
  it("parses a single cue", () => {
    const document = parseSrt(`1
00:00:00,000 --> 00:00:02,500
The city wakes before sunrise.`);

    expect(document).toEqual({
      cues: [
        {
          index: 1,
          start: 0,
          end: 2500,
          rawText: "The city wakes before sunrise."
        }
      ]
    });
  });

  it("parses multiple cues", () => {
    const document = parseSrt(`1
00:00:00,000 --> 00:00:02,500
The city wakes before sunrise.

2
00:00:03,000 --> 00:00:05,250
Workers arrive at the old textile mill.`);

    expect(document.cues).toHaveLength(2);
    expect(document.cues[0]).toMatchObject({
      index: 1,
      start: 0,
      end: 2500
    });
    expect(document.cues[1]).toMatchObject({
      index: 2,
      start: 3000,
      end: 5250
    });
  });

  it("preserves multiline cue text", () => {
    const document = parseSrt(`1
00:00:00,000 --> 00:00:02,500
Workers arrive
at the old textile mill.`);

    expect(document.cues[0]?.rawText).toBe(
      "Workers arrive\nat the old textile mill."
    );
  });

  it("throws for invalid timing", () => {
    expect(() =>
      parseSrt(`1
00:00:00,000 -> 00:00:02,500
The city wakes before sunrise.`)
    ).toThrow("Invalid SRT timing line");
  });

  it("throws for invalid index", () => {
    expect(() =>
      parseSrt(`abc
00:00:00,000 --> 00:00:02,500
The city wakes before sunrise.`)
    ).toThrow("Invalid SRT cue index");
  });
});
