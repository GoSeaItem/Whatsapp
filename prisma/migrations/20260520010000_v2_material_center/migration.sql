-- V2-B: URL-based sales material center.
CREATE TABLE "Material" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "description" TEXT,
  "language" TEXT NOT NULL DEFAULT 'other',
  "productId" TEXT,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "ownerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Material"
  ADD CONSTRAINT "Material_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Material"
  ADD CONSTRAINT "Material_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Material_ownerId_idx" ON "Material"("ownerId");
CREATE INDEX "Material_ownerId_type_idx" ON "Material"("ownerId", "type");
CREATE INDEX "Material_ownerId_language_idx" ON "Material"("ownerId", "language");
CREATE INDEX "Material_ownerId_productId_idx" ON "Material"("ownerId", "productId");
