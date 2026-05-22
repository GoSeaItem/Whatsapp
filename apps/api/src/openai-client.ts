type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenAiChatOptions = {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  env?: NodeJS.ProcessEnv;
};

export type OpenAiChatResult = {
  content: string;
  model: string;
  keyIndex: number;
};

const DEFAULT_MODEL = "gpt-4o-mini";
let nextKeyIndex = 0;

export function getOpenAiKeys(env: NodeJS.ProcessEnv = process.env) {
  const keys = [
    ...(env.OPENAI_API_KEYS || "")
      .split(/[\n,;]+/)
      .map((key) => key.trim())
      .filter(Boolean),
    env.OPENAI_API_KEY?.trim() || ""
  ].filter(Boolean);

  return Array.from(new Set(keys));
}

export function hasOpenAiKeys(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV === "test" && env.OPENAI_ENABLE_IN_TEST !== "true") return false;
  return getOpenAiKeys(env).length > 0;
}

export async function createOpenAiChatCompletion(options: OpenAiChatOptions): Promise<OpenAiChatResult | null> {
  const env = options.env || process.env;
  if (env.NODE_ENV === "test" && env.OPENAI_ENABLE_IN_TEST !== "true") return null;
  const keys = getOpenAiKeys(env);
  if (keys.length === 0) return null;

  const model = env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
  const baseUrl = (env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/+$/, "");
  const timeoutMs = Number(env.OPENAI_TIMEOUT_MS || 30000);
  const startedIndex = nextKeyIndex % keys.length;
  const errors: string[] = [];

  for (let attempt = 0; attempt < keys.length; attempt += 1) {
    const keyIndex = (startedIndex + attempt) % keys.length;
    const apiKey = keys[keyIndex];

    try {
      const content = await callChatCompletions({
        apiKey,
        baseUrl,
        model,
        timeoutMs,
        messages: options.messages,
        temperature: options.temperature ?? 0.2,
        maxTokens: options.maxTokens ?? 900
      });

      nextKeyIndex = keyIndex;
      return { content, model, keyIndex };
    } catch (error) {
      errors.push(`key#${keyIndex + 1}: ${error instanceof Error ? error.message : "unknown error"}`);
      nextKeyIndex = (keyIndex + 1) % keys.length;
    }
  }

  throw new Error(`OpenAI request failed for all configured keys: ${errors.join("; ")}`);
}

async function callChatCompletions(input: {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
  messages: ChatMessage[];
  temperature: number;
  maxTokens: number;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs);

  try {
    const response = await fetch(`${input.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${input.apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: input.model,
        messages: input.messages,
        temperature: input.temperature,
        max_tokens: input.maxTokens
      }),
      signal: controller.signal
    });

    const text = await response.text();
    if (!response.ok) {
      const message = summarizeOpenAiError(response.status, text);
      throw new Error(message);
    }

    const payload = JSON.parse(text) as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("empty model response");
    return content;
  } finally {
    clearTimeout(timeout);
  }
}

function summarizeOpenAiError(status: number, body: string) {
  let message = body.slice(0, 240);
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string; type?: string; code?: string } };
    message = [parsed.error?.type, parsed.error?.code, parsed.error?.message].filter(Boolean).join(" ");
  } catch {
    // Keep the clipped raw body when the response is not JSON.
  }

  if ([401, 403].includes(status)) return `auth failed (${status}) ${message}`;
  if (status === 429) return `rate limited or quota exhausted (${status}) ${message}`;
  if (status >= 500) return `provider temporary error (${status}) ${message}`;
  return `provider error (${status}) ${message}`;
}
