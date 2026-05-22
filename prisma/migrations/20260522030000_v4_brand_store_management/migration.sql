-- V4-M multi-brand / multi-store management.

ALTER TABLE "AIActionSuggestionLog" ADD COLUMN IF NOT EXISTS "brandId" TEXT;
ALTER TABLE "AIActionSuggestionLog" ADD COLUMN IF NOT EXISTS "brandUsed" TEXT;
ALTER TABLE "AIActionSuggestionLog" ADD COLUMN IF NOT EXISTS "brandRulesUsed" JSONB;
CREATE INDEX IF NOT EXISTS "AIActionSuggestionLog_brandId_idx" ON "AIActionSuggestionLog"("brandId");

CREATE TABLE "Brand" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "displayName" TEXT,
  "description" TEXT,
  "logoUrl" TEXT,
  "website" TEXT,
  "defaultLanguage" TEXT,
  "defaultCurrency" TEXT,
  "country" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "notes" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BrandProduct" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "brandId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BrandProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BrandMaterial" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "brandId" TEXT NOT NULL,
  "materialId" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BrandMaterial_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BrandKnowledgeBase" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "brandId" TEXT NOT NULL,
  "knowledgeBaseId" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BrandKnowledgeBase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BrandScript" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "brandId" TEXT NOT NULL,
  "scriptId" TEXT NOT NULL,
  "scriptType" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BrandScript_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BrandRule" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "brandId" TEXT NOT NULL,
  "ruleType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "language" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BrandRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BrandAssignment" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "brandId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "assignedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BrandAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Brand_organizationId_name_key" ON "Brand"("organizationId", "name");
CREATE INDEX "Brand_organizationId_idx" ON "Brand"("organizationId");
CREATE INDEX "Brand_status_idx" ON "Brand"("status");
CREATE INDEX "Brand_createdBy_idx" ON "Brand"("createdBy");

CREATE UNIQUE INDEX "BrandProduct_brandId_productId_key" ON "BrandProduct"("brandId", "productId");
CREATE INDEX "BrandProduct_organizationId_idx" ON "BrandProduct"("organizationId");
CREATE INDEX "BrandProduct_brandId_idx" ON "BrandProduct"("brandId");
CREATE INDEX "BrandProduct_productId_idx" ON "BrandProduct"("productId");

CREATE UNIQUE INDEX "BrandMaterial_brandId_materialId_key" ON "BrandMaterial"("brandId", "materialId");
CREATE INDEX "BrandMaterial_organizationId_idx" ON "BrandMaterial"("organizationId");
CREATE INDEX "BrandMaterial_brandId_idx" ON "BrandMaterial"("brandId");
CREATE INDEX "BrandMaterial_materialId_idx" ON "BrandMaterial"("materialId");

CREATE UNIQUE INDEX "BrandKnowledgeBase_brandId_knowledgeBaseId_key" ON "BrandKnowledgeBase"("brandId", "knowledgeBaseId");
CREATE INDEX "BrandKnowledgeBase_organizationId_idx" ON "BrandKnowledgeBase"("organizationId");
CREATE INDEX "BrandKnowledgeBase_brandId_idx" ON "BrandKnowledgeBase"("brandId");
CREATE INDEX "BrandKnowledgeBase_knowledgeBaseId_idx" ON "BrandKnowledgeBase"("knowledgeBaseId");

CREATE INDEX "BrandScript_organizationId_idx" ON "BrandScript"("organizationId");
CREATE INDEX "BrandScript_brandId_idx" ON "BrandScript"("brandId");
CREATE INDEX "BrandScript_scriptId_idx" ON "BrandScript"("scriptId");

CREATE INDEX "BrandRule_organizationId_idx" ON "BrandRule"("organizationId");
CREATE INDEX "BrandRule_brandId_idx" ON "BrandRule"("brandId");
CREATE INDEX "BrandRule_ruleType_idx" ON "BrandRule"("ruleType");
CREATE INDEX "BrandRule_enabled_idx" ON "BrandRule"("enabled");

CREATE UNIQUE INDEX "BrandAssignment_brandId_entityType_entityId_key" ON "BrandAssignment"("brandId", "entityType", "entityId");
CREATE INDEX "BrandAssignment_organizationId_idx" ON "BrandAssignment"("organizationId");
CREATE INDEX "BrandAssignment_brandId_idx" ON "BrandAssignment"("brandId");
CREATE INDEX "BrandAssignment_entityType_idx" ON "BrandAssignment"("entityType");
CREATE INDEX "BrandAssignment_entityId_idx" ON "BrandAssignment"("entityId");
