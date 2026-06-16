import {
  EDITING_INTENT_SCHEMA_VERSION,
  type ClipDeleteIntent,
  type ClipMoveIntent,
  type ClipSplitIntent,
  type ClipTrimIntent,
  type EditingIntent,
  type EditingIntentType,
  type IntentValidationError,
  type IntentValidationResult,
  type SceneReplaceIntent
} from "./intent-types.js";

const INTENT_TYPES = new Set<EditingIntentType>([
  "scene.replace",
  "clip.move",
  "clip.trim",
  "clip.split",
  "clip.delete"
]);

export function validateEditingIntent(input: unknown): IntentValidationResult {
  const errors: IntentValidationError[] = [];

  if (!isRecord(input)) {
    return invalid([
      {
        code: "INVALID_INTENT",
        message: "Editing intent must be an object.",
        path: "/"
      }
    ]);
  }

  if (input.schemaVersion !== EDITING_INTENT_SCHEMA_VERSION) {
    errors.push({
      code: "INVALID_SCHEMA_VERSION",
      message: `Editing intent schemaVersion must be ${EDITING_INTENT_SCHEMA_VERSION}.`,
      path: "/schemaVersion"
    });
  }

  if (!isIntentType(input.type)) {
    errors.push({
      code: "INVALID_INTENT_TYPE",
      message: "Editing intent type is not supported.",
      path: "/type"
    });
  }

  if (!isRecord(input.payload)) {
    errors.push({
      code: "INVALID_PAYLOAD",
      message: "Editing intent payload must be an object.",
      path: "/payload"
    });
  }

  if (errors.length > 0) {
    return invalid(errors);
  }

  const type = input.type as EditingIntentType;
  const payload = input.payload as Record<string, unknown>;
  const payloadErrors = validatePayload(type, payload);

  if (payloadErrors.length > 0) {
    return invalid(payloadErrors);
  }

  return {
    valid: true,
    intent: input as unknown as EditingIntent,
    errors: []
  };
}

export function isEditingIntent(input: unknown): input is EditingIntent {
  return validateEditingIntent(input).valid;
}

export function assertEditingIntent(input: unknown): EditingIntent {
  const result = validateEditingIntent(input);

  if (!result.valid) {
    throw new Error(formatIntentValidationErrors(result.errors));
  }

  return result.intent;
}

export function formatIntentValidationErrors(
  errors: readonly IntentValidationError[]
): string {
  return errors
    .map((error) => `${error.path}: ${error.code} - ${error.message}`)
    .join("; ");
}

export function validateSceneReplaceIntentPayload(
  payload: unknown
): IntentValidationError[] {
  if (!isRecord(payload)) {
    return invalidPayloadObject();
  }

  if ("sceneNumber" in payload) {
    return validatePositiveInteger(
      payload.sceneNumber,
      "/payload/sceneNumber",
      "sceneNumber"
    );
  }

  return [
    ...validateNonEmptyString(payload.sceneId, "/payload/sceneId", "sceneId"),
    ...validateNonEmptyString(payload.text, "/payload/text", "text")
  ];
}

export function validateClipMoveIntentPayload(
  payload: unknown
): IntentValidationError[] {
  if (!isRecord(payload)) {
    return invalidPayloadObject();
  }

  if ("placement" in payload || "targetClipId" in payload) {
    const placementErrors = isClipMovePlacement(payload.placement)
      ? []
      : [
          {
            code: "INVALID_PLACEMENT",
            message: "placement must be before or after.",
            path: "/payload/placement"
          }
        ];

    return [
      ...validateNonEmptyString(payload.clipId, "/payload/clipId", "clipId"),
      ...placementErrors,
      ...validateNonEmptyString(
        payload.targetClipId,
        "/payload/targetClipId",
        "targetClipId"
      )
    ];
  }

  return [
    ...validateNonEmptyString(payload.clipId, "/payload/clipId", "clipId"),
    ...validateNonNegativeNumber(payload.start, "/payload/start", "start")
  ];
}

export function validateClipTrimIntentPayload(
  payload: unknown
): IntentValidationError[] {
  if (!isRecord(payload)) {
    return invalidPayloadObject();
  }

  return [
    ...validateNonEmptyString(payload.clipId, "/payload/clipId", "clipId"),
    ...validatePositiveNumber(payload.duration, "/payload/duration", "duration")
  ];
}

export function validateClipSplitIntentPayload(
  payload: unknown
): IntentValidationError[] {
  if (!isRecord(payload)) {
    return invalidPayloadObject();
  }

  return [
    ...validateNonEmptyString(payload.clipId, "/payload/clipId", "clipId"),
    ...validatePositiveNumber(payload.splitAt, "/payload/splitAt", "splitAt")
  ];
}

export function validateClipDeleteIntentPayload(
  payload: unknown
): IntentValidationError[] {
  if (!isRecord(payload)) {
    return invalidPayloadObject();
  }

  return validateNonEmptyString(payload.clipId, "/payload/clipId", "clipId");
}

function validatePayload(
  type: EditingIntentType,
  payload: Record<string, unknown>
): IntentValidationError[] {
  switch (type) {
    case "scene.replace":
      return validateSceneReplaceIntentPayload(payload);
    case "clip.move":
      return validateClipMoveIntentPayload(payload);
    case "clip.trim":
      return validateClipTrimIntentPayload(payload);
    case "clip.split":
      return validateClipSplitIntentPayload(payload);
    case "clip.delete":
      return validateClipDeleteIntentPayload(payload);
  }
}

function isIntentType(value: unknown): value is EditingIntentType {
  return typeof value === "string" && INTENT_TYPES.has(value as EditingIntentType);
}

function isClipMovePlacement(value: unknown): value is "before" | "after" {
  return value === "before" || value === "after";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateNonEmptyString(
  value: unknown,
  path: string,
  fieldName: string
): IntentValidationError[] {
  if (typeof value === "string" && value.trim().length > 0) {
    return [];
  }

  return [
    {
      code: "INVALID_STRING",
      message: `${fieldName} must be a non-empty string.`,
      path
    }
  ];
}

function validateNonNegativeNumber(
  value: unknown,
  path: string,
  fieldName: string
): IntentValidationError[] {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return [];
  }

  return [
    {
      code: "INVALID_NUMBER",
      message: `${fieldName} must be a finite number greater than or equal to zero.`,
      path
    }
  ];
}

function validatePositiveNumber(
  value: unknown,
  path: string,
  fieldName: string
): IntentValidationError[] {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return [];
  }

  return [
    {
      code: "INVALID_NUMBER",
      message: `${fieldName} must be a finite number greater than zero.`,
      path
    }
  ];
}

function validatePositiveInteger(
  value: unknown,
  path: string,
  fieldName: string
): IntentValidationError[] {
  if (
    typeof value === "number" &&
    Number.isInteger(value) &&
    Number.isFinite(value) &&
    value > 0
  ) {
    return [];
  }

  return [
    {
      code: "INVALID_NUMBER",
      message: `${fieldName} must be a finite integer greater than zero.`,
      path
    }
  ];
}

function invalidPayloadObject(): IntentValidationError[] {
  return [
    {
      code: "INVALID_PAYLOAD",
      message: "Editing intent payload must be an object.",
      path: "/payload"
    }
  ];
}

function invalid(errors: IntentValidationError[]): IntentValidationResult {
  return {
    valid: false,
    errors
  };
}
