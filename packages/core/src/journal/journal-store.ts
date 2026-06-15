import type { CommandLogEntry } from "../models/index.js";

export function serializeJournal(entries: CommandLogEntry[]): string {
  return `${entries
    .map((entry) => JSON.stringify(sortJsonValue(entry)))
    .join("\n")}\n`;
}

export function deserializeJournal(content: string): CommandLogEntry[] {
  const entries: CommandLogEntry[] = [];
  const lines = content.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;

    if (line.trim() === "") {
      continue;
    }

    try {
      entries.push(JSON.parse(line) as CommandLogEntry);
    } catch {
      throw new Error(`Invalid journal line ${index + 1}.`);
    }
  }

  return entries;
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue);
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .map(([key, nestedValue]) => [key, sortJsonValue(nestedValue)])
    );
  }

  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}
