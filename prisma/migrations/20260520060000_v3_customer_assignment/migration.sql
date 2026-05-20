-- V3-C customer ownership and assignment.

ALTER TABLE "Customer"
  ADD COLUMN "email" TEXT,
  ADD COLUMN "organizationId" TEXT,
  ADD COLUMN "assignedTo" TEXT,
  ADD COLUMN "collaborators" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX "Customer_assignedTo_idx" ON "Customer"("assignedTo");
CREATE INDEX "Customer_organizationId_idx" ON "Customer"("organizationId");

ALTER TABLE "Customer"
  ADD CONSTRAINT "Customer_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Customer"
  ADD CONSTRAINT "Customer_assignedTo_fkey"
  FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "CustomerAssignmentLog" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "fromUserId" TEXT,
  "toUserId" TEXT,
  "operatedBy" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CustomerAssignmentLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomerAssignmentLog_customerId_idx" ON "CustomerAssignmentLog"("customerId");
CREATE INDEX "CustomerAssignmentLog_organizationId_idx" ON "CustomerAssignmentLog"("organizationId");
CREATE INDEX "CustomerAssignmentLog_operatedBy_idx" ON "CustomerAssignmentLog"("operatedBy");

ALTER TABLE "CustomerAssignmentLog"
  ADD CONSTRAINT "CustomerAssignmentLog_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
