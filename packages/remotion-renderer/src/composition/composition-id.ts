export function toRemotionCompositionId(compositionId: string): string {
  return compositionId.replaceAll("_", "-");
}
