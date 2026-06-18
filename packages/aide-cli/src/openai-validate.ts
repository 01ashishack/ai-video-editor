import {
  createProject,
  type Project,
  type Scene,
  type TimelineClip,
  type Track
} from "@aide/core";
import {
  OpenAIProvider,
  analyzeIntentConfidence,
  runAIEditingSession,
  type AIEditingSessionResult,
  type IntentConfidenceResult,
  type LLMProvider
} from "@aide/ai-command-interpreter";

export interface OpenAIValidationEnvironment {
  stdout(message: string): void;
  stderr(message: string): void;
  getEnv(name: string): string | undefined;
}

export interface OpenAIValidationDependencies {
  createProvider(apiKey: string, model: string): LLMProvider;
  runSession(
    project: Project,
    request: string,
    provider: LLMProvider
  ): Promise<AIEditingSessionResult>;
  analyzeConfidence(intent: unknown): IntentConfidenceResult;
}

const DEFAULT_OPENAI_VALIDATION_MODEL = "gpt-4.1-mini";
const VALIDATION_REQUEST = "move clip 1 after clip 2";

export async function runOpenAIValidationCommand(
  environment: OpenAIValidationEnvironment,
  dependencies: OpenAIValidationDependencies = createDefaultDependencies()
): Promise<number> {
  const apiKey = environment.getEnv("OPENAI_API_KEY");

  if (!apiKey || apiKey.trim().length === 0) {
    environment.stderr("OPENAI_API_KEY is required.\n");
    return 1;
  }

  const model =
    environment.getEnv("OPENAI_MODEL") ?? DEFAULT_OPENAI_VALIDATION_MODEL;

  try {
    const provider = dependencies.createProvider(apiKey, model);
    const session = await dependencies.runSession(
      createValidationProject(),
      createValidationPrompt(),
      provider
    );
    const confidenceResults = session.intents.map((intent) =>
      dependencies.analyzeConfidence(intent)
    );
    const confidence = aggregateConfidence(confidenceResults);
    const requiresClarification = confidenceResults.some(
      (result) => result.requiresClarification
    );

    if (session.executionResult.executedCommandCount < 1) {
      throw new Error("Execution did not apply any commands.");
    }

    environment.stdout(
      formatValidationResult(session, confidence, requiresClarification)
    );

    return 0;
  } catch (error) {
    environment.stderr(`OpenAI validation failed: ${formatError(error)}\n`);
    return 1;
  }
}

function createDefaultDependencies(): OpenAIValidationDependencies {
  return {
    createProvider: (apiKey, model) =>
      new OpenAIProvider({
        apiKey,
        model
      }),
    runSession: runAIEditingSession,
    analyzeConfidence: analyzeIntentConfidence
  };
}

function createValidationProject(): Project {
  const scenes: Scene[] = [
    createScene("scene_001", 1),
    createScene("scene_002", 2)
  ];
  const track: Track = {
    id: "track_001",
    kind: "video",
    role: "primary-video",
    name: "Primary Video",
    order: 1,
    clips: [
      createClip("clip_1", "scene_001", 0, 1000),
      createClip("clip_2", "scene_002", 1000, 1000)
    ]
  };

  return {
    ...createProject({
      projectId: "openai_validation_project",
      name: "OpenAI Validation Project",
      createdAt: "2026-06-16T00:00:00.000Z"
    }),
    scenes,
    timeline: {
      id: "openai_validation_project_timeline",
      tracks: [track],
      transitions: [],
      markers: []
    }
  };
}

function createScene(id: string, order: number): Scene {
  return {
    id,
    order,
    source: "manual",
    title: `Scene ${order}`,
    text: `Scene ${order}`,
    keywords: [],
    sourceRefs: [],
    status: "assigned",
    constraints: {}
  };
}

function createClip(
  id: string,
  sceneId: string,
  start: number,
  duration: number
): TimelineClip {
  return {
    id,
    trackId: "track_001",
    sceneId,
    mediaType: "video",
    role: "primary-visual",
    timelineRange: {
      start,
      duration
    },
    enabled: true,
    locked: false,
    links: [],
    render: {}
  };
}

function createValidationPrompt(): string {
  return [
    "Return only JSON for the requested edit.",
    "Use this schema exactly: [{\"schemaVersion\":\"0.1\",\"type\":\"clip.move\",\"payload\":{\"clipId\":\"clip_1\",\"placement\":\"after\",\"targetClipId\":\"clip_2\"}}]",
    `Request: ${VALIDATION_REQUEST}`
  ].join("\n");
}

function aggregateConfidence(
  results: readonly IntentConfidenceResult[]
): number {
  if (results.length === 0) {
    return 0;
  }

  const total = results.reduce((sum, result) => sum + result.confidence, 0);

  return Math.round((total / results.length) * 1000) / 1000;
}

function formatValidationResult(
  session: AIEditingSessionResult,
  confidence: number,
  requiresClarification: boolean
): string {
  return [
    "Generated intents:",
    JSON.stringify(session.intents, null, 2),
    `Confidence: ${confidence}`,
    `Requires clarification: ${requiresClarification}`,
    `Execution success: ${session.executionResult.executedCommandCount > 0}`,
    ""
  ].join("\n");
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
