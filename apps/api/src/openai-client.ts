import { decryptProviderKey } from "./ai-key-utils.js";
import { aiModelRegistry, defaultModelForMode, findAiModel, type AiModelDefinition } from "./ai-model-registry.js";
import { prisma } from "./db.js";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenAiChatOptions = {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  env?: NodeJS.ProcessEnv;
  organizationId?: string | null;
  mode?: "instant" | "thinking" | string | null;
  model?: string | null;
};

export type OpenAiChatResult = {
  content: string;
  model: string;
  keyIndex: number;
};

export function getOpenAiKeys(env: NodeJS.ProcessEnv = process.env) {
  return getEnvKeys(env.OPENAI_API_KEYS, env.OPENAI_API_KEY);
}

export function hasOpenAiKeys(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV === "test" && env.OPENAI_ENABLE_IN_TEST !== "true") return false;
  return getOpenAiKeys(env).length > 0;
}

export async function createOpenAiChatCompletion(options: OpenAiChatOptions): Promise<OpenAiChatResult | null> {
  const env = options.env || process.env;
  if (env.NODE_ENV === "test" && env.OPENAI_ENABLE_IN_TEST !== "true") return null;
  const explicitModel = findAiModel(options.model, env);
  const selectedModel = explicitModel || defaultModelForMode(options.mode, env);
  const modelCandidates = explicitModel
    ? [explicitModel]
    : aiModelRegistry(env).filter((item) => item.mode === selectedModel.mode).sort((a, b) => a.priority - b.priority);
  const dbKeys = await loadDatabaseKeys(options.organizationId || "", options.mode || selectedModel.mode, options.model || selectedModel.model, env);
  const envKeys = loadEnvironmentKeys(modelCandidates, env);
  const keys = [...dbKeys, ...envKeys];
  if (keys.length === 0) return null;

  const timeoutMs = Number(env.OPENAI_TIMEOUT_MS || 30000);
  const startedIndex = 0;
  const errors: string[] = [];

  for (let attempt = 0; attempt < keys.length; attempt += 1) {
    const keyIndex = (startedIndex + attempt) % keys.length;
    const key = keys[keyIndex];

    try {
      const completion = await callChatCompletions({
        apiKey: key.apiKey,
        baseUrl: key.baseUrl,
        model: key.model,
        timeoutMs,
        messages: options.messages,
        temperature: options.temperature ?? 0.2,
        maxTokens: options.maxTokens ?? 900
      });

      if (key.id) await recordDatabaseKeySuccess(key.id, completion.totalTokens);
      return { content: completion.content, model: key.model, keyIndex: key.keyIndex };
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      if (key.id) await recordDatabaseKeyFailure(key.id, message);
      errors.push(`${key.source} key#${key.keyIndex + 1}: ${message}`);
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

    const payload = JSON.parse(text) as { choices?: Array<{ message?: { content?: string } }>; usage?: { total_tokens?: number } };
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("empty model response");
    return { content, totalTokens: Number(payload.usage?.total_tokens || 0) };
  } finally {
    clearTimeout(timeout);
  }
}

function loadEnvironmentKeys(modelCandidates: AiModelDefinition[], env: NodeJS.ProcessEnv) {
  return modelCandidates.flatMap((selectedModel) => {
    const keys = selectedModel.provider === "deepseek"
      ? getEnvKeys(env.DEEPSEEK_API_KEYS, env.DEEPSEEK_API_KEY)
      : getOpenAiKeys(env);
    return keys.map((apiKey, index) => ({
      apiKey,
      id: null as string | null,
      keyIndex: index,
      source: "env" as const,
      provider: selectedModel.provider,
      model: selectedModel.model,
      baseUrl: selectedModel.baseUrl
    }));
  });
}

function getEnvKeys(keysText?: string, singleKey?: string) {
  const keys = [
    ...(keysText || "")
      .split(/[\n,;]+/)
      .map((key) => key.trim())
      .filter(Boolean),
    singleKey?.trim() || ""
  ].filter(Boolean);
  return Array.from(new Set(keys));
}

async function loadDatabaseKeys(organizationId: string, mode: string, requestedModel: string, env: NodeJS.ProcessEnv) {
  if (!organizationId) return [];
  const registry = aiModelRegistry(env);
  const requested = findAiModel(requestedModel, env);
  const normalizedMode = mode === "thinking" ? "thinking" : "instant";
  const rows = await (prisma as any).aiProviderKey.findMany({
    where: {
      organizationId,
      status: "active",
      ...(requested ? { provider: requested.provider, model: requested.model } : { mode: normalizedMode })
    },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }]
  }).catch(() => []);

  return rows
    .sort((a: any, b: any) => providerRank(a.provider) - providerRank(b.provider) || a.priority - b.priority)
    .flatMap((row: any, index: number) => {
    try {
      const definition = registry.find((item) => item.provider === row.provider && item.model === row.model);
      return [{
        apiKey: decryptProviderKey(row.encryptedKey, env),
        id: row.id as string,
        keyIndex: index,
        source: "database" as const,
        provider: row.provider || definition?.provider || "openai",
        model: row.model || definition?.model || defaultModelForMode(row.mode, env).model,
        baseUrl: (row.baseUrl || definition?.baseUrl || defaultModelForMode(row.mode, env).baseUrl).replace(/\/+$/, "")
      }];
    } catch {
      return [];
    }
  });
}

function providerRank(provider: string) {
  if (provider === "deepseek") return 0;
  if (provider === "openai") return 1;
  return 2;
}

async function recordDatabaseKeySuccess(id: string, totalTokens: number) {
  const updated = await (prisma as any).aiProviderKey.update({
    where: { id },
    data: {
      totalRequests: { increment: 1 },
      totalTokens: { increment: Math.max(0, totalTokens) },
      successCount: { increment: 1 },
      lastUsedAt: new Date(),
      lastSuccessAt: new Date(),
      lastErrorMessage: null
    }
  }).catch(() => undefined);
  await recordAIKeyUsageLog(updated, Math.max(0, totalTokens), true);
}

async function recordDatabaseKeyFailure(id: string, message: string) {
  const lower = message.toLowerCase();
  const updated = await (prisma as any).aiProviderKey.update({
    where: { id },
    data: {
      totalRequests: { increment: 1 },
      errorCount: { increment: 1 },
      rateLimitCount: lower.includes("rate limited") || lower.includes("429") ? { increment: 1 } : undefined,
      quotaErrorCount: lower.includes("quota") || lower.includes("exhausted") ? { increment: 1 } : undefined,
      lastUsedAt: new Date(),
      lastErrorAt: new Date(),
      lastErrorMessage: message.slice(0, 500)
    }
  }).catch(() => undefined);
  await recordAIKeyUsageLog(updated, 0, false, message);
}

async function recordAIKeyUsageLog(key: any, totalTokens: number, success: boolean, errorMessage?: string) {
  if (!key || !(prisma as any).aIKeyUsageLog?.create) return;
  await (prisma as any).aIKeyUsageLog.create({
    data: {
      organizationId: key.organizationId || null,
      aiProviderKeyId: key.id,
      provider: key.provider || null,
      mode: key.mode || null,
      model: key.model || null,
      requestSource: "ai-service",
      totalTokens,
      success,
      errorMessage: errorMessage ? errorMessage.slice(0, 500) : null
    }
  }).catch(() => undefined);
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
