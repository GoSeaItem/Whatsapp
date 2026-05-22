export type AiProviderName = "deepseek" | "openai";
export type AiModelMode = "instant" | "thinking";

export type AiModelDefinition = {
  id: string;
  label: string;
  provider: AiProviderName;
  mode: AiModelMode;
  model: string;
  baseUrl: string;
  priority: number;
};

export function aiModelRegistry(env: NodeJS.ProcessEnv = process.env): AiModelDefinition[] {
  const deepseekBaseUrl = (env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/+$/, "");
  const openaiBaseUrl = (env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  return [
    {
      id: "deepseek-v4-fastest",
      label: "DeepSeek V4 Flash",
      provider: "deepseek",
      mode: "instant",
      model: env.DEEPSEEK_V4_FASTEST_MODEL || "deepseek-v4-flash",
      baseUrl: deepseekBaseUrl,
      priority: 10
    },
    {
      id: "deepseek-v4-pro",
      label: "DeepSeek V4 Pro",
      provider: "deepseek",
      mode: "thinking",
      model: env.DEEPSEEK_V4_THINKING_MODEL || "deepseek-v4-pro",
      baseUrl: deepseekBaseUrl,
      priority: 20
    },
    {
      id: "deepseek-v4-chat",
      label: "DeepSeek V4 Chat",
      provider: "deepseek",
      mode: "instant",
      model: env.DEEPSEEK_V4_CHAT_MODEL || "deepseek-v4-chat",
      baseUrl: deepseekBaseUrl,
      priority: 30
    },
    {
      id: "deepseek-v4-reasoner",
      label: "DeepSeek V4 Reasoner",
      provider: "deepseek",
      mode: "thinking",
      model: env.DEEPSEEK_V4_REASONER_MODEL || "deepseek-v4-reasoner",
      baseUrl: deepseekBaseUrl,
      priority: 40
    },
    {
      id: "chatgpt-5.5-instant",
      label: "ChatGPT 5.5 Instant",
      provider: "openai",
      mode: "instant",
      model: env.OPENAI_GPT55_INSTANT_MODEL || env.OPENAI_INSTANT_MODEL || env.OPENAI_MODEL || "gpt-5.5-instant",
      baseUrl: openaiBaseUrl,
      priority: 100
    },
    {
      id: "chatgpt-5.5-thinking",
      label: "ChatGPT 5.5 Thinking",
      provider: "openai",
      mode: "thinking",
      model: env.OPENAI_GPT55_THINKING_MODEL || env.OPENAI_THINKING_MODEL || "gpt-5.5-thinking",
      baseUrl: openaiBaseUrl,
      priority: 110
    }
  ];
}

export function findAiModel(idOrModel: string | null | undefined, env: NodeJS.ProcessEnv = process.env): AiModelDefinition | null {
  const value = (idOrModel || "").trim();
  if (!value) return null;
  return aiModelRegistry(env).find((item) => item.id === value || item.model === value) || null;
}

export function defaultModelForMode(mode: string | null | undefined, env: NodeJS.ProcessEnv = process.env): AiModelDefinition {
  const normalized = mode === "thinking" ? "thinking" : "instant";
  const registry = aiModelRegistry(env);
  return registry.find((item) => item.mode === normalized) || registry[0]!;
}
