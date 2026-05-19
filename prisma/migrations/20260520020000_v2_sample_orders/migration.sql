-- V2-D: URL/manual sample order workflow records.
CREATE TABLE "SampleOrder" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "productId" TEXT,
  "sampleName" TEXT NOT NULL,
  "sampleFee" DECIMAL(12, 2),
  "shippingCost" DECIMAL(12, 2),
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid',
  "shippingStatus" TEXT NOT NULL DEFAULT 'pending',
  "trackingNumber" TEXT,
  "feedbackStatus" TEXT NOT NULL DEFAULT 'pending',
  "expectedShipDate" TIMESTAMP(3),
  "expectedDeliveryDate" TIMESTAMP(3),
  "notes" TEXT,
  "ownerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SampleOrder_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SampleOrder"
  ADD CONSTRAINT "SampleOrder_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SampleOrder"
  ADD CONSTRAINT "SampleOrder_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SampleOrder"
  ADD CONSTRAINT "SampleOrder_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "SampleOrder_ownerId_idx" ON "SampleOrder"("ownerId");
CREATE INDEX "SampleOrder_customerId_idx" ON "SampleOrder"("customerId");
CREATE INDEX "SampleOrder_productId_idx" ON "SampleOrder"("productId");
CREATE INDEX "SampleOrder_ownerId_paymentStatus_idx" ON "SampleOrder"("ownerId", "paymentStatus");
CREATE INDEX "SampleOrder_ownerId_shippingStatus_idx" ON "SampleOrder"("ownerId", "shippingStatus");
CREATE INDEX "SampleOrder_ownerId_feedbackStatus_idx" ON "SampleOrder"("ownerId", "feedbackStatus");
