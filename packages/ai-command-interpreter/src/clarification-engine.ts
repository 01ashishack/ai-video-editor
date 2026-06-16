import type { ClarificationResult } from "./clarification-engine-types.js";
import type { IntentConfidenceResult } from "./intent-confidence-types.js";

export function createClarificationRequest(
  confidenceResults: readonly IntentConfidenceResult[]
): ClarificationResult {
  const results = confidenceResults.map(cloneConfidenceResult);
  const questions = results
    .filter((result) => result.requiresClarification)
    .flatMap((result) => result.ambiguityReasons)
    .flatMap(createQuestionsForReason);

  return Object.freeze({
    requiresClarification: questions.length > 0,
    questions: Object.freeze(uniqueInOrder(questions))
  });
}

function cloneConfidenceResult(
  result: IntentConfidenceResult
): IntentConfidenceResult {
  return {
    confidence: result.confidence,
    requiresClarification: result.requiresClarification,
    ambiguityReasons: [...result.ambiguityReasons]
  };
}

function createQuestionsForReason(reason: string): string[] {
  switch (reason) {
    case "Clip reference is missing.":
    case "Multiple possible references were generated.":
      return ["Which clip do you mean?"];
    case "Clip move target reference is missing.":
      return ["Where should the clip move?"];
    case "Scene reference is missing.":
      return ["Which scene do you mean?"];
    case "Replacement text is missing.":
      return ["What should the replacement scene say?"];
    case "Intent payload is missing.":
    case "Intent must be an object.":
    case "Intent type is not supported.":
      return ["What edit would you like to make?"];
    default:
      return [`Can you clarify: ${reason}`];
  }
}

function uniqueInOrder(values: readonly string[]): string[] {
  return [...new Set(values)];
}
