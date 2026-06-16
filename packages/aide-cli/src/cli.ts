import { readFile, writeFile } from "node:fs/promises";
import { createInterface, type Interface } from "node:readline/promises";
import { deserializeProject, serializeProject } from "@aide/core";
import { editProject } from "@aide/ai-command-interpreter";
import { runChatSession } from "./chat.js";

export interface AideCliEnvironment {
  readTextFile(path: string): Promise<string>;
  writeTextFile(path: string, content: string): Promise<void>;
  stdout(message: string): void;
  stderr(message: string): void;
  readLine?(prompt: string): Promise<string | undefined>;
  close?(): void;
}

export async function runAideCli(
  args: readonly string[],
  environment: AideCliEnvironment = createNodeEnvironment()
): Promise<number> {
  const [command, ...commandArgs] = args;

  switch (command) {
    case "edit":
      return runEditCommand(commandArgs, environment);
    case "chat":
      return runChatCommand(commandArgs, environment);
    case "preview":
      environment.stdout("aide preview is not implemented yet.\n");
      return 0;
    case "render":
      environment.stdout("aide render is not implemented yet.\n");
      return 0;
    case undefined:
      environment.stderr(`${createUsage()}\n`);
      return 1;
    default:
      environment.stderr(`Unknown command: ${command}\n${createUsage()}\n`);
      return 1;
  }
}

function createNodeEnvironment(): AideCliEnvironment {
  let readlineInterface: Interface | undefined;

  return {
    readTextFile: (path) => readFile(path, "utf8"),
    writeTextFile: (path, content) => writeFile(path, content, "utf8"),
    stdout: (message) => {
      process.stdout.write(message);
    },
    stderr: (message) => {
      process.stderr.write(message);
    },
    readLine: async (prompt) => {
      readlineInterface ??= createInterface({
        input: process.stdin,
        output: process.stdout
      });

      return readlineInterface.question(prompt);
    },
    close: () => {
      readlineInterface?.close();
    }
  };
}

async function runEditCommand(
  args: readonly string[],
  environment: AideCliEnvironment
): Promise<number> {
  const [projectFile, request] = args;

  if (!projectFile || !request) {
    environment.stderr("Usage: aide edit <project-file> \"<request>\"\n");
    return 1;
  }

  const project = deserializeProject(await environment.readTextFile(projectFile));
  const result = await editProject({
    project,
    request
  });

  environment.stdout(formatEditResult(result));
  await environment.writeTextFile(
    projectFile,
    serializeProject(result.updatedProject)
  );

  return 0;
}

async function runChatCommand(
  args: readonly string[],
  environment: AideCliEnvironment
): Promise<number> {
  const [projectFile] = args;

  if (!projectFile) {
    environment.stderr("Usage: aide chat <project-file>\n");
    return 1;
  }

  if (!environment.readLine) {
    environment.stderr("Interactive input is not available.\n");
    return 1;
  }

  try {
    return await runChatSession(projectFile, {
      ...environment,
      readLine: environment.readLine
    });
  } finally {
    environment.close?.();
  }
}

function formatEditResult(result: Awaited<ReturnType<typeof editProject>>): string {
  const dryRunSummary =
    result.dryRun.summary.length > 0
      ? result.dryRun.summary.map((item) => `- ${item}`).join("\n")
      : "(none)";
  const ambiguityReasons =
    result.ambiguityReasons.length > 0
      ? result.ambiguityReasons.map((item) => `- ${item}`).join("\n")
      : "(none)";

  return [
    "Intents:",
    JSON.stringify(result.intents, null, 2),
    `Confidence: ${result.confidence}`,
    `Requires clarification: ${result.requiresClarification}`,
    "Ambiguity reasons:",
    ambiguityReasons,
    "Dry run summary:",
    dryRunSummary,
    ""
  ].join("\n");
}

function createUsage(): string {
  return [
    "Usage:",
    "  aide edit <project-file> \"<request>\"",
    "  aide chat <project-file>",
    "  aide preview",
    "  aide render"
  ].join("\n");
}
