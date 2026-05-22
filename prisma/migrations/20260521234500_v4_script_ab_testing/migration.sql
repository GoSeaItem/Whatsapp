-- V4-K lightweight script A/B testing.

CREATE TABLE "ScriptExperiment" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "name" TEXT NOT NULL,
  "scenario" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "targetLanguage" TEXT,
  "targetCustomerStage" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScriptExperiment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScriptVariant" (
  "id" TEXT NOT NULL,
  "experimentId" TEXT NOT NULL,
  "organizationId" TEXT,
  "title" TEXT NOT NULL,
  "versionLabel" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "language" TEXT,
  "tone" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScriptVariant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScriptUsage" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "experimentId" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "customerId" TEXT,
  "userId" TEXT NOT NULL,
  "scenario" TEXT NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'web',
  "usedText" TEXT,
  "outcome" TEXT NOT NULL DEFAULT 'used_draft',
  "quoteId" TEXT,
  "orderId" TEXT,
  "followUpTaskId" TEXT,
  "notes" TEXT,
  "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "outcomeAt" TIMESTAMP(3),
  CONSTRAINT "ScriptUsage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ScriptExperiment_organizationId_idx" ON "ScriptExperiment"("organizationId");
CREATE INDEX "ScriptExperiment_scenario_idx" ON "ScriptExperiment"("scenario");
CREATE INDEX "ScriptExperiment_status_idx" ON "ScriptExperiment"("status");
CREATE INDEX "ScriptExperiment_createdBy_idx" ON "ScriptExperiment"("createdBy");

CREATE UNIQUE INDEX "ScriptVariant_experimentId_versionLabel_key" ON "ScriptVariant"("experimentId", "versionLabel");
CREATE INDEX "ScriptVariant_experimentId_idx" ON "ScriptVariant"("experimentId");
CREATE INDEX "ScriptVariant_organizationId_idx" ON "ScriptVariant"("organizationId");
CREATE INDEX "ScriptVariant_versionLabel_idx" ON "ScriptVariant"("versionLabel");
CREATE INDEX "ScriptVariant_enabled_idx" ON "ScriptVariant"("enabled");

CREATE INDEX "ScriptUsage_organizationId_idx" ON "ScriptUsage"("organizationId");
CREATE INDEX "ScriptUsage_experimentId_idx" ON "ScriptUsage"("experimentId");
CREATE INDEX "ScriptUsage_variantId_idx" ON "ScriptUsage"("variantId");
CREATE INDEX "ScriptUsage_customerId_idx" ON "ScriptUsage"("customerId");
CREATE INDEX "ScriptUsage_userId_idx" ON "ScriptUsage"("userId");
CREATE INDEX "ScriptUsage_scenario_idx" ON "ScriptUsage"("scenario");
CREATE INDEX "ScriptUsage_outcome_idx" ON "ScriptUsage"("outcome");

ALTER TABLE "ScriptExperiment" ADD CONSTRAINT "ScriptExperiment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScriptExperiment" ADD CONSTRAINT "ScriptExperiment_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScriptVariant" ADD CONSTRAINT "ScriptVariant_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "ScriptExperiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScriptVariant" ADD CONSTRAINT "ScriptVariant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScriptVariant" ADD CONSTRAINT "ScriptVariant_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScriptUsage" ADD CONSTRAINT "ScriptUsage_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "ScriptExperiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScriptUsage" ADD CONSTRAINT "ScriptUsage_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ScriptVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScriptUsage" ADD CONSTRAINT "ScriptUsage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScriptUsage" ADD CONSTRAINT "ScriptUsage_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScriptUsage" ADD CONSTRAINT "ScriptUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
