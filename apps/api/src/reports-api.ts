import { Router } from "express";
import { REPORT_JOB_TYPES, type ReportJobType } from "@wa-ai/shared";
import { prisma } from "./db.js";
import { writeAuditLog } from "./audit-log-utils.js";
import { buildTeamDashboardSummary, parseNow, requireTeamDashboardAccess, teamSummaryToCsv } from "./dashboard-api.js";
import { organizationIdFromRequest } from "./organization-permissions.js";

type ReportsDb = typeof prisma;

export function createReportsRouter(db: ReportsDb = prisma) {
  const router = Router();

  router.get("/team-summary", async (req, res, next) => {
    try {
      const organizationId = organizationIdFromRequest(req);
      if (!await requireReportsAccess(db, organizationId, req.user!.id)) return res.status(403).json({ message: "owner or manager role required" });
      const summary = await buildTeamDashboardSummary(db as any, organizationId, parseNow(req.query.now));
      if (req.query.format === "csv" || req.query.format === "excel") {
        const excel = req.query.format === "excel";
        res.setHeader("Content-Type", excel ? "application/vnd.ms-excel; charset=utf-8" : "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="team-report-${new Date().toISOString().slice(0, 10)}.${excel ? "xls" : "csv"}"`);
        res.send(teamSummaryToCsv(summary));
        return;
      }
      res.json(summary);
    } catch (error) {
      next(error);
    }
  });

  router.get("/high-intent-customers", async (req, res, next) => {
    try {
      const organizationId = organizationIdFromRequest(req);
      if (!await requireReportsAccess(db, organizationId, req.user!.id)) return res.status(403).json({ message: "owner or manager role required" });
      const summary = await buildTeamDashboardSummary(db as any, organizationId, parseNow(req.query.now), 50);
      let rows = summary.highIntentCustomers;
      if (typeof req.query.assignedTo === "string" && req.query.assignedTo) rows = rows.filter((item) => item.assignedTo === req.query.assignedTo);
      if (typeof req.query.stage === "string" && req.query.stage) rows = rows.filter((item) => item.stage === req.query.stage);
      if (typeof req.query.intentLevel === "string" && req.query.intentLevel) rows = rows.filter((item) => item.intentLevel === req.query.intentLevel);
      const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
      res.json(rows.slice(0, limit));
    } catch (error) {
      next(error);
    }
  });

  router.post("/generate", async (req, res, next) => {
    try {
      const organizationId = organizationIdFromRequest(req);
      const type = String(req.body?.type || "");
      if (!isReportJobType(type)) return res.status(400).json({ message: "invalid report type" });
      if (!await requireReportsAccess(db, organizationId, req.user!.id)) return res.status(403).json({ message: "owner or manager role required" });
      const filters = typeof req.body?.filters === "object" && req.body.filters ? req.body.filters : {};
      const pending = await db.reportJob.create({
        data: { organizationId, type, filters, status: "processing", createdBy: req.user!.id }
      });
      try {
        const result = await buildReportResult(db, organizationId, type, filters);
        const job = await db.reportJob.update({ where: { id: pending.id }, data: { status: "completed", result } });
        await writeAuditLog(db as any, {
          organizationId,
          userId: req.user!.id,
          action: "create",
          entityType: "ReportJob",
          entityId: job.id,
          after: { type, status: "completed", filters, result }
        });
        res.json({ job: serializeReportJob(job) });
      } catch (error) {
        const result = { message: error instanceof Error ? error.message : "report generation failed" };
        const job = await db.reportJob.update({ where: { id: pending.id }, data: { status: "failed", result } });
        await writeAuditLog(db as any, {
          organizationId,
          userId: req.user!.id,
          action: "create",
          entityType: "ReportJob",
          entityId: job.id,
          after: { type, status: "failed", filters, result }
        });
        res.status(400).json({ job: serializeReportJob(job) });
      }
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id/status", async (req, res, next) => {
    try {
      const job = await db.reportJob.findUnique({ where: { id: req.params.id } });
      if (!job) return res.status(404).json({ message: "report job not found" });
      if (!await requireReportsAccess(db, job.organizationId, req.user!.id)) return res.status(403).json({ message: "owner or manager role required" });
      res.json(serializeReportJob(job));
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export const reportsRouter = createReportsRouter();

async function requireReportsAccess(db: any, organizationId: string, userId: string) {
  if (!organizationId) return false;
  return Boolean(await requireTeamDashboardAccess(db, organizationId, userId));
}

function isReportJobType(value: string): value is ReportJobType {
  return (REPORT_JOB_TYPES as readonly string[]).includes(value);
}

async function buildReportResult(db: ReportsDb, organizationId: string, type: ReportJobType, filters: Record<string, unknown>) {
  const now = parseNow(filters.now);
  const summary = await buildTeamDashboardSummary(db as any, organizationId, now, 50);
  if (type === "customer_summary") {
    return {
      organizationId,
      generatedAt: summary.generatedAt,
      kpis: summary.kpis,
      highIntentCustomers: summary.highIntentCustomers
    };
  }
  if (type === "quote_summary") {
    return {
      organizationId,
      generatedAt: summary.generatedAt,
      memberStats: summary.memberStats.map((member) => ({ userId: member.userId, quoteCount: member.quoteCount }))
    };
  }
  return {
    organizationId,
    generatedAt: summary.generatedAt,
    memberStats: summary.memberStats.map((member) => ({ userId: member.userId, completedFollowUps: member.completedFollowUps })),
    kpis: {
      todayFollowUpCustomers: summary.kpis.todayFollowUpCustomers,
      overdueFollowUpCustomers: summary.kpis.overdueFollowUpCustomers
    }
  };
}

function serializeReportJob(job: any) {
  return {
    id: job.id,
    organizationId: job.organizationId,
    type: job.type,
    filters: job.filters || null,
    status: job.status,
    result: job.result || null,
    createdBy: job.createdBy,
    createdAt: job.createdAt instanceof Date ? job.createdAt.toISOString() : String(job.createdAt),
    updatedAt: job.updatedAt instanceof Date ? job.updatedAt.toISOString() : String(job.updatedAt)
  };
}
