-- Add V4-C AI action suggestion logs for sales recommendation auditability.
CREATE TABLE "AIActionSuggestionLog" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "customerId" TEXT,
  "userId" TEXT NOT NULL,
  "actionType" TEXT NOT NULL,
  "scenario" TEXT,
  "inputSnapshot" JSONB,
  "outputSnapshot" JSONB,
  "riskLevel" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AIActionSuggestionLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AIActionSuggestionLog_organizationId_idx" ON "AIActionSuggestionLog"("organizationId");
CREATE INDEX "AIActionSuggestionLog_customerId_idx" ON "AIActionSuggestionLog"("customerId");
CREATE INDEX "AIActionSuggestionLog_userId_idx" ON "AIActionSuggestionLog"("userId");
CREATE INDEX "AIActionSuggestionLog_actionType_idx" ON "AIActionSuggestionLog"("actionType");

ALTER TABLE "AIActionSuggestionLog"
  ADD CONSTRAINT "AIActionSuggestionLog_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AIActionSuggestionLog"
  ADD CONSTRAINT "AIActionSuggestionLog_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AIActionSuggestionLog"
  ADD CONSTRAINT "AIActionSuggestionLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
