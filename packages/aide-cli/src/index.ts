#!/usr/bin/env node
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runAideCli } from "./cli.js";

export { runAideCli };
export type { AideCliEnvironment } from "./cli.js";

const isEntrypoint =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  runAideCli(process.argv.slice(2)).then(
    (exitCode) => {
      process.exitCode = exitCode;
    },
    (error: unknown) => {
      process.stderr.write(`${formatError(error)}\n`);
      process.exitCode = 1;
    }
  );
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
