CREATE TABLE "CustomRequest" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "productId" TEXT,
  "requestType" TEXT NOT NULL,
  "logoRequired" BOOLEAN NOT NULL DEFAULT false,
  "packagingRequired" BOOLEAN NOT NULL DEFAULT false,
  "colorRequirement" TEXT,
  "sizeRequirement" TEXT,
  "materialRequirement" TEXT,
  "quantity" INTEGER,
  "moq" INTEGER,
  "sampleFee" DECIMAL(12, 2),
  "sampleLeadTime" TEXT,
  "bulkLeadTime" TEXT,
  "files" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status" TEXT NOT NULL DEFAULT 'draft',
  "notes" TEXT,
  "ownerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomRequest_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CustomRequest"
  ADD CONSTRAINT "CustomRequest_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomRequest"
  ADD CONSTRAINT "CustomRequest_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomRequest"
  ADD CONSTRAINT "CustomRequest_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "CustomRequest_ownerId_idx" ON "CustomRequest"("ownerId");
CREATE INDEX "CustomRequest_customerId_idx" ON "CustomRequest"("customerId");
CREATE INDEX "CustomRequest_productId_idx" ON "CustomRequest"("productId");
CREATE INDEX "CustomRequest_ownerId_requestType_idx" ON "CustomRequest"("ownerId", "requestType");
CREATE INDEX "CustomRequest_ownerId_status_idx" ON "CustomRequest"("ownerId", "status");
