CREATE TABLE "OrganizationUnit" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "parentId" TEXT,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'organization',
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationUnit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EnterpriseRole" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "roleName" TEXT NOT NULL,
  "permissions" JSONB NOT NULL,
  "description" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EnterpriseRole_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EnterpriseAuditLog" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "organizationUnitId" TEXT,
  "userId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "metadata" JSONB,
  "riskLevel" TEXT NOT NULL DEFAULT 'low',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EnterpriseAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EnterpriseReport" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "reportType" TEXT NOT NULL,
  "filters" JSONB,
  "result" JSONB,
  "status" TEXT NOT NULL DEFAULT 'completed',
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EnterpriseReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EnterpriseResourceLink" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "sourceOrganizationId" TEXT NOT NULL,
  "targetOrganizationId" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "accessLevel" TEXT NOT NULL DEFAULT 'read',
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EnterpriseResourceLink_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrganizationUnit_organizationId_idx" ON "OrganizationUnit"("organizationId");
CREATE INDEX "OrganizationUnit_parentId_idx" ON "OrganizationUnit"("parentId");
CREATE INDEX "OrganizationUnit_type_idx" ON "OrganizationUnit"("type");
CREATE INDEX "OrganizationUnit_status_idx" ON "OrganizationUnit"("status");
CREATE INDEX "OrganizationUnit_createdBy_idx" ON "OrganizationUnit"("createdBy");

CREATE UNIQUE INDEX "EnterpriseRole_organizationId_roleName_key" ON "EnterpriseRole"("organizationId", "roleName");
CREATE INDEX "EnterpriseRole_organizationId_idx" ON "EnterpriseRole"("organizationId");
CREATE INDEX "EnterpriseRole_roleName_idx" ON "EnterpriseRole"("roleName");
CREATE INDEX "EnterpriseRole_createdBy_idx" ON "EnterpriseRole"("createdBy");

CREATE INDEX "EnterpriseAuditLog_organizationId_idx" ON "EnterpriseAuditLog"("organizationId");
CREATE INDEX "EnterpriseAuditLog_organizationUnitId_idx" ON "EnterpriseAuditLog"("organizationUnitId");
CREATE INDEX "EnterpriseAuditLog_userId_idx" ON "EnterpriseAuditLog"("userId");
CREATE INDEX "EnterpriseAuditLog_action_idx" ON "EnterpriseAuditLog"("action");
CREATE INDEX "EnterpriseAuditLog_entityType_idx" ON "EnterpriseAuditLog"("entityType");
CREATE INDEX "EnterpriseAuditLog_riskLevel_idx" ON "EnterpriseAuditLog"("riskLevel");
CREATE INDEX "EnterpriseAuditLog_createdAt_idx" ON "EnterpriseAuditLog"("createdAt");

CREATE INDEX "EnterpriseReport_organizationId_idx" ON "EnterpriseReport"("organizationId");
CREATE INDEX "EnterpriseReport_reportType_idx" ON "EnterpriseReport"("reportType");
CREATE INDEX "EnterpriseReport_status_idx" ON "EnterpriseReport"("status");
CREATE INDEX "EnterpriseReport_createdBy_idx" ON "EnterpriseReport"("createdBy");

CREATE INDEX "EnterpriseResourceLink_organizationId_idx" ON "EnterpriseResourceLink"("organizationId");
CREATE INDEX "EnterpriseResourceLink_sourceOrganizationId_idx" ON "EnterpriseResourceLink"("sourceOrganizationId");
CREATE INDEX "EnterpriseResourceLink_targetOrganizationId_idx" ON "EnterpriseResourceLink"("targetOrganizationId");
CREATE INDEX "EnterpriseResourceLink_resourceType_idx" ON "EnterpriseResourceLink"("resourceType");
CREATE INDEX "EnterpriseResourceLink_resourceId_idx" ON "EnterpriseResourceLink"("resourceId");
CREATE INDEX "EnterpriseResourceLink_status_idx" ON "EnterpriseResourceLink"("status");
