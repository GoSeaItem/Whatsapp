-- V4-B report job tracking for organization analytics.

CREATE TABLE "ReportJob" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "filters" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "result" JSONB,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReportJob_organizationId_idx" ON "ReportJob"("organizationId");
CREATE INDEX "ReportJob_createdBy_idx" ON "ReportJob"("createdBy");
CREATE INDEX "ReportJob_type_idx" ON "ReportJob"("type");
CREATE INDEX "ReportJob_status_idx" ON "ReportJob"("status");

ALTER TABLE "ReportJob" ADD CONSTRAINT "ReportJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReportJob" ADD CONSTRAINT "ReportJob_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
