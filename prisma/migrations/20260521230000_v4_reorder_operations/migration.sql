-- V4-I reorder operations.

CREATE TABLE "ReorderCampaign" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "name" TEXT NOT NULL,
  "campaignType" TEXT NOT NULL,
  "targetScope" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "filters" JSONB,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReorderCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReorderOpportunity" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "customerId" TEXT NOT NULL,
  "productId" TEXT,
  "orderId" TEXT,
  "campaignId" TEXT,
  "opportunityType" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "level" TEXT NOT NULL,
  "reasons" JSONB,
  "recommendedAction" TEXT,
  "suggestedScript" TEXT,
  "status" TEXT NOT NULL DEFAULT 'open',
  "ownerId" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReorderOpportunity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReorderPlaybook" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "title" TEXT NOT NULL,
  "scenario" TEXT NOT NULL,
  "language" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReorderPlaybook_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReorderCampaign_organizationId_idx" ON "ReorderCampaign"("organizationId");
CREATE INDEX "ReorderCampaign_campaignType_idx" ON "ReorderCampaign"("campaignType");
CREATE INDEX "ReorderCampaign_status_idx" ON "ReorderCampaign"("status");
CREATE INDEX "ReorderCampaign_createdBy_idx" ON "ReorderCampaign"("createdBy");

CREATE INDEX "ReorderOpportunity_organizationId_idx" ON "ReorderOpportunity"("organizationId");
CREATE INDEX "ReorderOpportunity_customerId_idx" ON "ReorderOpportunity"("customerId");
CREATE INDEX "ReorderOpportunity_productId_idx" ON "ReorderOpportunity"("productId");
CREATE INDEX "ReorderOpportunity_campaignId_idx" ON "ReorderOpportunity"("campaignId");
CREATE INDEX "ReorderOpportunity_opportunityType_idx" ON "ReorderOpportunity"("opportunityType");
CREATE INDEX "ReorderOpportunity_status_idx" ON "ReorderOpportunity"("status");
CREATE INDEX "ReorderOpportunity_ownerId_idx" ON "ReorderOpportunity"("ownerId");

CREATE INDEX "ReorderPlaybook_organizationId_idx" ON "ReorderPlaybook"("organizationId");
CREATE INDEX "ReorderPlaybook_scenario_idx" ON "ReorderPlaybook"("scenario");
CREATE INDEX "ReorderPlaybook_language_idx" ON "ReorderPlaybook"("language");
CREATE INDEX "ReorderPlaybook_enabled_idx" ON "ReorderPlaybook"("enabled");
CREATE INDEX "ReorderPlaybook_createdBy_idx" ON "ReorderPlaybook"("createdBy");

ALTER TABLE "ReorderCampaign" ADD CONSTRAINT "ReorderCampaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReorderCampaign" ADD CONSTRAINT "ReorderCampaign_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReorderOpportunity" ADD CONSTRAINT "ReorderOpportunity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReorderOpportunity" ADD CONSTRAINT "ReorderOpportunity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReorderOpportunity" ADD CONSTRAINT "ReorderOpportunity_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReorderOpportunity" ADD CONSTRAINT "ReorderOpportunity_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReorderOpportunity" ADD CONSTRAINT "ReorderOpportunity_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ReorderCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReorderOpportunity" ADD CONSTRAINT "ReorderOpportunity_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReorderOpportunity" ADD CONSTRAINT "ReorderOpportunity_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReorderPlaybook" ADD CONSTRAINT "ReorderPlaybook_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReorderPlaybook" ADD CONSTRAINT "ReorderPlaybook_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
