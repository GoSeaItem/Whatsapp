import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export const AI_KEY_MODES = ["instant", "thinking"] as const;
export const AI_KEY_STATUSES = ["active", "disabled", "exhausted"] as const;
export type AiKeyMode = typeof AI_KEY_MODES[number];
export type AiKeyStatus = typeof AI_KEY_STATUSES[number];

export function normalizeAiKeyMode(value: unknown): AiKeyMode {
  return value === "thinking" ? "thinking" : "instant";
}

export function normalizeAiKeyStatus(value: unknown): AiKeyStatus {
  return AI_KEY_STATUSES.includes(value as AiKeyStatus) ? value as AiKeyStatus : "active";
}

export function encryptProviderKey(plainText: string, env: NodeJS.ProcessEnv = process.env) {
  const key = encryptionKey(env);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function decryptProviderKey(encryptedText: string, env: NodeJS.ProcessEnv = process.env) {
  const [version, ivText, tagText, encrypted] = encryptedText.split(":");
  if (version !== "v1" || !ivText || !tagText || !encrypted) throw new Error("invalid encrypted provider key");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(env), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}

export function maskProviderKey(last4: string) {
  return `****${last4 || "????"}`;
}

export function keyLast4(apiKey: string) {
  return apiKey.trim().slice(-4);
}

export function serializeAiProviderKey(key: any) {
  return {
    id: key.id,
    organizationId: key.organizationId,
    provider: key.provider,
    name: key.name,
    mode: key.mode,
    model: key.model || "",
    userEmail: key.userEmail || null,
    baseUrl: key.baseUrl || null,
    maskedKey: maskProviderKey(key.keyLast4),
    status: key.status,
    priority: key.priority,
    totalRequests: key.totalRequests,
    totalTokens: key.totalTokens,
    successCount: key.successCount,
    errorCount: key.errorCount,
    rateLimitCount: key.rateLimitCount,
    quotaErrorCount: key.quotaErrorCount,
    lastUsedAt: key.lastUsedAt ? key.lastUsedAt.toISOString() : null,
    lastSuccessAt: key.lastSuccessAt ? key.lastSuccessAt.toISOString() : null,
    lastErrorAt: key.lastErrorAt ? key.lastErrorAt.toISOString() : null,
    lastErrorMessage: key.lastErrorMessage || null,
    createdBy: key.createdBy,
    createdAt: key.createdAt instanceof Date ? key.createdAt.toISOString() : String(key.createdAt),
    updatedAt: key.updatedAt instanceof Date ? key.updatedAt.toISOString() : String(key.updatedAt)
  };
}

function encryptionKey(env: NodeJS.ProcessEnv) {
  const secret = env.OPENAI_KEY_ENCRYPTION_SECRET || env.COOKIE_SECRET || env.SESSION_SECRET;
  if (!secret) throw new Error("OPENAI_KEY_ENCRYPTION_SECRET, COOKIE_SECRET, or SESSION_SECRET is required to store AI provider keys");
  return createHash("sha256").update(secret).digest();
}
