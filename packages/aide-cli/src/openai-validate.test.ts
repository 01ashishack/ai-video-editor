import type { Project } from "@aide/core";
import { describe, expect, it, vi } from "vitest";
import {
  runOpenAIValidationCommand,
  type OpenAIValidationDependencies,
  type OpenAIValidationEnvironment
} from "./openai-validate.js";

describe("runOpenAIValidationCommand", () => {
  it("fails when OPENAI_API_KEY is missing", async () => {
    const output: string[] = [];
    const errors: string[] = [];

    const exitCode = await runOpenAIValidationCommand(
      createEnvironment({}, output, errors),
      createDependencies()
    );

    expect(exitCode).toBe(1);
    expect(output).toEqual([]);
    expect(errors).toEqual(["OPENAI_API_KEY is required.\n"]);
  });

  it("creates the OpenAI provider from environment configuration", async () => {
    const output: string[] = [];
    const errors: string[] = [];
    const dependencies = createDependencies();

    const exitCode = await runOpenAIValidationCommand(
      createEnvironment(
        {
          OPENAI_API_KEY: "test-key",
          OPENAI_MODEL: "test-model"
        },
        output,
        errors
      ),
      dependencies
    );

    expect(exitCode).toBe(0);
    expect(dependencies.createProvider).toHaveBeenCalledWith(
      "test-key",
      "test-model"
    );
    expect(output.join("")).toContain("Generated intents:");
    expect(output.join("")).toContain("Execution success: true");
    expect(errors).toEqual([]);
  });

  it("fails loudly when validation execution fails", async () => {
    const output: string[] = [];
    const errors: string[] = [];
    const dependencies = createDependencies({
      runSession: vi.fn(async () => {
        throw new Error("Invalid generated JSON.");
      })
    });

    const exitCode = await runOpenAIValidationCommand(
      createEnvironment({ OPENAI_API_KEY: "test-key" }, output, errors),
      dependencies
    );

    expect(exitCode).toBe(1);
    expect(output).toEqual([]);
    expect(errors).toEqual([
      "OpenAI validation failed: Invalid generated JSON.\n"
    ]);
  });
});

function createEnvironment(
  env: Record<string, string | undefined>,
  output: string[],
  errors: string[]
): OpenAIValidationEnvironment {
  return {
    stdout(message: string): void {
      output.push(message);
    },
    stderr(message: string): void {
      errors.push(message);
    },
    getEnv(name: string): string | undefined {
      return env[name];
    }
  };
}

function createDependencies(
  overrides: Partial<OpenAIValidationDependencies> = {}
): OpenAIValidationDependencies {
  const provider = {};
  const intents = [
    {
      schemaVersion: "0.1",
      type: "clip.move",
      payload: {
        clipId: "clip_1",
        placement: "after",
        targetClipId: "clip_2"
      }
    }
  ];

  return {
    createProvider:
      overrides.createProvider ??
      vi.fn(() => provider as OpenAIValidationDependencies extends {
        createProvider: (...args: never[]) => infer TProvider;
      }
        ? TProvider
        : never),
    runSession:
      overrides.runSession ??
      vi.fn(async (project: Project) => ({
        intents,
        resolvedIntents: [
          {
            schemaVersion: "0.1",
            type: "clip.move",
            payload: {
              clipId: "clip_1",
              start: 2000
            }
          }
        ],
        plannedCommands: [
          {
            schemaVersion: "0.1",
            type: "clip.move",
            payload: {
              clipId: "clip_1",
              start: 2000
            }
          }
        ],
        dryRun: {
          commands: [],
          summary: ["Move clip clip_1"],
          commandCount: 1
        },
        executionResult: {
          project,
          executedCommandCount: 1
        },
        project
      })),
    analyzeConfidence:
      overrides.analyzeConfidence ??
      vi.fn(() => ({
        confidence: 0.7,
        ambiguityReasons: ["Relative target reference must be resolved."],
        requiresClarification: false
      }))
  };
}
