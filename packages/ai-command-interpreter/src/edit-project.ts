import { runAIEditingSession } from "./ai-editing-session.js";
import type { EditProjectInput, EditProjectResult } from "./edit-project-types.js";
import { analyzeIntentConfidence } from "./intent-confidence.js";
import type { IntentConfidenceResult } from "./intent-confidence-types.js";

const CLARIFICATION_CONFIDENCE_THRESHOLD = 0.8;

export async function editProject(
  input: EditProjectInput
): Promise<EditProjectResult> {
  validateInput(input);

  const session = await runAIEditingSession(
    input.project,
    input.request,
    input.provider
  );
  const confidenceResults = session.intents.map((intent) =>
    analyzeIntentConfidence(intent)
  );
  const confidence = aggregateConfidence(confidenceResults);
  const ambiguityReasons = collectAmbiguityReasons(confidenceResults);
  const requiresClarification =
    confidence < CLARIFICATION_CONFIDENCE_THRESHOLD ||
    confidenceResults.some((result) => result.requiresClarification);

  return Object.freeze({
    updatedProject: session.project,
    intents: session.intents,
    confidence,
    requiresClarification,
    ambiguityReasons: Object.freeze(ambiguityReasons),
    dryRun: session.dryRun,
    executionResult: session.executionResult
  });
}

function validateInput(input: EditProjectInput): void {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input)
  ) {
    throw new Error("Edit project input must be an object.");
  }

  if (typeof input.request !== "string" || input.request.trim().length === 0) {
    throw new Error("Edit project request must be a non-empty string.");
  }
}

function aggregateConfidence(
  results: readonly IntentConfidenceResult[]
): number {
  if (results.length === 0) {
    return 0;
  }

  const total = results.reduce((sum, result) => sum + result.confidence, 0);

  return roundConfidence(total / results.length);
}

function collectAmbiguityReasons(
  results: readonly IntentConfidenceResult[]
): string[] {
  return [
    ...new Set(results.flatMap((result) => result.ambiguityReasons))
  ];
}

function roundConfidence(value: number): number {
  return Math.round(value * 1000) / 1000;
}
