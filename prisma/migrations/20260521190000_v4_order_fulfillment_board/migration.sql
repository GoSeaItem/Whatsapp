ALTER TABLE "FollowUpTask" ADD COLUMN "orderId" TEXT;

CREATE TABLE "OrderFulfillmentAlert" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "orderId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "alertType" TEXT NOT NULL,
  "level" TEXT NOT NULL,
  "reason" TEXT,
  "recommendedAction" TEXT,
  "status" TEXT NOT NULL DEFAULT 'open',
  "ownerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrderFulfillmentAlert_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FollowUpTask_orderId_idx" ON "FollowUpTask"("orderId");
CREATE INDEX "OrderFulfillmentAlert_organizationId_idx" ON "OrderFulfillmentAlert"("organizationId");
CREATE INDEX "OrderFulfillmentAlert_orderId_idx" ON "OrderFulfillmentAlert"("orderId");
CREATE INDEX "OrderFulfillmentAlert_customerId_idx" ON "OrderFulfillmentAlert"("customerId");
CREATE INDEX "OrderFulfillmentAlert_alertType_idx" ON "OrderFulfillmentAlert"("alertType");
CREATE INDEX "OrderFulfillmentAlert_status_idx" ON "OrderFulfillmentAlert"("status");
CREATE INDEX "OrderFulfillmentAlert_ownerId_idx" ON "OrderFulfillmentAlert"("ownerId");
CREATE UNIQUE INDEX "OrderFulfillmentAlert_orderId_alertType_key" ON "OrderFulfillmentAlert"("orderId", "alertType");

ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderFulfillmentAlert" ADD CONSTRAINT "OrderFulfillmentAlert_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderFulfillmentAlert" ADD CONSTRAINT "OrderFulfillmentAlert_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderFulfillmentAlert" ADD CONSTRAINT "OrderFulfillmentAlert_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderFulfillmentAlert" ADD CONSTRAINT "OrderFulfillmentAlert_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;