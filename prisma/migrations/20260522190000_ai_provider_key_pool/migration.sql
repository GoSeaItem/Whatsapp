-- Add organization-managed OpenAI key pool for instant/thinking modes.
CREATE TABLE "AiProviderKey" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "name" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'instant',
    "encryptedKey" TEXT NOT NULL,
    "keyLast4" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "priority" INTEGER NOT NULL DEFAULT 100,
    "totalRequests" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "rateLimitCount" INTEGER NOT NULL DEFAULT 0,
    "quotaErrorCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastErrorAt" TIMESTAMP(3),
    "lastErrorMessage" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiProviderKey_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiProviderKey_organizationId_idx" ON "AiProviderKey"("organizationId");
CREATE INDEX "AiProviderKey_provider_idx" ON "AiProviderKey"("provider");
CREATE INDEX "AiProviderKey_mode_idx" ON "AiProviderKey"("mode");
CREATE INDEX "AiProviderKey_status_idx" ON "AiProviderKey"("status");
CREATE INDEX "AiProviderKey_priority_idx" ON "AiProviderKey"("priority");
CREATE INDEX "AiProviderKey_createdBy_idx" ON "AiProviderKey"("createdBy");

ALTER TABLE "AiProviderKey" ADD CONSTRAINT "AiProviderKey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiProviderKey" ADD CONSTRAINT "AiProviderKey_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
