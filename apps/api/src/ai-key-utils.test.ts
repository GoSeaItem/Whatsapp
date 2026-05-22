import { describe, expect, it } from "vitest";
import {
  decryptProviderKey,
  encryptProviderKey,
  keyLast4,
  maskProviderKey,
  normalizeAiKeyMode,
  normalizeAiKeyStatus
} from "./ai-key-utils.js";

const env = { OPENAI_KEY_ENCRYPTION_SECRET: "test-secret-for-ai-key-pool" };

describe("ai key utils", () => {
  it("encrypts, decrypts, and masks provider keys", () => {
    const apiKey = "sk-test-key-1234567890";
    const encrypted = encryptProviderKey(apiKey, env);

    expect(encrypted).not.toContain(apiKey);
    expect(decryptProviderKey(encrypted, env)).toBe(apiKey);
    expect(maskProviderKey(keyLast4(apiKey))).toBe("****7890");
    expect(keyLast4(apiKey)).toBe("7890");
  });

  it("normalizes mode and status safely", () => {
    expect(normalizeAiKeyMode("thinking")).toBe("thinking");
    expect(normalizeAiKeyMode("bad-value")).toBe("instant");
    expect(normalizeAiKeyStatus("disabled")).toBe("disabled");
    expect(normalizeAiKeyStatus("bad-value")).toBe("active");
  });
});
