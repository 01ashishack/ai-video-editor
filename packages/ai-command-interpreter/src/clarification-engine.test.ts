import { describe, expect, it } from "vitest";
import { createClarificationRequest } from "./clarification-engine.js";
import type { IntentConfidenceResult } from "./intent-confidence-types.js";

describe("createClarificationRequest", () => {
  it("does not request clarification for high confidence results", () => {
    expect(
      createClarificationRequest([
        createConfidenceResult(0.95, [], false)
      ])
    ).toEqual({
      requiresClarification: false,
      questions: []
    });
  });

  it("creates clarification for low confidence results", () => {
    expect(
      createClarificationRequest([
        createConfidenceResult(0.25, ["Clip reference is missing."], true)
      ])
    ).toEqual({
      requiresClarification: true,
      questions: ["Which clip do you mean?"]
    });
  });

  it("aggregates multiple ambiguity reasons deterministically", () => {
    expect(
      createClarificationRequest([
        createConfidenceResult(
          0.25,
          [
            "Clip reference is missing.",
            "Clip move target reference is missing."
          ],
          true
        ),
        createConfidenceResult(
          0.25,
          [
            "Multiple possible references were generated.",
            "Replacement text is missing."
          ],
          true
        )
      ])
    ).toEqual({
      requiresClarification: true,
      questions: [
        "Which clip do you mean?",
        "Where should the clip move?",
        "What should the replacement scene say?"
      ]
    });
  });

  it("produces deterministic output", () => {
    const results = [
      createConfidenceResult(0.25, ["Scene reference is missing."], true)
    ];

    expect(createClarificationRequest(results)).toEqual(
      createClarificationRequest(results)
    );
  });

  it("does not mutate input results and returns immutable output", () => {
    const results = [
      createConfidenceResult(0.25, ["Clip reference is missing."], true)
    ];
    const originalResults = structuredClone(results);
    const result = createClarificationRequest(results);

    expect(results).toEqual(originalResults);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.questions)).toBe(true);
    expect(() => {
      (result.questions as string[]).push("changed");
    }).toThrow();
  });
});

function createConfidenceResult(
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
