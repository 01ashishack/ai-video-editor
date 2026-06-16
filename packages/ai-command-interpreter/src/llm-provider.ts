import type {
  LLMProvider,
  LLMRequest,
  LLMResponse
} from "./llm-provider-types.js";

export interface MockLLMProviderOptions {
  responses?: readonly string[];
  defaultResponse?: string;
}

export class MockLLMProvider implements LLMProvider {
  private readonly responses: readonly string[];
  private readonly defaultResponse: string;
  private nextResponseIndex = 0;

  constructor(options: MockLLMProviderOptions = {}) {
    this.responses = Object.freeze([...(options.responses ?? [])]);
    this.defaultResponse = options.defaultResponse ?? "";
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    validateRequest(request);

    const response =
      this.responses[this.nextResponseIndex] ?? this.defaultResponse;

    if (this.nextResponseIndex < this.responses.length) {
      this.nextResponseIndex += 1;
    }

    return {
      content: response
    };
  }
}

function validateRequest(request: LLMRequest): void {
  if (
    typeof request !== "object" ||
    request === null ||
    Array.isArray(request)
  ) {
    throw new Error("LLM request must be an object.");
  }

  if (typeof request.prompt !== "string" || request.prompt.trim().length === 0) {
    throw new Error("LLM request prompt must be a non-empty string.");
  }
}
