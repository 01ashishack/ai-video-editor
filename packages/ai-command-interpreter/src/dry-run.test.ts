import { describe, expect, it } from "vitest";
import { createDryRunPreview } from "./dry-run.js";
import type { PlannedCommand } from "./planner-types.js";

function createPlannedCommand(
  command: PlannedCommand
): PlannedCommand {
  return command;
}

describe("createDryRunPreview", () => {
  it("summarizes scene replace commands", () => {
    const result = createDryRunPreview([
      createPlannedCommand({
        schemaVersion: "0.1",
        type: "scene.replace",
        payload: {
          sceneNumber: 4
        }
      })
    ]);

    expect(result.summary).toEqual(["Replace scene 4"]);
    expect(result.commandCount).toBe(1);
  });

  it("summarizes clip move commands", () => {
    const result = createDryRunPreview([
      createPlannedCommand({
        schemaVersion: "0.1",
        type: "clip.move",
        payload: {
          clipId: "clip_10",
          placement: "after",
          targetClipId: "clip_20"
        }
      })
    ]);

    expect(result.summary).toEqual(["Move clip clip_10"]);
  });

  it("summarizes clip trim commands", () => {
    const result = createDryRunPreview([
      createPlannedCommand({
        schemaVersion: "0.1",
        type: "clip.trim",
        payload: {
          clipId: "clip_7",
          duration: 5000
        }
      })
    ]);

    expect(result.summary).toEqual(["Trim clip clip_7"]);
  });

  it("summarizes clip split commands", () => {
    const result = createDryRunPreview([
      createPlannedCommand({
        schemaVersion: "0.1",
        type: "clip.split",
        payload: {
          clipId: "clip_8",
          splitAt: 3000
        }
      })
    ]);

    expect(result.summary).toEqual(["Split clip clip_8"]);
  });

  it("summarizes clip delete commands", () => {
    const result = createDryRunPreview([
      createPlannedCommand({
        schemaVersion: "0.1",
        type: "clip.delete",
        payload: {
          clipId: "clip_9"
        }
      })
    ]);

    expect(result.summary).toEqual(["Delete clip clip_9"]);
  });

  it("creates deterministic output", () => {
    const commands = [
      createPlannedCommand({
        schemaVersion: "0.1",
        type: "clip.trim",
        payload: {
          clipId: "clip_7",
          duration: 5000
        }
      })
    ];

    expect(createDryRunPreview(commands)).toEqual(createDryRunPreview(commands));
  });

  it("does not mutate input commands", () => {
    const commands = [
      createPlannedCommand({
        schemaVersion: "0.1",
        type: "clip.move",
        payload: {
          clipId: "clip_10",
          start: 1200
        }
      })
    ];
    const originalCommands = structuredClone(commands);
    const result = createDryRunPreview(commands);

    expect(commands).toEqual(originalCommands);
    expect(result.commands[0]).not.toBe(commands[0]);
    expect(result.commands[0]?.payload).not.toBe(commands[0]?.payload);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.commands)).toBe(true);
    expect(Object.isFrozen(result.summary)).toBe(true);
    expect(Object.isFrozen(result.commands[0])).toBe(true);
    expect(Object.isFrozen(result.commands[0]?.payload)).toBe(true);
  });

  it("handles empty command lists", () => {
    expect(createDryRunPreview([])).toEqual({
      commands: [],
      summary: [],
      commandCount: 0
    });
  });
});
