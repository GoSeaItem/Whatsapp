import { Router } from "express";
import { prisma } from "./db.js";
import { auditLogsToCsv, serializeAuditLog } from "./audit-log-utils.js";
import { canReadOrganization, canWriteOrganizationResource, getActiveOrganizationRole, organizationIdFromRequest } from "./organization-permissions.js";
import { assertCanViewAuditLog, redactAuditMetadata, recordSecurityAudit } from "./permissions.js";

type AuditLogsDb = Pick<typeof prisma, "auditLog" | "organizationMember">;

export function createAuditLogsRouter(db: AuditLogsDb = prisma) {
  const router = Router();

  router.get("/export", async (req, res, next) => {
    try {
      const organizationId = organizationIdFromRequest(req);
      if (!organizationId) return res.status(400).json({ message: "organizationId is required" });
      const role = await assertCanViewAuditLog(db, req.user!.id, organizationId, "export");
      const where = buildAuditWhere(req.query, organizationId);
      const logs = await db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: 1000 });
      await recordSecurityAudit(db, req, {
        organizationId,
        action: "export",
        entityType: "AuditLog",
        riskLevel: "medium",
        metadata: { fieldsScope: role === "owner" ? "full" : "redacted", affectedCount: logs.length }
      });
      const output = role === "owner" ? logs : logs.map(redactLog);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="audit-logs-${new Date().toISOString().slice(0, 10)}.csv"`);
      res.send(auditLogsToCsv(output));
    } catch (error) {
      next(error);
    }
  });

  router.get("/", async (req, res, next) => {
    try {
      const organizationId = organizationIdFromRequest(req);
      if (!organizationId) {
        res.status(400).json({ message: "organizationId is required" });
        return;
      }
      const role = await getActiveOrganizationRole(db, organizationId, req.user!.id);
      if (!canReadOrganization(role)) {
        res.status(403).json({ message: "organization membership required" });
        return;
      }

      const where = buildAuditWhere(req.query, organizationId);
      if (!canWriteOrganizationResource(role)) {
        where.OR = [{ userId: req.user!.id }, { actorId: req.user!.id }];
      }

      const pageSize = clampNumber(req.query.pageSize, 1, 100, 50);
      const page = clampNumber(req.query.page, 1, 10000, 1);
      const logs = await db.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      });

      if (req.query.format === "csv") {
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="audit-logs-${new Date().toISOString().slice(0, 10)}.csv"`);
        res.send(auditLogsToCsv(logs));
        return;
      }

      const responseLogs = role === "manager" ? logs.map(redactLog) : logs;
      res.json({ items: responseLogs.map(serializeAuditLog), page, pageSize });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const log = await db.auditLog.findUnique({ where: { id: req.params.id } });
      const auditLog = log as any;
      if (!auditLog || !auditLog.organizationId) {
        res.status(404).json({ message: "audit log not found" });
        return;
      }
      const role = await getActiveOrganizationRole(db, auditLog.organizationId, req.user!.id);
      if (!canReadOrganization(role)) {
        res.status(403).json({ message: "organization membership required" });
        return;
      }
      const logUserId = auditLog.userId || auditLog.actorId;
      if (!canWriteOrganizationResource(role) && logUserId !== req.user!.id) {
        res.status(403).json({ message: "audit log is only visible to actor" });
        return;
      }
      res.json(serializeAuditLog(role === "manager" ? redactLog(auditLog) : auditLog));
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export const auditLogsRouter = createAuditLogsRouter();

function buildAuditWhere(query: Record<string, unknown>, organizationId: string) {
  const where: Record<string, unknown> = { organizationId };
  const entityType = clean(query.entityType);
  const userId = clean(query.userId);
  const action = clean(query.action);
  const riskLevel = clean(query.riskLevel);
  const entityId = clean(query.entityId);
  const keyword = clean(query.keyword);
  const from = parseDate(query.from || query.dateFrom);
  const to = parseDate(query.to || query.dateTo);
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;
  if (userId) where.OR = [{ userId }, { actorId: userId }];
  if (action) where.action = action;
  if (riskLevel) where.riskLevel = riskLevel;
  if (keyword) {
    where.OR = [
      ...(Array.isArray(where.OR) ? where.OR as any[] : []),
      { entityType: { contains: keyword, mode: "insensitive" } },
      { action: { contains: keyword, mode: "insensitive" } },
      { entityId: { contains: keyword, mode: "insensitive" } }
    ];
  }
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {})
    };
  }
  return where;
}

function redactLog(log: any) {
  return {
    ...log,
    before: redactAuditMetadata(log.before),
    after: redactAuditMetadata(log.after),
    metadata: redactAuditMetadata(log.metadata),
    ipAddress: log.ipAddress ? "[redacted]" : null,
    userAgent: log.userAgent ? "[redacted]" : null
  };
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseDate(value: unknown) {
  const text = clean(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(number)));
}
