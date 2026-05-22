CREATE TABLE "CustomerPrediction" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "customerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "predictionType" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "level" TEXT NOT NULL,
  "reasons" JSONB,
  "recommendedAction" TEXT,
  "suggestedScript" TEXT,
  "status" TEXT NOT NULL DEFAULT 'open',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CustomerPrediction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReorderReminder" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "customerId" TEXT NOT NULL,
  "productId" TEXT,
  "reminderType" TEXT NOT NULL,
  "remindAt" TIMESTAMP(3) NOT NULL,
  "reason" TEXT,
  "suggestedScript" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "ownerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ReorderReminder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerPrediction_customerId_userId_predictionType_key" ON "CustomerPrediction"("customerId", "userId", "predictionType");
CREATE INDEX "CustomerPrediction_organizationId_idx" ON "CustomerPrediction"("organizationId");
CREATE INDEX "CustomerPrediction_customerId_idx" ON "CustomerPrediction"("customerId");
CREATE INDEX "CustomerPrediction_userId_idx" ON "CustomerPrediction"("userId");
CREATE INDEX "CustomerPrediction_predictionType_idx" ON "CustomerPrediction"("predictionType");
CREATE INDEX "CustomerPrediction_status_idx" ON "CustomerPrediction"("status");

CREATE INDEX "ReorderReminder_organizationId_idx" ON "ReorderReminder"("organizationId");
CREATE INDEX "ReorderReminder_customerId_idx" ON "ReorderReminder"("customerId");
CREATE INDEX "ReorderReminder_productId_idx" ON "ReorderReminder"("productId");
CREATE INDEX "ReorderReminder_ownerId_idx" ON "ReorderReminder"("ownerId");
CREATE INDEX "ReorderReminder_status_idx" ON "ReorderReminder"("status");
CREATE INDEX "ReorderReminder_remindAt_idx" ON "ReorderReminder"("remindAt");

ALTER TABLE "CustomerPrediction" ADD CONSTRAINT "CustomerPrediction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerPrediction" ADD CONSTRAINT "CustomerPrediction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerPrediction" ADD CONSTRAINT "CustomerPrediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReorderReminder" ADD CONSTRAINT "ReorderReminder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReorderReminder" ADD CONSTRAINT "ReorderReminder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReorderReminder" ADD CONSTRAINT "ReorderReminder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReorderReminder" ADD CONSTRAINT "ReorderReminder_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
