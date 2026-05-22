CREATE TABLE "Supplier" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "name" TEXT NOT NULL,
  "contactName" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "whatsapp" TEXT,
  "wechat" TEXT,
  "country" TEXT,
  "city" TEXT,
  "address" TEXT,
  "website" TEXT,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "rating" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'candidate',
  "riskLevel" TEXT,
  "notes" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupplierContact" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "supplierId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "whatsapp" TEXT,
  "wechat" TEXT,
  "notes" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupplierContact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupplierQuote" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "supplierId" TEXT NOT NULL,
  "productId" TEXT,
  "sku" TEXT,
  "moq" INTEGER,
  "unitCost" DECIMAL(12,2),
  "currency" TEXT,
  "leadTime" TEXT,
  "sampleFee" DECIMAL(12,2),
  "sampleLeadTime" TEXT,
  "bulkLeadTime" TEXT,
  "validUntil" TIMESTAMP(3),
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupplierQuote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PurchaseNote" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "supplierId" TEXT,
  "productId" TEXT,
  "orderId" TEXT,
  "sampleOrderId" TEXT,
  "customRequestId" TEXT,
  "noteType" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PurchaseNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupplierRisk" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "supplierId" TEXT NOT NULL,
  "riskType" TEXT NOT NULL,
  "level" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'open',
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupplierRisk_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupplierLink" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "supplierId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "relationType" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupplierLink_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Supplier_organizationId_idx" ON "Supplier"("organizationId");
CREATE INDEX "Supplier_status_idx" ON "Supplier"("status");
CREATE INDEX "Supplier_riskLevel_idx" ON "Supplier"("riskLevel");
CREATE INDEX "Supplier_createdBy_idx" ON "Supplier"("createdBy");
CREATE INDEX "SupplierContact_organizationId_idx" ON "SupplierContact"("organizationId");
CREATE INDEX "SupplierContact_supplierId_idx" ON "SupplierContact"("supplierId");
CREATE INDEX "SupplierQuote_organizationId_idx" ON "SupplierQuote"("organizationId");
CREATE INDEX "SupplierQuote_supplierId_idx" ON "SupplierQuote"("supplierId");
CREATE INDEX "SupplierQuote_productId_idx" ON "SupplierQuote"("productId");
CREATE INDEX "SupplierQuote_status_idx" ON "SupplierQuote"("status");
CREATE INDEX "SupplierQuote_validUntil_idx" ON "SupplierQuote"("validUntil");
CREATE INDEX "PurchaseNote_organizationId_idx" ON "PurchaseNote"("organizationId");
CREATE INDEX "PurchaseNote_supplierId_idx" ON "PurchaseNote"("supplierId");
CREATE INDEX "PurchaseNote_productId_idx" ON "PurchaseNote"("productId");
CREATE INDEX "PurchaseNote_orderId_idx" ON "PurchaseNote"("orderId");
CREATE INDEX "PurchaseNote_sampleOrderId_idx" ON "PurchaseNote"("sampleOrderId");
CREATE INDEX "PurchaseNote_customRequestId_idx" ON "PurchaseNote"("customRequestId");
CREATE INDEX "SupplierRisk_organizationId_idx" ON "SupplierRisk"("organizationId");
CREATE INDEX "SupplierRisk_supplierId_idx" ON "SupplierRisk"("supplierId");
CREATE INDEX "SupplierRisk_riskType_idx" ON "SupplierRisk"("riskType");
CREATE INDEX "SupplierRisk_level_idx" ON "SupplierRisk"("level");
CREATE INDEX "SupplierRisk_status_idx" ON "SupplierRisk"("status");
CREATE INDEX "SupplierLink_organizationId_idx" ON "SupplierLink"("organizationId");
CREATE INDEX "SupplierLink_supplierId_idx" ON "SupplierLink"("supplierId");
CREATE INDEX "SupplierLink_entityType_idx" ON "SupplierLink"("entityType");
CREATE INDEX "SupplierLink_entityId_idx" ON "SupplierLink"("entityId");
