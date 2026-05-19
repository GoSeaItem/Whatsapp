-- V2-A: company knowledge base for AI draft grounding.
CREATE TABLE "KnowledgeBase" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "language" TEXT NOT NULL DEFAULT 'other',
  "productId" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "ownerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "KnowledgeBase_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "KnowledgeBase"
  ADD CONSTRAINT "KnowledgeBase_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "KnowledgeBase"
  ADD CONSTRAINT "KnowledgeBase_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "KnowledgeBase_ownerId_idx" ON "KnowledgeBase"("ownerId");
CREATE INDEX "KnowledgeBase_ownerId_category_idx" ON "KnowledgeBase"("ownerId", "category");
CREATE INDEX "KnowledgeBase_ownerId_language_idx" ON "KnowledgeBase"("ownerId", "language");
CREATE INDEX "KnowledgeBase_ownerId_productId_idx" ON "KnowledgeBase"("ownerId", "productId");
CREATE INDEX "KnowledgeBase_ownerId_enabled_idx" ON "KnowledgeBase"("ownerId", "enabled");
