import type { IntentConfidenceResult } from "./intent-confidence-types.js";

const HIGH_CONFIDENCE = 0.95;
const MEDIUM_CONFIDENCE = 0.7;
const LOW_CONFIDENCE = 0.25;
const NO_CONFIDENCE = 0;

export function analyzeIntentConfidence(intent: unknown): IntentConfidenceResult {
  if (!isRecord(intent)) {
    return createResult(NO_CONFIDENCE, ["Intent must be an object."], true);
  }

  if (!isRecord(intent.payload)) {
    return createResult(LOW_CONFIDENCE, ["Intent payload is missing."], true);
  }

  const multipleReferenceReasons = findMultipleReferenceReasons(intent.payload);
  if (multipleReferenceReasons.length > 0) {
    return createResult(LOW_CONFIDENCE, multipleReferenceReasons, true);
  }

  switch (intent.type) {
    case "scene.replace":
      return analyzeSceneReplaceConfidence(intent.payload);
    case "clip.move":
      return analyzeClipMoveConfidence(intent.payload);
    case "clip.trim":
      return analyzeClipEditConfidence(intent.payload, "duration");
    case "clip.split":
      return analyzeClipEditConfidence(intent.payload, "splitAt");
    case "clip.delete":
      return analyzeClipDeleteConfidence(intent.payload);
    default:
      return createResult(LOW_CONFIDENCE, ["Intent type is not supported."], true);
  }
}

function analyzeSceneReplaceConfidence(
  payload: Record<string, unknown>
): IntentConfidenceResult {
  if (isNonEmptyString(payload.sceneId) && isNonEmptyString(payload.text)) {
    return createResult(HIGH_CONFIDENCE, [], false);
  }

  if (isPositiveInteger(payload.sceneNumber)) {
    return createResult(
      MEDIUM_CONFIDENCE,
      ["Scene number must be resolved to a sceneId."],
      false
    );
  }

  if (isNonEmptyString(payload.sceneId)) {
    return createResult(
      MEDIUM_CONFIDENCE,
      ["Replacement text is missing."],
      true
    );
  }

  return createResult(LOW_CONFIDENCE, ["Scene reference is missing."], true);
}

function analyzeClipMoveConfidence(
  payload: Record<string, unknown>
): IntentConfidenceResult {
  if (isNonEmptyString(payload.clipId) && isNonNegativeNumber(payload.start)) {
    return createResult(HIGH_CONFIDENCE, [], false);
  }

  if (
    isNonEmptyString(payload.clipId) &&
    isPlacement(payload.placement) &&
    isNonEmptyString(payload.targetClipId)
  ) {
    return createResult(
      MEDIUM_CONFIDENCE,
      ["Relative target reference must be resolved."],
      false
    );
  }

  const reasons = collectMissingReasons([
    [isNonEmptyString(payload.clipId), "Clip reference is missing."],
    [
      isNonNegativeNumber(payload.start) ||
        (isPlacement(payload.placement) && isNonEmptyString(payload.targetClipId)),
      "Clip move target reference is missing."
    ]
  ]);

  return createResult(LOW_CONFIDENCE, reasons, true);
}

function analyzeClipEditConfidence(
  payload: Record<string, unknown>,
  timingField: "duration" | "splitAt"
): IntentConfidenceResult {
  if (isNonEmptyString(payload.clipId) && isPositiveNumber(payload[timingField])) {
    return createResult(HIGH_CONFIDENCE, [], false);
  }

  if (isPositiveInteger(payload.clipNumber) && isPositiveNumber(payload[timingField])) {
    return createResult(
      MEDIUM_CONFIDENCE,
      ["Clip number must be resolved to a clipId."],
      false
    );
  }

  const reasons = collectMissingReasons([
    [
      isNonEmptyString(payload.clipId) || isPositiveInteger(payload.clipNumber),
      "Clip reference is missing."
    ],
    [isPositiveNumber(payload[timingField]), `${timingField} is missing.`]
  ]);

  return createResult(LOW_CONFIDENCE, reasons, true);
}

function analyzeClipDeleteConfidence(
  payload: Record<string, unknown>
): IntentConfidenceResult {
  if (isNonEmptyString(payload.clipId)) {
    return createResult(HIGH_CONFIDENCE, [], false);
  }

  if (isPositiveInteger(payload.clipNumber)) {
    return createResult(
      MEDIUM_CONFIDENCE,
      ["Clip number must be resolved to a clipId."],
      false
    );
  }

  return createResult(LOW_CONFIDENCE, ["Clip reference is missing."], true);
}

function findMultipleReferenceReasons(
  payload: Record<string, unknown>
): string[] {
  const referenceFields = [
    "sceneIds",
    "sceneNumbers",
    "clipIds",
    "clipNumbers",
    "targetClipIds",
    "targetClipNumbers"
  ];

  return referenceFields.some(
    (field) => Array.isArray(payload[field]) && payload[field].length > 1
  )
    ? ["Multiple possible references were generated."]
    : [];
}

function collectMissingReasons(
  checks: readonly (readonly [boolean, string])[]
): string[] {
  return checks
    .filter(([passes]) => !passes)
    .map(([, reason]) => reason);
}

function createResult(
  confidence: number,
  ambiguityReasons: readonly string[],
  requiresClarification: boolean
): IntentConfidenceResult {
  return Object.freeze({
    confidence,
    ambiguityReasons: Object.freeze([...ambiguityReasons]),
    requiresClarification
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isPlacement(value: unknown): value is "before" | "after" {
  return value === "before" || value === "after";
}
