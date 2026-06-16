import type {
  LLMProvider,
  LLMRequest,
  LLMResponse
} from "./llm-provider-types.js";
import type { OpenAIProviderOptions } from "./openai-provider-types.js";

const OPENAI_CHAT_COMPLETIONS_URL =
  "https://api.openai.com/v1/chat/completions";

export class OpenAIProvider implements LLMProvider {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(options: OpenAIProviderOptions) {
    validateOptions(options);

    this.apiKey = options.apiKey;
    this.model = options.model;
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    validateRequest(request);

    const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: "user",
            content: request.prompt
          }
        ],
        temperature: 0
      })
    });

    const responseBody = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(formatOpenAIError(response.status, responseBody));
    }

    return {
      content: extractAssistantContent(responseBody)
    };
  }
}

function validateOptions(options: OpenAIProviderOptions): void {
  if (
    typeof options !== "object" ||
    options === null ||
    Array.isArray(options)
  ) {
    throw new Error("OpenAI provider options must be an object.");
  }

  if (typeof options.apiKey !== "string" || options.apiKey.trim().length === 0) {
    throw new Error("OpenAI provider apiKey must be a non-empty string.");
  }

  if (typeof options.model !== "string" || options.model.trim().length === 0) {
    throw new Error("OpenAI provider model must be a non-empty string.");
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

async function readJsonResponse(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error("OpenAI response must be valid JSON.");
  }
}

function extractAssistantContent(responseBody: unknown): string {
  if (!isRecord(responseBody)) {
    throw new Error("OpenAI response must be an object.");
  }

  const firstChoice = Array.isArray(responseBody.choices)
    ? responseBody.choices[0]
    : undefined;

  if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) {
    throw new Error("OpenAI response is missing choices[0].message.");
  }

  if (typeof firstChoice.message.content !== "string") {
    throw new Error("OpenAI response message content must be a string.");
  }

  return firstChoice.message.content;
}

function formatOpenAIError(status: number, responseBody: unknown): string {
  if (
    isRecord(responseBody) &&
    isRecord(responseBody.error) &&
    typeof responseBody.error.message === "string" &&
    responseBody.error.message.trim().length > 0
  ) {
    return `OpenAI Chat Completions API error ${status}: ${responseBody.error.message}`;
  }

  return `OpenAI Chat Completions API error ${status}.`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
