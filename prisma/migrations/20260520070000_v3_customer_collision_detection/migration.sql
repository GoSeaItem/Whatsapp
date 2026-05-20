-- Add V3-D customer duplicate collision fields and event logs.
ALTER TABLE "Customer" ADD COLUMN "socialLinks" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "CustomerDuplicateEventLog" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "ownerId" TEXT NOT NULL,
  "attemptedBy" TEXT NOT NULL,
  "matchedCustomerId" TEXT NOT NULL,
  "fields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "source" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CustomerDuplicateEventLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomerDuplicateEventLog_organizationId_idx" ON "CustomerDuplicateEventLog"("organizationId");
CREATE INDEX "CustomerDuplicateEventLog_ownerId_idx" ON "CustomerDuplicateEventLog"("ownerId");
CREATE INDEX "CustomerDuplicateEventLog_attemptedBy_idx" ON "CustomerDuplicateEventLog"("attemptedBy");
CREATE INDEX "CustomerDuplicateEventLog_matchedCustomerId_idx" ON "CustomerDuplicateEventLog"("matchedCustomerId");

ALTER TABLE "CustomerDuplicateEventLog"
  ADD CONSTRAINT "CustomerDuplicateEventLog_matchedCustomerId_fkey"
  FOREIGN KEY ("matchedCustomerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
