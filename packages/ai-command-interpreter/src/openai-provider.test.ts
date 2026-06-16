import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenAIProvider } from "./openai-provider.js";

describe("OpenAIProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns raw provider output from a successful response", async () => {
    const fetchMock = vi.fn(async () =>
      createFetchResponse(200, {
        choices: [
          {
            message: {
              content: "[{\"type\":\"clip.delete\"}]"
            }
          }
        ]
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    const provider = new OpenAIProvider({
      apiKey: "test-api-key",
      model: "gpt-test"
    });

    await expect(
      provider.generate({
        prompt: "Generate an intent."
      })
    ).resolves.toEqual({
      content: "[{\"type\":\"clip.delete\"}]"
    });
  });

  it("rejects API errors", async () => {
    const fetchMock = vi.fn(async () =>
      createFetchResponse(429, {
        error: {
          message: "Rate limit reached."
        }
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    const provider = new OpenAIProvider({
      apiKey: "test-api-key",
      model: "gpt-test"
    });

    await expect(
      provider.generate({
        prompt: "Generate an intent."
      })
    ).rejects.toThrow(
      "OpenAI Chat Completions API error 429: Rate limit reached."
    );
  });

  it("rejects invalid responses", async () => {
    const fetchMock = vi.fn(async () =>
      createFetchResponse(200, {
        choices: [
          {
            message: {
              content: null
            }
          }
        ]
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    const provider = new OpenAIProvider({
      apiKey: "test-api-key",
      model: "gpt-test"
    });

    await expect(
      provider.generate({
        prompt: "Generate an intent."
      })
    ).rejects.toThrow("OpenAI response message content must be a string.");
  });

  it("formats requests deterministically", async () => {
    const leftFetchMock = vi.fn(async () =>
      createFetchResponse(200, {
        choices: [
          {
            message: {
              content: "left"
            }
          }
        ]
      })
    );
    const rightFetchMock = vi.fn(async () =>
      createFetchResponse(200, {
        choices: [
          {
            message: {
              content: "right"
            }
          }
        ]
      })
    );
    const providerOptions = {
      apiKey: "test-api-key",
      model: "gpt-test"
    };
    const request = {
      prompt: "Generate the same intent."
    };

    vi.stubGlobal("fetch", leftFetchMock);
    await new OpenAIProvider(providerOptions).generate(request);
    vi.stubGlobal("fetch", rightFetchMock);
    await new OpenAIProvider(providerOptions).generate(request);

    expect(leftFetchMock.mock.calls[0]).toEqual(rightFetchMock.mock.calls[0]);
    expect(leftFetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer test-api-key",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-test",
          messages: [
            {
              role: "user",
              content: "Generate the same intent."
            }
          ],
          temperature: 0
        })
      }
    );
  });

  it("rejects invalid configuration and requests", async () => {
    const provider = new OpenAIProvider({
      apiKey: "test-api-key",
      model: "gpt-test"
    });

    expect(() =>
      new OpenAIProvider({
        apiKey: "",
        model: "gpt-test"
      })
    ).toThrow("OpenAI provider apiKey must be a non-empty string.");
    expect(() =>
      new OpenAIProvider({
        apiKey: "test-api-key",
        model: ""
      })
    ).toThrow("OpenAI provider model must be a non-empty string.");
    await expect(provider.generate({ prompt: "" })).rejects.toThrow(
      "LLM request prompt must be a non-empty string."
    );
  });
});

function createFetchResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn(async () => body)
  } as unknown as Response;
}
