import { Router } from "express";
import { prisma } from "./db.js";
import { canWriteOrganizationResource, getActiveOrganizationRole, organizationIdFromRequest } from "./organization-permissions.js";
import { serializeAuditLog } from "./audit-log-utils.js";

type SecurityDb = Pick<typeof prisma, "auditLog" | "organizationMember">;

export function createSecurityRouter(db: SecurityDb = prisma) {
  const router = Router();

  router.get("/risk-events", async (req, res, next) => {
    try {
      const organizationId = organizationIdFromRequest(req);
      if (!organizationId) return res.status(400).json({ message: "organizationId is required" });
      const role = await getActiveOrganizationRole(db, organizationId, req.user!.id);
      if (!canWriteOrganizationResource(role)) return res.status(403).json({ message: "owner or manager role required" });
      const logs = await db.auditLog.findMany({
        where: { organizationId, riskLevel: { in: ["medium", "high"] } },
        orderBy: { createdAt: "desc" },
        take: clamp(req.query.limit, 1, 100, 50)
      } as any);
      res.json(logs.map(serializeAuditLog));
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export const securityRouter = createSecurityRouter();

function clamp(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(number)));
}
