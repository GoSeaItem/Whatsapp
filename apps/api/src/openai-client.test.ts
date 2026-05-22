import { afterEach, describe, expect, it, vi } from "vitest";
import { createOpenAiChatCompletion, getOpenAiKeys } from "./openai-client.js";

describe("OpenAI key pool", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads multiple keys from OPENAI_API_KEYS and legacy OPENAI_API_KEY", () => {
    expect(getOpenAiKeys({ OPENAI_API_KEYS: "key-a,key-b\nkey-c", OPENAI_API_KEY: "key-b" } as any)).toEqual(["key-a", "key-b", "key-c"]);
  });

  it("switches to the next key when the first key is rate limited", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "quota exhausted" } }), { status: 429 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ choices: [{ message: { content: "translated draft" } }] }), { status: 200 })
      );

    const result = await createOpenAiChatCompletion({
      env: {
        NODE_ENV: "development",
        OPENAI_API_KEYS: "key-one,key-two",
        OPENAI_MODEL: "test-model",
        OPENAI_BASE_URL: "https://example.test/v1"
      } as any,
      messages: [{ role: "user", content: "hello" }]
    });

    expect(result?.content).toBe("translated draft");
    expect(result?.keyIndex).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({ authorization: "Bearer key-one" });
    expect(fetchMock.mock.calls[1]?.[1]?.headers).toMatchObject({ authorization: "Bearer key-two" });
  });

  it("uses DeepSeek instant keys before ChatGPT fallback keys", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: "deepseek draft" } }], usage: { total_tokens: 12 } }), { status: 200 }));

    const result = await createOpenAiChatCompletion({
      env: {
        NODE_ENV: "development",
        DEEPSEEK_API_KEY: "deepseek-key",
        OPENAI_API_KEY: "openai-key",
        DEEPSEEK_BASE_URL: "https://deepseek.test",
        OPENAI_BASE_URL: "https://openai.test/v1"
      } as any,
      mode: "instant",
      messages: [{ role: "user", content: "hello" }]
    });

    expect(result?.content).toBe("deepseek draft");
    expect(result?.model).toBe("deepseek-v4-flash");
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://deepseek.test/chat/completions");
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({ authorization: "Bearer deepseek-key" });
  });

  it("allows explicit ChatGPT 5.5 thinking model selection", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: "thinking draft" } }] }), { status: 200 }));

    const result = await createOpenAiChatCompletion({
      env: {
        NODE_ENV: "development",
        DEEPSEEK_API_KEY: "deepseek-key",
        OPENAI_API_KEY: "openai-key",
        OPENAI_BASE_URL: "https://openai.test/v1"
      } as any,
      model: "chatgpt-5.5-thinking",
      messages: [{ role: "user", content: "hello" }]
    });

    expect(result?.content).toBe("thinking draft");
    expect(result?.model).toBe("gpt-5.5-thinking");
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://openai.test/v1/chat/completions");
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({ authorization: "Bearer openai-key" });
  });
});
