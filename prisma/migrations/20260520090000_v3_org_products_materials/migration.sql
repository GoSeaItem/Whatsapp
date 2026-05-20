-- V3-F organization shared products and materials.

CREATE TABLE "OrganizationProduct" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OrganizationProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizationMaterial" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "materialId" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OrganizationMaterial_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizationProduct_organizationId_productId_key" ON "OrganizationProduct"("organizationId", "productId");
CREATE INDEX "OrganizationProduct_organizationId_idx" ON "OrganizationProduct"("organizationId");
CREATE INDEX "OrganizationProduct_productId_idx" ON "OrganizationProduct"("productId");
CREATE INDEX "OrganizationProduct_createdBy_idx" ON "OrganizationProduct"("createdBy");

CREATE UNIQUE INDEX "OrganizationMaterial_organizationId_materialId_key" ON "OrganizationMaterial"("organizationId", "materialId");
CREATE INDEX "OrganizationMaterial_organizationId_idx" ON "OrganizationMaterial"("organizationId");
CREATE INDEX "OrganizationMaterial_materialId_idx" ON "OrganizationMaterial"("materialId");
CREATE INDEX "OrganizationMaterial_createdBy_idx" ON "OrganizationMaterial"("createdBy");

ALTER TABLE "OrganizationProduct" ADD CONSTRAINT "OrganizationProduct_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationProduct" ADD CONSTRAINT "OrganizationProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationProduct" ADD CONSTRAINT "OrganizationProduct_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrganizationMaterial" ADD CONSTRAINT "OrganizationMaterial_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationMaterial" ADD CONSTRAINT "OrganizationMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationMaterial" ADD CONSTRAINT "OrganizationMaterial_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
