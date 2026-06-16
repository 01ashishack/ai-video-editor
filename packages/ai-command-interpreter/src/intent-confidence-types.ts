export interface IntentConfidenceResult {
  confidence: number;
  ambiguityReasons: readonly string[];
  requiresClarification: boolean;
}
