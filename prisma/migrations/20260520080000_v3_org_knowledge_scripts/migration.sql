-- V3-E organization shared knowledge base, shared script library, and audit logs.

CREATE TABLE "KnowledgeBaseOrg" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "language" TEXT NOT NULL DEFAULT 'other',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "KnowledgeBaseOrg_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScriptOrg" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "language" TEXT NOT NULL DEFAULT 'other',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ScriptOrg_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "actorId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "KnowledgeBaseOrg_organizationId_idx" ON "KnowledgeBaseOrg"("organizationId");
CREATE INDEX "KnowledgeBaseOrg_organizationId_category_idx" ON "KnowledgeBaseOrg"("organizationId", "category");
CREATE INDEX "KnowledgeBaseOrg_organizationId_language_idx" ON "KnowledgeBaseOrg"("organizationId", "language");
CREATE INDEX "KnowledgeBaseOrg_organizationId_enabled_idx" ON "KnowledgeBaseOrg"("organizationId", "enabled");

CREATE INDEX "ScriptOrg_organizationId_idx" ON "ScriptOrg"("organizationId");
CREATE INDEX "ScriptOrg_organizationId_category_idx" ON "ScriptOrg"("organizationId", "category");
CREATE INDEX "ScriptOrg_organizationId_language_idx" ON "ScriptOrg"("organizationId", "language");
CREATE INDEX "ScriptOrg_organizationId_enabled_idx" ON "ScriptOrg"("organizationId", "enabled");

CREATE INDEX "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

ALTER TABLE "KnowledgeBaseOrg" ADD CONSTRAINT "KnowledgeBaseOrg_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeBaseOrg" ADD CONSTRAINT "KnowledgeBaseOrg_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ScriptOrg" ADD CONSTRAINT "ScriptOrg_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScriptOrg" ADD CONSTRAINT "ScriptOrg_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
