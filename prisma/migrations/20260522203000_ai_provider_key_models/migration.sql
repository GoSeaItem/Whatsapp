-- Extend AI provider keys with provider model, owner email and optional base URL.
ALTER TABLE "AiProviderKey" ADD COLUMN "model" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AiProviderKey" ADD COLUMN "userEmail" TEXT;
ALTER TABLE "AiProviderKey" ADD COLUMN "baseUrl" TEXT;

CREATE INDEX "AiProviderKey_model_idx" ON "AiProviderKey"("model");
CREATE INDEX "AiProviderKey_userEmail_idx" ON "AiProviderKey"("userEmail");
