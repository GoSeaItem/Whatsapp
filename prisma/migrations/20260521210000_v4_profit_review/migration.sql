-- V4-H lightweight profit and cost review.
CREATE TABLE "OrderCost" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "orderId" TEXT NOT NULL,
    "currency" TEXT,
    "productCost" DECIMAL(12,2),
    "packagingCost" DECIMAL(12,2),
    "domesticShipping" DECIMAL(12,2),
    "internationalShipping" DECIMAL(12,2),
    "paymentFee" DECIMAL(12,2),
    "platformFee" DECIMAL(12,2),
    "refundAmount" DECIMAL(12,2),
    "reshipCost" DECIMAL(12,2),
    "otherCost" DECIMAL(12,2),
    "totalCost" DECIMAL(12,2),
    "grossProfit" DECIMAL(12,2),
    "grossMargin" DECIMAL(8,2),
    "costConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmedBy" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderCost_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrderCost_orderId_key" ON "OrderCost"("orderId");
CREATE INDEX "OrderCost_organizationId_idx" ON "OrderCost"("organizationId");
CREATE INDEX "OrderCost_orderId_idx" ON "OrderCost"("orderId");
CREATE INDEX "OrderCost_createdBy_idx" ON "OrderCost"("createdBy");
CREATE INDEX "OrderCost_costConfirmed_idx" ON "OrderCost"("costConfirmed");

ALTER TABLE "OrderCost" ADD CONSTRAINT "OrderCost_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderCost" ADD CONSTRAINT "OrderCost_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderCost" ADD CONSTRAINT "OrderCost_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderCost" ADD CONSTRAINT "OrderCost_confirmedBy_fkey" FOREIGN KEY ("confirmedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
