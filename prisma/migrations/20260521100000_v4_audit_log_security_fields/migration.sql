-- Add V4-D security audit metadata fields.
ALTER TABLE "AuditLog" ADD COLUMN "ipAddress" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "userAgent" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "riskLevel" TEXT NOT NULL DEFAULT 'low';

CREATE INDEX "AuditLog_riskLevel_idx" ON "AuditLog"("riskLevel");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
