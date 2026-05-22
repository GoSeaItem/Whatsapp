CREATE TABLE "Order" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "customerId" TEXT NOT NULL,
  "quoteId" TEXT,
  "sampleOrderId" TEXT,
  "customRequestId" TEXT,
  "orderNo" TEXT NOT NULL,
  "orderType" TEXT NOT NULL,
  "title" TEXT,
  "amount" DECIMAL(12,2),
  "currency" TEXT,
  "quantity" INTEGER,
  "productId" TEXT,
  "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid',
  "productionStatus" TEXT NOT NULL DEFAULT 'not_started',
  "shippingStatus" TEXT NOT NULL DEFAULT 'pending',
  "afterSalesStatus" TEXT NOT NULL DEFAULT 'none',
  "orderStatus" TEXT NOT NULL DEFAULT 'draft',
  "expectedShipDate" TIMESTAMP(3),
  "expectedDeliveryDate" TIMESTAMP(3),
  "trackingNumber" TEXT,
  "notes" TEXT,
  "files" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "ownerId" TEXT NOT NULL,
  "assignedTo" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Order_organizationId_orderNo_key" ON "Order"("organizationId", "orderNo");
CREATE UNIQUE INDEX "Order_ownerId_orderNo_key" ON "Order"("ownerId", "orderNo");
CREATE INDEX "Order_organizationId_idx" ON "Order"("organizationId");
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");
CREATE INDEX "Order_quoteId_idx" ON "Order"("quoteId");
CREATE INDEX "Order_sampleOrderId_idx" ON "Order"("sampleOrderId");
CREATE INDEX "Order_customRequestId_idx" ON "Order"("customRequestId");
CREATE INDEX "Order_productId_idx" ON "Order"("productId");
CREATE INDEX "Order_ownerId_idx" ON "Order"("ownerId");
CREATE INDEX "Order_assignedTo_idx" ON "Order"("assignedTo");
CREATE INDEX "Order_orderStatus_idx" ON "Order"("orderStatus");
CREATE INDEX "Order_paymentStatus_idx" ON "Order"("paymentStatus");
CREATE INDEX "Order_productionStatus_idx" ON "Order"("productionStatus");
CREATE INDEX "Order_shippingStatus_idx" ON "Order"("shippingStatus");

ALTER TABLE "Order" ADD CONSTRAINT "Order_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_sampleOrderId_fkey" FOREIGN KEY ("sampleOrderId") REFERENCES "SampleOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_customRequestId_fkey" FOREIGN KEY ("customRequestId") REFERENCES "CustomRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
