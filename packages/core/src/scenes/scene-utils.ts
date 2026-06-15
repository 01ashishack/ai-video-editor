const DEFAULT_MAX_TITLE_LENGTH = 80;

export function deriveSceneTitle(
  text: string,
  maxLength: number = DEFAULT_MAX_TITLE_LENGTH
): string {
  const firstLine = text.split("\n")[0]?.trim() ?? "";
  const normalized = firstLine.replace(/\s+/g, " ");

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return normalized.slice(0, maxLength).trimEnd();
}
