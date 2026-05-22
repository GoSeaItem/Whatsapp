-- V4-J after-sales and exception management.

CREATE TABLE "AfterSalesCase" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "customerId" TEXT NOT NULL,
  "orderId" TEXT,
  "productId" TEXT,
  "caseNo" TEXT NOT NULL,
  "caseType" TEXT NOT NULL,
  "priority" TEXT NOT NULL DEFAULT 'medium',
  "status" TEXT NOT NULL DEFAULT 'open',
  "responsibility" TEXT DEFAULT 'unknown',
  "requestedSolution" TEXT,
  "finalSolution" TEXT,
  "refundAmount" DECIMAL(12,2),
  "reshipCost" DECIMAL(12,2),
  "compensationAmount" DECIMAL(12,2),
  "currency" TEXT,
  "description" TEXT,
  "customerClaim" TEXT,
  "internalNotes" TEXT,
  "evidenceUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "resolutionNotes" TEXT,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "ownerId" TEXT NOT NULL,
  "assignedTo" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AfterSalesCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AfterSalesEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "afterSalesCaseId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "oldValue" JSONB,
  "newValue" JSONB,
  "notes" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AfterSalesEvent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "FollowUpTask" ADD COLUMN "afterSalesCaseId" TEXT;

CREATE UNIQUE INDEX "AfterSalesCase_organizationId_caseNo_key" ON "AfterSalesCase"("organizationId", "caseNo");
CREATE UNIQUE INDEX "AfterSalesCase_ownerId_caseNo_key" ON "AfterSalesCase"("ownerId", "caseNo");

CREATE INDEX "AfterSalesCase_organizationId_idx" ON "AfterSalesCase"("organizationId");
CREATE INDEX "AfterSalesCase_customerId_idx" ON "AfterSalesCase"("customerId");
CREATE INDEX "AfterSalesCase_orderId_idx" ON "AfterSalesCase"("orderId");
CREATE INDEX "AfterSalesCase_productId_idx" ON "AfterSalesCase"("productId");
CREATE INDEX "AfterSalesCase_caseType_idx" ON "AfterSalesCase"("caseType");
CREATE INDEX "AfterSalesCase_priority_idx" ON "AfterSalesCase"("priority");
CREATE INDEX "AfterSalesCase_status_idx" ON "AfterSalesCase"("status");
CREATE INDEX "AfterSalesCase_ownerId_idx" ON "AfterSalesCase"("ownerId");
CREATE INDEX "AfterSalesCase_assignedTo_idx" ON "AfterSalesCase"("assignedTo");

CREATE INDEX "AfterSalesEvent_organizationId_idx" ON "AfterSalesEvent"("organizationId");
CREATE INDEX "AfterSalesEvent_afterSalesCaseId_idx" ON "AfterSalesEvent"("afterSalesCaseId");
CREATE INDEX "AfterSalesEvent_eventType_idx" ON "AfterSalesEvent"("eventType");
CREATE INDEX "AfterSalesEvent_createdBy_idx" ON "AfterSalesEvent"("createdBy");

CREATE INDEX "FollowUpTask_afterSalesCaseId_idx" ON "FollowUpTask"("afterSalesCaseId");

ALTER TABLE "AfterSalesCase" ADD CONSTRAINT "AfterSalesCase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AfterSalesCase" ADD CONSTRAINT "AfterSalesCase_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AfterSalesCase" ADD CONSTRAINT "AfterSalesCase_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AfterSalesCase" ADD CONSTRAINT "AfterSalesCase_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AfterSalesCase" ADD CONSTRAINT "AfterSalesCase_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AfterSalesCase" ADD CONSTRAINT "AfterSalesCase_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AfterSalesCase" ADD CONSTRAINT "AfterSalesCase_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AfterSalesEvent" ADD CONSTRAINT "AfterSalesEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AfterSalesEvent" ADD CONSTRAINT "AfterSalesEvent_afterSalesCaseId_fkey" FOREIGN KEY ("afterSalesCaseId") REFERENCES "AfterSalesCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AfterSalesEvent" ADD CONSTRAINT "AfterSalesEvent_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_afterSalesCaseId_fkey" FOREIGN KEY ("afterSalesCaseId") REFERENCES "AfterSalesCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
