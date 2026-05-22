import { Router } from "express";
import { prisma } from "./db.js";
import { writeAuditLog } from "./audit-log-utils.js";
import { resolveBrandContext } from "./brands-api.js";
import { buildKnowledgeContext, findKnowledgeForAi } from "./knowledge-base-service.js";
import { canReadOrganization, canWriteOrganizationResource, getActiveOrganizationRole, organizationIdFromRequest } from "./organization-permissions.js";
import { hasPermission, recordSecurityAudit, requireConfirm, type PermissionKey } from "./permissions.js";
import {
  buildReorderOperationScript,
  calculateReorderOpportunities,
  REORDER_CAMPAIGN_SCOPES,
  REORDER_CAMPAIGN_STATUSES,
  REORDER_OPERATION_TYPES,
  REORDER_OPPORTUNITY_STATUSES,
  REORDER_SCRIPT_SCENARIOS,
  serializeReasons
} from "./reorder-operations-utils.js";

type ReorderOperationsDb = typeof prisma;

export function createReorderOperationsRouter(db: ReorderOperationsDb = prisma) {
  const router = Router();

  router.get("/opportunities", async (req, res, next) => {
    try {
      const { organizationId, role } = await organizationContext(db, req);
      const page = Math.max(Number(req.query.page) || 1, 1);
      const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 50, 1), 100);
      const where: any = {
        ...opportunityScope(req.user!.id, organizationId, role),
        ...(clean(req.query.opportunityType) ? { opportunityType: clean(req.query.opportunityType) } : {}),
        ...(clean(req.query.level) ? { level: clean(req.query.level) } : {}),
        ...(clean(req.query.status) ? { status: clean(req.query.status) } : {}),
        ...(clean(req.query.ownerId) ? { ownerId: clean(req.query.ownerId) } : {}),
        ...(clean(req.query.productId) ? { productId: clean(req.query.productId) } : {}),
        ...(clean(req.query.campaignId) ? { campaignId: clean(req.query.campaignId) } : {}),
        ...(clean(req.query.customerId) ? { customerId: clean(req.query.customerId) } : {})
      };
      if (clean(req.query.assignedTo)) where.customer = { assignedTo: clean(req.query.assignedTo) };
      const rows = await (db as any).reorderOpportunity.findMany({
        where,
        include: { customer: true, product: true },
        orderBy: [{ score: "desc" }, { updatedAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize
      });
      res.json(rows.map(serializeOpportunity));
    } catch (error) {
      next(error);
    }
  });

  router.post("/opportunities/recalculate", async (req, res, next) => {
    try {
      const organizationId = clean(req.body?.organizationId) || organizationIdFromRequest(req) || null;
      const customerId = clean(req.body?.customerId);
      const opportunityTypes = normalizeOpportunityTypes(req.body?.opportunityTypes);
      const role = organizationId ? await getActiveOrganizationRole(db as any, organizationId, req.user!.id) : null;
      if (organizationId && !canReadOrganization(role)) {
        await recordSecurityAudit(db as any, req, { organizationId, action: "permission_denied", entityType: "ReorderOpportunity", riskLevel: "high", failureReason: "organization access denied" });
        return res.status(403).json({ message: "organization membership required" });
      }
      const isTeamRecalc = Boolean(organizationId && !customerId);
      if (isTeamRecalc && (!role || !hasPermission(role, "reorder.recalculateTeam"))) {
        await recordSecurityAudit(db as any, req, { organizationId, permissionKey: "reorder.recalculateTeam", action: "permission_denied", entityType: "ReorderOpportunity", riskLevel: "high", failureReason: "team recalculation denied" });
        return res.status(403).json({ message: "owner or manager role required for team recalculation" });
      }
      if (!isTeamRecalc && role && !hasPermission(role, "reorder.recalculateOwn")) {
        return res.status(403).json({ message: "reorder recalculation permission required" });
      }

      const customers = customerId
        ? [await findAccessibleCustomer(db, req.user!.id, customerId, organizationId, role)]
        : await (db as any).customer.findMany({ where: customerScope(req.user!.id, organizationId, role), take: 500 });
      const validCustomers = customers.filter(Boolean);
      const products = await loadAccessibleProducts(db, req.user!.id, organizationId);
      const result = { createdCount: 0, updatedCount: 0, skippedCount: 0, errors: [] as Array<{ customerId?: string; message: string }> };

      for (const customer of validCustomers) {
        try {
          const related = await loadReorderRelatedData(db, customer.id, products);
          const opportunities = calculateReorderOpportunities(customer, related, opportunityTypes);
          if (!opportunities.length) result.skippedCount += 1;
          for (const opportunity of opportunities) {
            const existing = await (db as any).reorderOpportunity.findFirst({
              where: {
                customerId: customer.id,
                opportunityType: opportunity.opportunityType,
                productId: opportunity.productId || null,
                orderId: opportunity.orderId || null,
                createdBy: req.user!.id
              }
            });
            const data = {
              organizationId: customer.organizationId || null,
              customerId: customer.id,
              productId: opportunity.productId || null,
              orderId: opportunity.orderId || null,
              opportunityType: opportunity.opportunityType,
              score: opportunity.score,
              level: opportunity.level,
              reasons: opportunity.reasons,
              recommendedAction: opportunity.recommendedAction,
              suggestedScript: opportunity.suggestedScript,
              status: existing?.status || "open",
              ownerId: customer.assignedTo || customer.ownerId || req.user!.id,
              createdBy: req.user!.id
            };
            if (existing) {
              await (db as any).reorderOpportunity.update({ where: { id: existing.id }, data });
              result.updatedCount += 1;
            } else {
              await (db as any).reorderOpportunity.create({ data });
              result.createdCount += 1;
            }
          }
        } catch (error) {
          result.errors.push({ customerId: customer.id, message: error instanceof Error ? error.message : "reorder opportunity calculation failed" });
        }
      }

      await writeAuditLog(db as any, {
        organizationId,
        userId: req.user!.id,
        action: "update",
        entityType: "ReorderOpportunity",
        entityId: customerId || organizationId || req.user!.id,
        before: null,
        after: result,
        metadata: { operation: "reorder_opportunity_recalculate", opportunityTypes, bulk: !customerId },
        riskLevel: isTeamRecalc ? "medium" : "low"
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.patch("/opportunities/:id", async (req, res, next) => {
    try {
      const status = clean(req.body?.status);
      if (!REORDER_OPPORTUNITY_STATUSES.has(status)) return res.status(400).json({ message: "invalid status" });
      const existing = await findAccessibleOpportunity(db, req.user!.id, req.params.id);
      const updated = await (db as any).reorderOpportunity.update({
        where: { id: existing.id },
        data: { status },
        include: { customer: true, product: true }
      });
      await writeAuditLog(db as any, {
        organizationId: existing.organizationId || null,
        userId: req.user!.id,
        action: "update",
        entityType: "ReorderOpportunity",
        entityId: existing.id,
        before: existing,
        after: updated,
        metadata: { operation: "status_update" },
        riskLevel: ["converted", "archived"].includes(status) ? "medium" : "low"
      });
      res.json(serializeOpportunity(updated));
    } catch (error) {
      next(error);
    }
  });

  router.post("/opportunities/:id/create-follow-up-task", async (req, res, next) => {
    try {
      const confirmError = requireConfirm(req, "reorder.createTask");
      if (confirmError) return res.status(400).json(confirmError);
      const existing = await findAccessibleOpportunity(db, req.user!.id, req.params.id);
      const role = existing.organizationId ? await getActiveOrganizationRole(db as any, existing.organizationId, req.user!.id) : null;
      if (role && !hasPermission(role, "reorder.createTask")) return res.status(403).json({ message: "create task permission required" });
      const remindAt = parseDate(req.body?.remindAt) || new Date(Date.now() + 24 * 60 * 60 * 1000);
      const recommendedScript = clean(req.body?.recommendedScript) || existing.suggestedScript || existing.recommendedAction || "Manual reorder follow-up. Confirm price, stock, lead time, shipping and payment details before sending.";
      const followUpTask = await (db as any).followUpTask.create({
        data: {
          customerId: existing.customerId,
          taskType: taskTypeForOpportunity(existing.opportunityType),
          remindAt,
          recommendedScript,
          status: "pending",
          ownerId: existing.ownerId
        }
      });
      const updated = await (db as any).reorderOpportunity.update({
        where: { id: existing.id },
        data: { status: "task_created" },
        include: { customer: true, product: true }
      });
      await writeAuditLog(db as any, {
        organizationId: existing.organizationId || null,
        userId: req.user!.id,
        action: "create",
        entityType: "FollowUpTask",
        entityId: followUpTask.id,
        before: existing,
        after: { opportunity: updated, followUpTask },
        metadata: { operation: "reorder_opportunity_to_follow_up", opportunityId: existing.id, confirmed: true },
        riskLevel: "medium"
      });
      res.json({ followUpTask, opportunity: serializeOpportunity(updated) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/campaigns", async (req, res, next) => {
    try {
      const { organizationId, role } = await organizationContext(db, req);
      const where: any = organizationId && canReadOrganization(role)
        ? { OR: [{ organizationId }, { createdBy: req.user!.id, organizationId: null }] }
        : { createdBy: req.user!.id, organizationId: null };
      if (clean(req.query.campaignType)) where.campaignType = clean(req.query.campaignType);
      if (clean(req.query.status)) where.status = clean(req.query.status);
      const rows = await (db as any).reorderCampaign.findMany({ where, orderBy: [{ updatedAt: "desc" }], take: 200 });
      res.json(rows.map(serializeCampaign));
    } catch (error) {
      next(error);
    }
  });

  router.post("/campaigns", async (req, res, next) => {
    try {
      const data = validateCampaignInput(req.body);
      const organizationId = clean(req.body?.organizationId) || null;
      const role = organizationId ? await getActiveOrganizationRole(db as any, organizationId, req.user!.id) : null;
      const permission: PermissionKey = organizationId ? "reorder.createCampaignTeam" : "reorder.createCampaignOwn";
      if (organizationId && !canReadOrganization(role)) return res.status(403).json({ message: "organization membership required" });
      if (role && !hasPermission(role, permission)) return res.status(403).json({ message: "campaign permission required" });
      if (!organizationId && role === "support") return res.status(403).json({ message: "support cannot create campaigns" });
      const created = await (db as any).reorderCampaign.create({
        data: { ...data, organizationId, createdBy: req.user!.id }
      });
      await writeAuditLog(db as any, {
        organizationId,
        userId: req.user!.id,
        action: "create",
        entityType: "ReorderCampaign",
        entityId: created.id,
        before: null,
        after: created,
        metadata: { operation: "reorder_campaign_create" },
        riskLevel: "low"
      });
      res.status(201).json(serializeCampaign(created));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/campaigns/:id", async (req, res, next) => {
    try {
      const existing = await findAccessibleCampaign(db, req.user!.id, req.params.id, true);
      const data = validateCampaignInput({ ...existing, ...req.body }, true);
      const updated = await (db as any).reorderCampaign.update({ where: { id: existing.id }, data });
      await writeAuditLog(db as any, {
        organizationId: existing.organizationId || null,
        userId: req.user!.id,
        action: "update",
        entityType: "ReorderCampaign",
        entityId: existing.id,
        before: existing,
        after: updated,
        metadata: { operation: "reorder_campaign_update" },
        riskLevel: ["paused", "completed", "archived"].includes(String(data.status || "")) ? "medium" : "low"
      });
      res.json(serializeCampaign(updated));
    } catch (error) {
      next(error);
    }
  });

  router.delete("/campaigns/:id", async (req, res, next) => {
    try {
      const confirmError = requireConfirm(req, "reorder.deleteCampaign");
      if (confirmError) return res.status(400).json(confirmError);
      const existing = await findAccessibleCampaign(db, req.user!.id, req.params.id, true);
      await (db as any).reorderCampaign.delete({ where: { id: existing.id } });
      await writeAuditLog(db as any, {
        organizationId: existing.organizationId || null,
        userId: req.user!.id,
        action: "delete",
        entityType: "ReorderCampaign",
        entityId: existing.id,
        before: existing,
        after: null,
        metadata: { operation: "reorder_campaign_delete", confirmed: true },
        riskLevel: "high"
      });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.get("/playbooks", async (req, res, next) => {
    try {
      const { organizationId, role } = await organizationContext(db, req);
      const where: any = organizationId && canReadOrganization(role)
        ? { OR: [{ organizationId }, { createdBy: req.user!.id, organizationId: null }] }
        : { createdBy: req.user!.id, organizationId: null };
      if (clean(req.query.scenario)) where.scenario = clean(req.query.scenario);
      if (clean(req.query.language)) where.language = clean(req.query.language);
      const rows = await (db as any).reorderPlaybook.findMany({ where, orderBy: [{ updatedAt: "desc" }], take: 200 });
      res.json(rows.map(serializePlaybook));
    } catch (error) {
      next(error);
    }
  });

  router.post("/playbooks", async (req, res, next) => {
    try {
      const data = validatePlaybookInput(req.body);
      const organizationId = clean(req.body?.organizationId) || null;
      const role = organizationId ? await getActiveOrganizationRole(db as any, organizationId, req.user!.id) : null;
      const permission: PermissionKey = organizationId ? "reorder.managePlaybookOrg" : "reorder.managePlaybookOwn";
      if (organizationId && !canReadOrganization(role)) return res.status(403).json({ message: "organization membership required" });
      if (role && !hasPermission(role, permission)) return res.status(403).json({ message: "playbook permission required" });
      const created = await (db as any).reorderPlaybook.create({ data: { ...data, organizationId, createdBy: req.user!.id } });
      await writeAuditLog(db as any, {
        organizationId,
        userId: req.user!.id,
        action: "create",
        entityType: "ReorderPlaybook",
        entityId: created.id,
        before: null,
        after: created,
        metadata: { operation: "reorder_playbook_create" },
        riskLevel: "low"
      });
      res.status(201).json(serializePlaybook(created));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/playbooks/:id", async (req, res, next) => {
    try {
      const existing = await findAccessiblePlaybook(db, req.user!.id, req.params.id, true);
      const data = validatePlaybookInput({ ...existing, ...req.body }, true);
      const updated = await (db as any).reorderPlaybook.update({ where: { id: existing.id }, data });
      await writeAuditLog(db as any, {
        organizationId: existing.organizationId || null,
        userId: req.user!.id,
        action: "update",
        entityType: "ReorderPlaybook",
        entityId: existing.id,
        before: existing,
        after: updated,
        metadata: { operation: "reorder_playbook_update" },
        riskLevel: "low"
      });
      res.json(serializePlaybook(updated));
    } catch (error) {
      next(error);
    }
  });

  router.delete("/playbooks/:id", async (req, res, next) => {
    try {
      const confirmError = requireConfirm(req, "reorder.deleteCampaign");
      if (confirmError) return res.status(400).json(confirmError);
      const existing = await findAccessiblePlaybook(db, req.user!.id, req.params.id, true);
      await (db as any).reorderPlaybook.delete({ where: { id: existing.id } });
      await writeAuditLog(db as any, {
        organizationId: existing.organizationId || null,
        userId: req.user!.id,
        action: "delete",
        entityType: "ReorderPlaybook",
        entityId: existing.id,
        before: existing,
        after: null,
        metadata: { operation: "reorder_playbook_delete", confirmed: true },
        riskLevel: "high"
      });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export function createReorderOperationsAiRouter(db: ReorderOperationsDb = prisma) {
  const router = Router();

  router.post("/reorder-operation-script", async (req, res, next) => {
    try {
      const scenario = clean(req.body?.scenario);
      if (!REORDER_SCRIPT_SCENARIOS.has(scenario)) return res.status(400).json({ message: "invalid scenario" });
      const customer = await findAccessibleCustomer(db, req.user!.id, clean(req.body?.customerId), clean(req.body?.organizationId) || null, null);
      const product = clean(req.body?.productId) ? await findAccessibleProduct(db, req.user!.id, clean(req.body?.productId), customer.organizationId || null) : null;
      const opportunity = clean(req.body?.opportunityId) ? await findAccessibleOpportunity(db, req.user!.id, clean(req.body?.opportunityId)) : null;
      const knowledge = await findKnowledgeForAi(db as any, {
        ownerId: req.user!.id,
        organizationId: customer.organizationId || null,
        targetLanguage: clean(req.body?.targetLanguage) || customer.language || null,
        productId: product?.id || null,
        mode: "reply",
        keyword: [scenario, product?.name, customer.interestedProduct].filter(Boolean).join(" ")
      });
      const brandContext = clean(req.body.brandId)
        ? await resolveBrandContext(db as any, req.user!.id, {
            brandId: clean(req.body.brandId),
            customerId: customer.id,
            productId: product?.id || null,
            scenario
          })
        : null;
      const { knowledgeUsed } = buildKnowledgeContext([...(brandContext?.knowledgeContext || []), ...knowledge.items] as any);
      const hasCompletedOrder = await (db as any).order.count({
        where: {
          customerId: customer.id,
          orderStatus: "completed",
          ...accessOrderWhere(req.user!.id, customer.organizationId || null)
        }
      }) > 0;
      const script = buildReorderOperationScript({
        customer,
        product,
        opportunity,
        scenario,
        targetLanguage: clean(req.body?.targetLanguage) || customer.language || null,
        tone: clean(req.body?.tone) || null,
        hasCompletedOrder,
        knowledgeUsed
      });
      if (brandContext?.riskWarnings?.length) {
        script.riskWarnings = Array.from(new Set([...(script.riskWarnings || []), ...brandContext.riskWarnings]));
      }
      const log = await (db as any).aiActionSuggestionLog.create({
        data: {
          organizationId: customer.organizationId || null,
          customerId: customer.id,
          userId: req.user!.id,
          actionType: actionTypeForScenario(scenario),
          scenario,
          inputSnapshot: { customerId: customer.id, productId: product?.id || null, opportunityId: opportunity?.id || null },
          outputSnapshot: script,
          riskLevel: "low",
          brandId: brandContext?.brand?.id || null,
          brandUsed: brandContext?.brandUsed || null,
          brandRulesUsed: brandContext?.brandRulesUsed || undefined
        }
      });
      await writeAuditLog(db as any, {
        organizationId: customer.organizationId || null,
        userId: req.user!.id,
        action: "create",
        entityType: "AIActionSuggestionLog",
        entityId: log.id,
        before: null,
        after: { actionType: actionTypeForScenario(scenario), scenario, customerId: customer.id },
        metadata: { operation: "reorder_operation_script", scenario, brandId: brandContext?.brand?.id || null },
        riskLevel: "low"
      });
      res.json({ ...script, brandUsed: brandContext?.brandUsed || null, brandRulesUsed: brandContext?.brandRulesUsed || [], createdLogId: log.id });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

async function organizationContext(db: ReorderOperationsDb, req: any) {
  const organizationId = organizationIdFromRequest(req) || null;
  const role = organizationId ? await getActiveOrganizationRole(db as any, organizationId, req.user!.id) : null;
  if (organizationId && !canReadOrganization(role)) {
    await recordSecurityAudit(db as any, req, { organizationId, action: "permission_denied", entityType: "ReorderOperation", riskLevel: "high", failureReason: "organization access denied" });
    throw Object.assign(new Error("organization membership required"), { status: 403 });
  }
  return { organizationId, role };
}

function opportunityScope(userId: string, organizationId: string | null, role: any) {
  if (organizationId && canWriteOrganizationResource(role)) return { organizationId };
  if (organizationId) {
    return {
      organizationId,
      OR: [
        { ownerId: userId },
        { customer: { ownerId: userId } },
        { customer: { assignedTo: userId } },
        { customer: { collaborators: { has: userId } } }
      ]
    };
  }
  return {
    OR: [
      { ownerId: userId },
      { createdBy: userId },
      { customer: { ownerId: userId } },
      { customer: { assignedTo: userId } },
      { customer: { collaborators: { has: userId } } }
    ]
  };
}

function customerScope(userId: string, organizationId: string | null, role: any) {
  if (organizationId && canWriteOrganizationResource(role)) return { organizationId };
  if (organizationId) {
    return {
      organizationId,
      OR: [{ ownerId: userId }, { assignedTo: userId }, { collaborators: { has: userId } }]
    };
  }
  return { OR: [{ ownerId: userId }, { assignedTo: userId }, { collaborators: { has: userId } }] };
}

async function findAccessibleCustomer(db: ReorderOperationsDb, userId: string, customerId: string, organizationId: string | null, role: any) {
  if (!customerId) throw Object.assign(new Error("customerId is required"), { status: 400 });
  const customer = await (db as any).customer.findFirst({ where: { id: customerId } });
  if (!customer) throw Object.assign(new Error("customer not found"), { status: 404 });
  const customerRole = role || (customer.organizationId ? await getActiveOrganizationRole(db as any, customer.organizationId, userId) : null);
  const canAccess = customer.organizationId && canWriteOrganizationResource(customerRole)
    ? (!organizationId || organizationId === customer.organizationId)
    : customer.ownerId === userId || customer.assignedTo === userId || (customer.collaborators || []).includes(userId);
  if (!canAccess) throw Object.assign(new Error("customer access denied"), { status: 403 });
  return customer;
}

async function findAccessibleProduct(db: ReorderOperationsDb, userId: string, productId: string, organizationId: string | null) {
  const product = await (db as any).product.findFirst({
    where: organizationId
      ? { id: productId, OR: [{ ownerId: userId }, { organizationProducts: { some: { organizationId } } }] }
      : { id: productId, ownerId: userId }
  });
  if (!product) throw Object.assign(new Error("product access denied"), { status: 403 });
  return product;
}

async function findAccessibleOpportunity(db: ReorderOperationsDb, userId: string, id: string) {
  const existing = await (db as any).reorderOpportunity.findFirst({ where: { id }, include: { customer: true, product: true } });
  if (!existing) throw Object.assign(new Error("opportunity not found"), { status: 404 });
  const role = existing.organizationId ? await getActiveOrganizationRole(db as any, existing.organizationId, userId) : null;
  const canAccess = existing.organizationId && canWriteOrganizationResource(role)
    ? true
    : existing.ownerId === userId || existing.createdBy === userId || existing.customer.ownerId === userId || existing.customer.assignedTo === userId || (existing.customer.collaborators || []).includes(userId);
  if (!canAccess) throw Object.assign(new Error("opportunity access denied"), { status: 403 });
  return existing;
}

async function findAccessibleCampaign(db: ReorderOperationsDb, userId: string, id: string, requireWrite: boolean) {
  const existing = await (db as any).reorderCampaign.findFirst({ where: { id } });
  if (!existing) throw Object.assign(new Error("campaign not found"), { status: 404 });
  const role = existing.organizationId ? await getActiveOrganizationRole(db as any, existing.organizationId, userId) : null;
  const canAccess = existing.organizationId ? canReadOrganization(role) : existing.createdBy === userId;
  const canWrite = existing.organizationId ? canWriteOrganizationResource(role) : existing.createdBy === userId;
  if (!canAccess || (requireWrite && !canWrite)) throw Object.assign(new Error("campaign access denied"), { status: 403 });
  return existing;
}

async function findAccessiblePlaybook(db: ReorderOperationsDb, userId: string, id: string, requireWrite: boolean) {
  const existing = await (db as any).reorderPlaybook.findFirst({ where: { id } });
  if (!existing) throw Object.assign(new Error("playbook not found"), { status: 404 });
  const role = existing.organizationId ? await getActiveOrganizationRole(db as any, existing.organizationId, userId) : null;
  const canAccess = existing.organizationId ? canReadOrganization(role) : existing.createdBy === userId;
  const canWrite = existing.organizationId ? hasPermission(role, "reorder.managePlaybookOrg") : existing.createdBy === userId || hasPermission(role, "reorder.managePlaybookOwn");
  if (!canAccess || (requireWrite && !canWrite)) throw Object.assign(new Error("playbook access denied"), { status: 403 });
  return existing;
}

async function loadAccessibleProducts(db: ReorderOperationsDb, userId: string, organizationId: string | null) {
  return (db as any).product.findMany({
    where: organizationId ? { OR: [{ ownerId: userId }, { organizationProducts: { some: { organizationId } } }] } : { ownerId: userId },
    take: 500
  });
}

async function loadReorderRelatedData(db: ReorderOperationsDb, customerId: string, products: any[]) {
  const [orders, quotes, followUps] = await Promise.all([
    (db as any).order.findMany({ where: { customerId }, include: { cost: true }, take: 100 }),
    (db as any).quote.findMany({ where: { customerId }, take: 100 }),
    (db as any).followUpTask.findMany({ where: { customerId }, take: 100 })
  ]);
  return { orders, quotes, followUps, products };
}

function accessOrderWhere(userId: string, organizationId: string | null) {
  if (organizationId) {
    return { organizationId, OR: [{ ownerId: userId }, { assignedTo: userId }, { customer: { ownerId: userId } }, { customer: { assignedTo: userId } }, { customer: { collaborators: { has: userId } } }] };
  }
  return { OR: [{ ownerId: userId }, { assignedTo: userId }, { customer: { ownerId: userId } }, { customer: { assignedTo: userId } }, { customer: { collaborators: { has: userId } } }] };
}

function validateCampaignInput(body: any, partial = false) {
  const name = clean(body?.name);
  const campaignType = clean(body?.campaignType);
  const targetScope = clean(body?.targetScope) || "own";
  const status = clean(body?.status) || "draft";
  if (!partial && !name) throw Object.assign(new Error("name is required"), { status: 400 });
  if (!REORDER_OPERATION_TYPES.includes(campaignType as any)) throw Object.assign(new Error("invalid campaignType"), { status: 400 });
  if (!REORDER_CAMPAIGN_SCOPES.has(targetScope)) throw Object.assign(new Error("invalid targetScope"), { status: 400 });
  if (!REORDER_CAMPAIGN_STATUSES.has(status)) throw Object.assign(new Error("invalid status"), { status: 400 });
  return { name, campaignType, targetScope, status, filters: body?.filters || null };
}

function validatePlaybookInput(body: any, partial = false) {
  const title = clean(body?.title);
  const scenario = clean(body?.scenario);
  const language = clean(body?.language) || "other";
  const content = clean(body?.content);
  if (!partial && (!title || !content)) throw Object.assign(new Error("title and content are required"), { status: 400 });
  if (!REORDER_SCRIPT_SCENARIOS.has(scenario)) throw Object.assign(new Error("invalid scenario"), { status: 400 });
  return { title, scenario, language, content, enabled: body?.enabled !== false };
}

function normalizeOpportunityTypes(value: unknown) {
  if (!Array.isArray(value)) return REORDER_OPERATION_TYPES;
  const types = value.map(String).filter((type) => REORDER_OPERATION_TYPES.includes(type as any)) as any[];
  return types.length ? types : REORDER_OPERATION_TYPES;
}

function serializeOpportunity(item: any) {
  return {
    id: item.id,
    organizationId: item.organizationId || null,
    customerId: item.customerId,
    customerName: item.customer?.name || "",
    productId: item.productId || null,
    productName: item.product?.name || null,
    orderId: item.orderId || null,
    campaignId: item.campaignId || null,
    opportunityType: item.opportunityType,
    score: item.score,
    level: item.level,
    reasons: serializeReasons(item.reasons),
    recommendedAction: item.recommendedAction || null,
    suggestedScript: item.suggestedScript || null,
    status: item.status,
    ownerId: item.ownerId,
    createdBy: item.createdBy,
    createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : String(item.createdAt),
    updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : String(item.updatedAt)
  };
}

function serializeCampaign(item: any) {
  return {
    id: item.id,
    organizationId: item.organizationId || null,
    name: item.name,
    campaignType: item.campaignType,
    targetScope: item.targetScope,
    status: item.status,
    filters: item.filters || null,
    createdBy: item.createdBy,
    createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : String(item.createdAt),
    updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : String(item.updatedAt)
  };
}

function serializePlaybook(item: any) {
  return {
    id: item.id,
    organizationId: item.organizationId || null,
    title: item.title,
    scenario: item.scenario,
    language: item.language,
    content: item.content,
    enabled: Boolean(item.enabled),
    createdBy: item.createdBy,
    createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : String(item.createdAt),
    updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : String(item.updatedAt)
  };
}

function taskTypeForOpportunity(type: string) {
  if (type === "dormant_reactivation") return "Old customer reorder";
  if (type === "new_product") return "Product recommendation";
  if (type === "replenishment") return "Reorder follow-up";
  if (type === "churn_risk") return "General reminder";
  return "Old customer reorder";
}

function actionTypeForScenario(scenario: string) {
  const map: Record<string, string> = {
    dormant_reactivation: "dormant_reactivation_script",
    new_product_recommendation: "new_product_recommendation_script",
    replenishment_check: "replenishment_check_script",
    holiday_greeting: "holiday_greeting_script",
    churn_risk_recovery: "churn_risk_recovery_script"
  };
  return map[scenario] || "reorder_operation_script";
}

function parseDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
