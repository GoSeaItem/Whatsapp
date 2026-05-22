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
});

