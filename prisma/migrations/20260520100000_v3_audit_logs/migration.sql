ALTER TABLE "AuditLog" ADD COLUMN "userId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "before" JSONB;
ALTER TABLE "AuditLog" ADD COLUMN "after" JSONB;

UPDATE "AuditLog" SET "userId" = "actorId" WHERE "userId" IS NULL;

CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");
