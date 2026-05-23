import { Router } from "express";
import { prisma } from "./db.js";
import { writeAuditLog, type AuditAction } from "./audit-log-utils.js";
import { buildTeamDashboardSummary, parseNow } from "./dashboard-api.js";
import { getActiveOrganizationRole, canReadOrganization, canWriteOrganizationResource } from "./organization-permissions.js";
import { resolveBrandContext } from "./brands-api.js";

type EnterpriseDb = typeof prisma;
type EnterpriseRiskLevel = "low" | "medium" | "high";

const unitTypes = new Set(["organization", "subsidiary", "branch"]);
const unitStatuses = new Set(["active", "inactive", "archived"]);
const linkTypes = new Set(["brand", "product", "customer", "supplier", "quote", "order", "after_sales", "knowledge_base", "script"]);
const accessLevels = new Set(["read", "write", "admin"]);

export function createEnterpriseRouter(db: EnterpriseDb = prisma) {
  const router = Router();

  router.get("/organizations", async (req, res, next) => {
    try {
      const organizationId = clean(req.query.organizationId);
      const organizationIds = organizationId ? [organizationId] : await visibleOrganizationIds(db as any, req.user!.id);
      if (!organizationIds.length) return res.json([]);
      for (const id of organizationIds) {
        const role = await requireOrgRead(db as any, id, req.user!.id);
        if (!role) return res.status(403).json({ message: "organization membership required" });
      }
      const status = clean(req.query.status);
      const where: any = { organizationId: { in: organizationIds } };
      if (status) where.status = status;
      const rows = await (db as any).organizationUnit.findMany({ where, orderBy: [{ organizationId: "asc" }, { createdAt: "asc" }] });
      res.json(rows.map(serializeUnit));
    } catch (error) {
      next(error);
    }
  });

  router.post("/organizations", async (req, res, next) => {
    try {
      const organizationId = clean(req.body.organizationId);
      const role = await requireOrgWrite(db as any, organizationId, req.user!.id);
      if (!role) return res.status(403).json({ message: "owner or manager role required" });
      const payload = parseUnitPayload(req.body);
      if (!payload.name) return res.status(400).json({ message: "name is required" });
      if (!unitTypes.has(payload.type)) return res.status(400).json({ message: "invalid organization unit type" });
      if (!unitStatuses.has(payload.status)) return res.status(400).json({ message: "invalid organization unit status" });
      if (payload.parentId) {
        const parent = await (db as any).organizationUnit.findFirst({ where: { id: payload.parentId, organizationId } });
        if (!parent) return res.status(404).json({ message: "parent organization unit not found" });
      }
      const unit = await (db as any).organizationUnit.create({ data: { organizationId, ...payload, createdBy: req.user!.id } });
      await auditEnterprise(db as any, req.user!.id, organizationId, "create", "OrganizationUnit", unit.id, { unit }, "medium");
      res.status(201).json(serializeUnit(unit));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/organizations/:id", async (req, res, next) => {
    try {
      const existing = await (db as any).organizationUnit.findUnique({ where: { id: req.params.id } });
      if (!existing) return res.status(404).json({ message: "organization unit not found" });
      const role = await requireOrgWrite(db as any, existing.organizationId, req.user!.id);
      if (!role) return res.status(403).json({ message: "owner or manager role required" });
      const payload = parseUnitPayload(req.body, existing);
      if (payload.type && !unitTypes.has(payload.type)) return res.status(400).json({ message: "invalid organization unit type" });
      if (payload.status && !unitStatuses.has(payload.status)) return res.status(400).json({ message: "invalid organization unit status" });
      if (payload.status === "archived" && existing.status !== "archived" && !isConfirmed(req)) {
        return res.status(409).json({ error: "CONFIRM_REQUIRED", message: "This action requires confirmation." });
      }
      const updated = await (db as any).organizationUnit.update({ where: { id: existing.id }, data: payload });
      await auditEnterprise(db as any, req.user!.id, existing.organizationId, "update", "OrganizationUnit", updated.id, { before: existing, after: updated }, updated.status === "archived" ? "high" : "medium");
      res.json(serializeUnit(updated));
    } catch (error) {
      next(error);
    }
  });

  router.get("/members", async (req, res, next) => {
    try {
      const organizationId = clean(req.query.organizationId);
      if (!organizationId) return res.status(400).json({ message: "organizationId is required" });
      const role = await requireOrgRead(db as any, organizationId, req.user!.id);
      if (!role) return res.status(403).json({ message: "organization membership required" });
      const rows = await (db as any).organizationMember.findMany({
        where: { organizationId },
        include: { user: { select: { id: true, email: true, name: true } } },
        orderBy: { createdAt: "asc" }
      });
      res.json(rows.map(serializeMember));
    } catch (error) {
      next(error);
    }
  });

  router.post("/members", async (req, res, next) => {
    try {
      const organizationId = clean(req.body.organizationId);
      const role = await requireOrgWrite(db as any, organizationId, req.user!.id);
      if (!role) return res.status(403).json({ message: "owner or manager role required" });
      const userId = clean(req.body.userId);
      const nextRole = clean(req.body.role) || "sales";
      const status = clean(req.body.status) || "active";
      if (!userId) return res.status(400).json({ message: "userId is required" });
      const user = await (db as any).user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ message: "user not found" });
      const member = await (db as any).organizationMember.upsert({
        where: { organizationId_userId: { organizationId, userId } },
        create: { organizationId, userId, role: nextRole, status },
        update: { role: nextRole, status },
        include: { user: { select: { id: true, email: true, name: true } } }
      });
      await auditEnterprise(db as any, req.user!.id, organizationId, "update", "OrganizationMember", member.id, { operation: "enterprise_member_upsert", userId, role: nextRole, status }, "high");
      res.status(201).json(serializeMember(member));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/members/:id", async (req, res, next) => {
    try {
      const existing = await (db as any).organizationMember.findUnique({ where: { id: req.params.id }, include: { user: true } });
      if (!existing) return res.status(404).json({ message: "member not found" });
      const role = await requireOrgWrite(db as any, existing.organizationId, req.user!.id);
      if (!role) return res.status(403).json({ message: "owner or manager role required" });
      if ((req.body.role || req.body.status === "inactive") && !isConfirmed(req)) {
        return res.status(409).json({ error: "CONFIRM_REQUIRED", message: "This action requires confirmation." });
      }
      const updated = await (db as any).organizationMember.update({
        where: { id: existing.id },
        data: {
          ...(req.body.role ? { role: clean(req.body.role) } : {}),
          ...(req.body.status ? { status: clean(req.body.status) } : {})
        },
        include: { user: { select: { id: true, email: true, name: true } } }
      });
      await auditEnterprise(db as any, req.user!.id, existing.organizationId, "update", "OrganizationMember", updated.id, { before: existing, after: updated }, "high");
      res.json(serializeMember(updated));
    } catch (error) {
      next(error);
    }
  });

  router.get("/roles", async (req, res, next) => {
    try {
      const organizationId = clean(req.query.organizationId);
      if (!organizationId) return res.status(400).json({ message: "organizationId is required" });
      const role = await requireOrgRead(db as any, organizationId, req.user!.id);
      if (!role) return res.status(403).json({ message: "organization membership required" });
      const rows = await (db as any).enterpriseRole.findMany({ where: { organizationId }, orderBy: { roleName: "asc" } });
      res.json(rows.map(serializeEnterpriseRole));
    } catch (error) {
      next(error);
    }
  });

  router.post("/roles", async (req, res, next) => {
    try {
      const organizationId = clean(req.body.organizationId);
      const role = await requireOrgWrite(db as any, organizationId, req.user!.id);
      if (!role) return res.status(403).json({ message: "owner or manager role required" });
      const roleName = clean(req.body.roleName);
      if (!roleName) return res.status(400).json({ message: "roleName is required" });
      const permissions = Array.isArray(req.body.permissions) ? req.body.permissions.map(String) : [];
      const row = await (db as any).enterpriseRole.create({
        data: { organizationId, roleName, permissions, description: nullable(req.body.description), createdBy: req.user!.id }
      });
      await auditEnterprise(db as any, req.user!.id, organizationId, "create", "EnterpriseRole", row.id, { roleName, permissions }, "medium");
      res.status(201).json(serializeEnterpriseRole(row));
    } catch (error: any) {
      if (error?.code === "P2002") return res.status(409).json({ message: "enterprise role already exists" });
      next(error);
    }
  });

  router.patch("/roles/:id", async (req, res, next) => {
    try {
      const existing = await (db as any).enterpriseRole.findUnique({ where: { id: req.params.id } });
      if (!existing) return res.status(404).json({ message: "enterprise role not found" });
      const role = await requireOrgWrite(db as any, existing.organizationId, req.user!.id);
      if (!role) return res.status(403).json({ message: "owner or manager role required" });
      const updated = await (db as any).enterpriseRole.update({
        where: { id: existing.id },
        data: {
          ...(req.body.permissions ? { permissions: Array.isArray(req.body.permissions) ? req.body.permissions.map(String) : existing.permissions } : {}),
          ...(req.body.description !== undefined ? { description: nullable(req.body.description) } : {})
        }
      });
      await auditEnterprise(db as any, req.user!.id, existing.organizationId, "update", "EnterpriseRole", updated.id, { before: existing, after: updated }, "high");
      res.json(serializeEnterpriseRole(updated));
    } catch (error) {
      next(error);
    }
  });

  router.get("/reports", async (req, res, next) => {
    try {
      const organizationId = clean(req.query.organizationId);
      const role = await requireOrgWrite(db as any, organizationId, req.user!.id);
      if (!role) return res.status(403).json({ message: "owner or manager role required" });
      const rows = await (db as any).enterpriseReport.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" }, take: 50 });
      res.json(rows.map(serializeEnterpriseReport));
    } catch (error) {
      next(error);
    }
  });

  router.post("/reports", async (req, res, next) => {
    try {
      const organizationId = clean(req.body.organizationId);
      const role = await requireOrgWrite(db as any, organizationId, req.user!.id);
      if (!role) return res.status(403).json({ message: "owner or manager role required" });
      const reportType = clean(req.body.reportType) || "enterprise_summary";
      const filters = typeof req.body.filters === "object" && req.body.filters ? req.body.filters : {};
      const result = await buildEnterpriseReport(db as any, organizationId, reportType, filters);
      const row = await (db as any).enterpriseReport.create({ data: { organizationId, reportType, filters, result, status: "completed", createdBy: req.user!.id } });
      await auditEnterprise(db as any, req.user!.id, organizationId, "create", "EnterpriseReport", row.id, { reportType, filters }, "medium");
      res.status(201).json(serializeEnterpriseReport(row));
    } catch (error) {
      next(error);
    }
  });

  router.get("/audit-logs", async (req, res, next) => {
    try {
      const organizationId = clean(req.query.organizationId);
      const role = organizationId ? await requireOrgRead(db as any, organizationId, req.user!.id) : null;
      if (organizationId && !role) return res.status(403).json({ message: "organization membership required" });
      const riskLevel = clean(req.query.riskLevel);
      const where: any = {};
      if (organizationId) where.organizationId = organizationId;
      if (riskLevel) where.riskLevel = riskLevel;
      const rows = await (db as any).enterpriseAuditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 });
      res.json(rows.map(serializeEnterpriseAuditLog));
    } catch (error) {
      next(error);
    }
  });

  router.get("/v6/overview", async (req, res, next) => {
    try {
      const organizationId = clean(req.query.organizationId);
      const role = await requireOrgRead(db as any, organizationId, req.user!.id);
      if (!role) return res.status(403).json({ message: "organization membership required" });
      const [
        multiChannelCustomers,
        conversationMessages,
        interactionLogs,
        aiKeyUsage,
        activeTeams,
        activeDepartments
      ] = await Promise.all([
        countSafe((db as any).multiChannelCustomer, { organizationId }),
        countSafe((db as any).conversationHistory, { organizationId }),
        countSafe((db as any).interactionLog, { organizationId }),
        (db as any).aIKeyUsageLog?.aggregate
          ? (db as any).aIKeyUsageLog.aggregate({ where: { organizationId }, _sum: { totalTokens: true }, _count: { id: true } })
          : { _sum: { totalTokens: 0 }, _count: { id: 0 } },
        countSafe((db as any).team, { organizationId, status: "active" }),
        countSafe((db as any).department, { organizationId, status: "active" })
      ]);
      res.json({
        organizationId,
        generatedAt: new Date().toISOString(),
        kpis: {
          multiChannelCustomers,
          conversationMessages,
          interactionLogs,
          aiKeyTokens: aiKeyUsage?._sum?.totalTokens || 0,
          aiKeyCalls: aiKeyUsage?._count?.id || 0,
          activeTeams,
          activeDepartments
        },
        safetyBoundaries: enterpriseSafetyBoundaries()
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/multi-channel-customers", async (req, res, next) => {
    try {
      const organizationId = clean(req.query.organizationId);
      const role = await requireOrgRead(db as any, organizationId, req.user!.id);
      if (!role) return res.status(403).json({ message: "organization membership required" });
      const q = clean(req.query.q).toLowerCase();
      const where: any = { organizationId };
      if (q) {
        where.OR = [
          { primaryName: { contains: q, mode: "insensitive" } },
          { whatsappNumber: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { telegramHandle: { contains: q, mode: "insensitive" } },
          { wechatId: { contains: q, mode: "insensitive" } }
        ];
      }
      const rows = await (db as any).multiChannelCustomer.findMany({ where, orderBy: { updatedAt: "desc" }, take: 100 });
      res.json(rows.map(serializeMultiChannelCustomer));
    } catch (error) {
      next(error);
    }
  });

  router.post("/multi-channel-customers", async (req, res, next) => {
    try {
      const organizationId = clean(req.body.organizationId);
      const role = await requireOrgWrite(db as any, organizationId, req.user!.id);
      if (!role) return res.status(403).json({ message: "owner or manager role required" });
      const payload = parseMultiChannelCustomerPayload(req.body);
      if (!payload.primaryName) return res.status(400).json({ message: "primaryName is required" });
      const row = await (db as any).multiChannelCustomer.create({ data: { organizationId, ...payload, createdBy: req.user!.id } });
      await auditEnterprise(db as any, req.user!.id, organizationId, "create", "MultiChannelCustomer", row.id, { customer: serializeMultiChannelCustomer(row) }, "low");
      res.status(201).json(serializeMultiChannelCustomer(row));
    } catch (error) {
      next(error);
    }
  });

  router.get("/conversation-history", async (req, res, next) => {
    try {
      const organizationId = clean(req.query.organizationId);
      const role = await requireOrgRead(db as any, organizationId, req.user!.id);
      if (!role) return res.status(403).json({ message: "organization membership required" });
      const where: any = { organizationId };
      const multiChannelCustomerId = clean(req.query.multiChannelCustomerId);
      const customerId = clean(req.query.customerId);
      const channel = clean(req.query.channel);
      if (multiChannelCustomerId) where.multiChannelCustomerId = multiChannelCustomerId;
      if (customerId) where.customerId = customerId;
      if (channel) where.channel = channel;
      const rows = await (db as any).conversationHistory.findMany({ where, orderBy: { messageAt: "desc" }, take: 100 });
      res.json(rows.map(serializeConversationHistory));
    } catch (error) {
      next(error);
    }
  });

  router.post("/conversation-history", async (req, res, next) => {
    try {
      const organizationId = clean(req.body.organizationId);
      const role = await requireOrgRead(db as any, organizationId, req.user!.id);
      if (!role) return res.status(403).json({ message: "organization membership required" });
      const payload = parseConversationPayload(req.body);
      if (!payload.channel || !payload.direction || !payload.senderRole) return res.status(400).json({ message: "channel, direction and senderRole are required" });
      const row = await (db as any).conversationHistory.create({ data: { organizationId, ...payload, createdBy: req.user!.id } });
      await auditEnterprise(db as any, req.user!.id, organizationId, "create", "ConversationHistory", row.id, { channel: row.channel, direction: row.direction }, "low");
      res.status(201).json(serializeConversationHistory(row));
    } catch (error) {
      next(error);
    }
  });

  router.get("/interaction-logs", async (req, res, next) => {
    try {
      const organizationId = clean(req.query.organizationId);
      const role = await requireOrgRead(db as any, organizationId, req.user!.id);
      if (!role) return res.status(403).json({ message: "organization membership required" });
      const where: any = { organizationId };
      const action = clean(req.query.action);
      if (action) where.action = action;
      const rows = await (db as any).interactionLog.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 });
      res.json(rows.map(serializeInteractionLog));
    } catch (error) {
      next(error);
    }
  });

  router.post("/interaction-logs", async (req, res, next) => {
    try {
      const organizationId = clean(req.body.organizationId);
      const role = await requireOrgRead(db as any, organizationId, req.user!.id);
      if (!role) return res.status(403).json({ message: "organization membership required" });
      const action = clean(req.body.action);
      if (!action) return res.status(400).json({ message: "action is required" });
      const row = await (db as any).interactionLog.create({
        data: {
          organizationId,
          multiChannelCustomerId: nullable(req.body.multiChannelCustomerId),
          customerId: nullable(req.body.customerId),
          channel: nullable(req.body.channel),
          action,
          entityType: nullable(req.body.entityType),
          entityId: nullable(req.body.entityId),
          summary: nullable(req.body.summary),
          metadata: typeof req.body.metadata === "object" && req.body.metadata ? req.body.metadata : null,
          createdBy: req.user!.id
        }
      });
      await auditEnterprise(db as any, req.user!.id, organizationId, "create", "InteractionLog", row.id, { action, entityType: row.entityType }, "low");
      res.status(201).json(serializeInteractionLog(row));
    } catch (error) {
      next(error);
    }
  });

  router.get("/ai-key-usage", async (req, res, next) => {
    try {
      const organizationId = clean(req.query.organizationId);
      const role = await requireOrgWrite(db as any, organizationId, req.user!.id);
      if (!role) return res.status(403).json({ message: "owner or manager role required" });
      const where: any = { organizationId };
      const aiProviderKeyId = clean(req.query.aiProviderKeyId);
      const mode = clean(req.query.mode);
      if (aiProviderKeyId) where.aiProviderKeyId = aiProviderKeyId;
      if (mode) where.mode = mode;
      const rows = await (db as any).aIKeyUsageLog.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });
      res.json(rows.map(serializeAIKeyUsageLog));
    } catch (error) {
      next(error);
    }
  });

  router.post("/brand-context", async (req, res, next) => {
    try {
      const organizationId = clean(req.body.organizationId);
      const role = await requireOrgRead(db as any, organizationId, req.user!.id);
      if (!role) return res.status(403).json({ message: "organization membership required" });
      const context = await resolveBrandContext(db as any, req.user!.id, {
        brandId: clean(req.body.brandId),
        customerId: clean(req.body.customerId),
        productId: clean(req.body.productId),
        scenario: clean(req.body.scenario)
      });
      const enterpriseContext = {
        organizationId,
        enterpriseContext: req.body.enterpriseContext || null,
        brandUsed: context.brandUsed,
        brandRulesUsed: context.brandRulesUsed,
        knowledgeUsed: context.knowledgeUsed,
        riskWarnings: [
          ...(context.riskWarnings || []),
          "Enterprise AI context is advisory only. Confirm price, inventory, lead time, payment, logistics and after-sales policy before sending."
        ]
      };
      await auditEnterprise(db as any, req.user!.id, organizationId, "create", "EnterpriseBrandContext", context.brand?.id || organizationId, enterpriseContext, "medium");
      res.json(enterpriseContext);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export const enterpriseRouter = createEnterpriseRouter();

async function visibleOrganizationIds(db: any, userId: string) {
  const rows = await db.organizationMember.findMany({ where: { userId, status: "active" } });
  return rows.map((row: any) => row.organizationId);
}

async function requireOrgRead(db: any, organizationId: string, userId: string) {
  if (!organizationId) return null;
  const role = await getActiveOrganizationRole(db, organizationId, userId);
  return canReadOrganization(role) ? role : null;
}

async function requireOrgWrite(db: any, organizationId: string, userId: string) {
  const role = await requireOrgRead(db, organizationId, userId);
  return canWriteOrganizationResource(role) ? role : null;
}

function parseUnitPayload(body: any, existing: any = {}) {
  return {
    parentId: body.parentId === undefined ? existing.parentId || null : nullable(body.parentId),
    name: clean(body.name) || existing.name || "",
    type: clean(body.type) || existing.type || "organization",
    status: clean(body.status) || existing.status || "active"
  };
}

async function buildEnterpriseReport(db: any, organizationId: string, reportType: string, filters: Record<string, unknown>) {
  const now = parseNow(filters.now);
  const summary = await buildTeamDashboardSummary(db, organizationId, now, 25);
  const [orders, brands, suppliers, afterSales, enterpriseRoles] = await Promise.all([
    db.order?.findMany ? db.order.findMany({ where: { organizationId }, take: 500 }) : [],
    db.brand?.findMany ? db.brand.findMany({ where: { organizationId }, take: 500 }) : [],
    db.supplier?.findMany ? db.supplier.findMany({ where: { organizationId }, take: 500 }) : [],
    db.afterSalesCase?.findMany ? db.afterSalesCase.findMany({ where: { organizationId }, take: 500 }) : [],
    db.enterpriseRole?.findMany ? db.enterpriseRole.findMany({ where: { organizationId } }) : []
  ]);
  return {
    reportType,
    organizationId,
    generatedAt: now.toISOString(),
    kpis: {
      ...summary.kpis,
      orderCount: orders.length,
      pendingPaymentOrders: orders.filter((order: any) => order.paymentStatus === "unpaid" || order.orderStatus === "pending_payment").length,
      activeBrands: brands.filter((brand: any) => brand.status === "active").length,
      supplierCount: suppliers.length,
      openAfterSalesCases: afterSales.filter((item: any) => ["open", "processing", "waiting_customer", "waiting_internal"].includes(item.status)).length,
      enterpriseRoleCount: enterpriseRoles.length
    },
    memberStats: summary.memberStats,
    highIntentCustomers: summary.highIntentCustomers,
    filters
  };
}

async function countSafe(model: any, where: Record<string, unknown>) {
  if (!model?.count) return 0;
  return model.count({ where }).catch(() => 0);
}

function enterpriseSafetyBoundaries() {
  return [
    "AI content is draft-only and must be confirmed manually before sending.",
    "The platform does not auto-send WhatsApp messages or simulate the send button.",
    "Enterprise analytics never exports secrets, environment files, session secrets or API keys.",
    "Cross-organization data access requires explicit organization membership and role checks."
  ];
}

function parseMultiChannelCustomerPayload(body: any) {
  return {
    customerId: nullable(body.customerId),
    primaryName: clean(body.primaryName || body.name),
    primaryChannel: clean(body.primaryChannel) || "whatsapp",
    whatsappNumber: nullable(body.whatsappNumber),
    telegramHandle: nullable(body.telegramHandle),
    wechatId: nullable(body.wechatId),
    email: nullable(body.email),
    phoneCountry: nullable(body.phoneCountry),
    phoneCountryCode: nullable(body.phoneCountryCode),
    preferredLanguage: nullable(body.preferredLanguage),
    preferredCurrency: nullable(body.preferredCurrency),
    brandId: nullable(body.brandId),
    ownerId: nullable(body.ownerId),
    assignedTo: nullable(body.assignedTo),
    tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
    metadata: typeof body.metadata === "object" && body.metadata ? body.metadata : null
  };
}

function parseConversationPayload(body: any) {
  return {
    multiChannelCustomerId: nullable(body.multiChannelCustomerId),
    customerId: nullable(body.customerId),
    channel: clean(body.channel) || "whatsapp",
    externalConversationId: nullable(body.externalConversationId),
    direction: clean(body.direction) || "unknown",
    senderRole: clean(body.senderRole) || "unknown",
    messageText: nullable(body.messageText),
    language: nullable(body.language),
    translatedText: nullable(body.translatedText),
    messageAt: body.messageAt ? new Date(String(body.messageAt)) : new Date(),
    metadata: typeof body.metadata === "object" && body.metadata ? body.metadata : null
  };
}

async function auditEnterprise(db: any, userId: string, organizationId: string | null, action: AuditAction, entityType: string, entityId: string | null, metadata: Record<string, unknown>, riskLevel: EnterpriseRiskLevel = "low") {
  const log = await db.enterpriseAuditLog.create({ data: { organizationId, userId, action, entityType, entityId, metadata: metadata as any, riskLevel } });
  if (db.auditLog?.create) {
    await writeAuditLog(db, { organizationId, userId, action, entityType, entityId, metadata, riskLevel });
  }
  return log;
}

function serializeUnit(row: any) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    parentId: row.parentId || null,
    name: row.name,
    type: row.type,
    status: row.status,
    createdBy: row.createdBy,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt)
  };
}

function serializeMember(row: any) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    userId: row.userId,
    userName: row.user?.name || null,
    userEmail: row.user?.email || null,
    role: row.role,
    status: row.status,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt)
  };
}

function serializeEnterpriseRole(row: any) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    roleName: row.roleName,
    permissions: Array.isArray(row.permissions) ? row.permissions : [],
    description: row.description || null,
    createdBy: row.createdBy,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt)
  };
}

function serializeEnterpriseReport(row: any) {
  return {
    id: row.id,
    organizationId: row.organizationId || null,
    reportType: row.reportType,
    filters: row.filters || null,
    result: row.result || null,
    status: row.status,
    createdBy: row.createdBy,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt)
  };
}

function serializeEnterpriseAuditLog(row: any) {
  return {
    id: row.id,
    organizationId: row.organizationId || null,
    organizationUnitId: row.organizationUnitId || null,
    userId: row.userId,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId || null,
    metadata: row.metadata || null,
    riskLevel: row.riskLevel,
    createdAt: toIso(row.createdAt)
  };
}

function serializeMultiChannelCustomer(row: any) {
  return {
    id: row.id,
    organizationId: row.organizationId || null,
    customerId: row.customerId || null,
    primaryName: row.primaryName,
    primaryChannel: row.primaryChannel,
    whatsappNumber: row.whatsappNumber || null,
    telegramHandle: row.telegramHandle || null,
    wechatId: row.wechatId || null,
    email: row.email || null,
    phoneCountry: row.phoneCountry || null,
    phoneCountryCode: row.phoneCountryCode || null,
    preferredLanguage: row.preferredLanguage || null,
    preferredCurrency: row.preferredCurrency || null,
    brandId: row.brandId || null,
    ownerId: row.ownerId || null,
    assignedTo: row.assignedTo || null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    metadata: row.metadata || null,
    createdBy: row.createdBy,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt)
  };
}

function serializeConversationHistory(row: any) {
  return {
    id: row.id,
    organizationId: row.organizationId || null,
    multiChannelCustomerId: row.multiChannelCustomerId || null,
    customerId: row.customerId || null,
    channel: row.channel,
    externalConversationId: row.externalConversationId || null,
    direction: row.direction,
    senderRole: row.senderRole,
    messageText: row.messageText || null,
    language: row.language || null,
    translatedText: row.translatedText || null,
    messageAt: toIso(row.messageAt),
    metadata: row.metadata || null,
    createdBy: row.createdBy || null,
    createdAt: toIso(row.createdAt)
  };
}

function serializeInteractionLog(row: any) {
  return {
    id: row.id,
    organizationId: row.organizationId || null,
    multiChannelCustomerId: row.multiChannelCustomerId || null,
    customerId: row.customerId || null,
    channel: row.channel || null,
    action: row.action,
    entityType: row.entityType || null,
    entityId: row.entityId || null,
    summary: row.summary || null,
    metadata: row.metadata || null,
    createdBy: row.createdBy,
    createdAt: toIso(row.createdAt)
  };
}

function serializeAIKeyUsageLog(row: any) {
  return {
    id: row.id,
    organizationId: row.organizationId || null,
    aiProviderKeyId: row.aiProviderKeyId || null,
    provider: row.provider || null,
    mode: row.mode || null,
    model: row.model || null,
    requestSource: row.requestSource || null,
    promptTokens: row.promptTokens || 0,
    completionTokens: row.completionTokens || 0,
    totalTokens: row.totalTokens || 0,
    success: row.success !== false,
    errorMessage: row.errorMessage || null,
    createdAt: toIso(row.createdAt)
  };
}

function isConfirmed(req: any) {
  return req.body?.confirm === true || req.query.confirm === "true";
}

function nullable(value: unknown) {
  const text = clean(value);
  return text || null;
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toIso(value: unknown) {
  return value instanceof Date ? value.toISOString() : String(value);
}
