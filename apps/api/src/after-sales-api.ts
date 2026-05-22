import { Router } from "express";
import { prisma } from "./db.js";
import { writeAuditLog } from "./audit-log-utils.js";
import { resolveBrandContext } from "./brands-api.js";
import { findKnowledgeForAi } from "./knowledge-base-service.js";
import { canReadOrganization, canWriteOrganizationResource, getActiveOrganizationRole, organizationIdFromRequest } from "./organization-permissions.js";
import { hasPermission, recordSecurityAudit, requireConfirm } from "./permissions.js";
import { toOrderCostData } from "./profit-utils.js";
import {
  afterSalesEventType,
  afterSalesRiskWarnings,
  generateAfterSalesScript,
  serializeAfterSalesCase,
  serializeAfterSalesEvent,
  toAfterSalesCreateData,
  toAfterSalesUpdateData,
  validateAfterSalesPayload
} from "./after-sales-utils.js";

type AfterSalesDb = typeof prisma;
type RiskLevel = "low" | "medium" | "high";

export function createAfterSalesRouter(db: AfterSalesDb = prisma) {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const { organizationId, role } = await organizationContext(db, req);
      const page = Math.max(Number(req.query.page) || 1, 1);
      const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 50, 1), 100);
      const where: any = {
        ...caseScope(req.user!.id, organizationId, role),
        ...filterField(req.query.customerId, "customerId"),
        ...filterField(req.query.orderId, "orderId"),
        ...filterField(req.query.productId, "productId"),
        ...filterField(req.query.caseType, "caseType"),
        ...filterField(req.query.priority, "priority"),
        ...filterField(req.query.status, "status"),
        ...filterField(req.query.responsibility, "responsibility"),
        ...filterField(req.query.assignedTo, "assignedTo")
      };
      const keyword = clean(req.query.keyword);
      if (keyword) {
        where.OR = [
          { caseNo: { contains: keyword, mode: "insensitive" } },
          { description: { contains: keyword, mode: "insensitive" } },
          { customerClaim: { contains: keyword, mode: "insensitive" } },
          { internalNotes: { contains: keyword, mode: "insensitive" } },
          { resolutionNotes: { contains: keyword, mode: "insensitive" } },
          { customer: { name: { contains: keyword, mode: "insensitive" } } },
          { order: { orderNo: { contains: keyword, mode: "insensitive" } } },
          { product: { name: { contains: keyword, mode: "insensitive" } } }
        ];
      }
      if (clean(req.query.dateFrom) || clean(req.query.dateTo)) {
        where.createdAt = {};
        if (clean(req.query.dateFrom)) where.createdAt.gte = new Date(clean(req.query.dateFrom));
        if (clean(req.query.dateTo)) where.createdAt.lte = new Date(clean(req.query.dateTo));
      }
      const rows = await (db as any).afterSalesCase.findMany({
        where,
        include: caseInclude(),
        orderBy: [{ updatedAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize
      });
      res.json(rows.map(serializeAfterSalesCase));
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      const errors = validateAfterSalesPayload(req.body);
      if (errors.length) return res.status(400).json({ message: "validation failed", errors });
      const customer = await findAccessibleCustomer(db, req.user!.id, clean(req.body.customerId));
      if (!customer) return res.status(404).json({ message: "customer not found" });
      const order = clean(req.body.orderId) ? await findAccessibleOrder(db, req.user!.id, clean(req.body.orderId)) : null;
      if (order && order.customerId !== customer.id) return res.status(400).json({ message: "order does not belong to customer" });
      if (clean(req.body.productId)) await assertAccessibleProduct(db, req.user!.id, clean(req.body.productId), customer.organizationId || null);
      if (clean(req.body.assignedTo)) await assertOrganizationUser(db, customer.organizationId || null, clean(req.body.assignedTo));
      const row = await (db as any).afterSalesCase.create({
        data: toAfterSalesCreateData(req.body, {
          caseNo: await generateCaseNo(db, customer.organizationId || null, customer.ownerId),
          customer,
          order,
          userId: req.user!.id
        }),
        include: caseInclude()
      });
      await writeCaseEvent(db, row, "created", null, row, "After-sales case created.", req.user!.id);
      if (order && ["none", "closed", "resolved"].includes(order.afterSalesStatus || "none")) {
        await (db as any).order.update({ where: { id: order.id }, data: { afterSalesStatus: "pending" } }).catch(() => undefined);
      }
      await audit(db, req.user!.id, row.organizationId, "create", row.id, null, row, { operation: "after_sales_create", caseNo: row.caseNo, orderId: row.orderId || null });
      res.status(201).json({ ...serializeAfterSalesCase(row), riskWarnings: afterSalesRiskWarnings(row, "create") });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const row = await findAccessibleCase(db, req.user!.id, req.params.id);
      if (!row) return res.status(404).json({ message: "after-sales case not found" });
      const followUps = await (db as any).followUpTask.findMany({
        where: { OR: [{ afterSalesCaseId: row.id }, { customerId: row.customerId }] },
        orderBy: { remindAt: "desc" },
        take: 30
      });
      const orderCost = row.orderId && (db as any).orderCost ? await (db as any).orderCost.findFirst({ where: { orderId: row.orderId } }) : null;
      res.json({
        ...serializeAfterSalesCase(row),
        customer: row.customer || null,
        order: row.order || null,
        product: row.product || null,
        events: (row.events || []).map(serializeAfterSalesEvent),
        followUps,
        orderCostImpact: orderCost || null,
        riskWarnings: afterSalesRiskWarnings(row, "detail")
      });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id", async (req, res, next) => {
    try {
      const errors = validateAfterSalesPayload(req.body, { partial: true });
      if (errors.length) return res.status(400).json({ message: "validation failed", errors });
      const existing = await findAccessibleCase(db, req.user!.id, req.params.id);
      if (!existing) return res.status(404).json({ message: "after-sales case not found" });
      if (clean(req.body.assignedTo)) await assertOrganizationUser(db, existing.organizationId || null, clean(req.body.assignedTo));
      if (clean(req.body.productId)) await assertAccessibleProduct(db, req.user!.id, clean(req.body.productId), existing.organizationId || null);
      if (req.body.status === "closed") {
        const confirmError = requireConfirm(req, "afterSales.close");
        if (confirmError) return res.status(409).json(confirmError);
      }
      if (req.body.responsibility !== undefined && req.body.responsibility !== existing.responsibility) {
        const confirmError = requireConfirm(req, "afterSales.updateResponsibility");
        if (confirmError) return res.status(409).json(confirmError);
        if (!(await canUpdateResponsibilityOrSolution(db, req.user!.id, existing.organizationId))) return res.status(403).json({ message: "owner or manager role required" });
      }
      if (hasSolutionChange(req.body, existing)) {
        const confirmError = requireConfirm(req, "afterSales.updateSolution");
        if (confirmError) return res.status(409).json(confirmError);
        if (!(await canUpdateResponsibilityOrSolution(db, req.user!.id, existing.organizationId))) return res.status(403).json({ message: "owner or manager role required" });
      }
      const updated = await (db as any).afterSalesCase.update({
        where: { id: existing.id },
        data: toAfterSalesUpdateData(req.body),
        include: caseInclude()
      });
      await writeCaseEvent(db, updated, afterSalesEventType(existing, updated), existing, updated, clean(req.body.notes), req.user!.id);
      await audit(db, req.user!.id, updated.organizationId, "update", updated.id, existing, updated, { operation: "after_sales_update", caseNo: updated.caseNo }, riskForAfterSalesChange(existing, updated));
      res.json({ ...serializeAfterSalesCase(updated), riskWarnings: afterSalesRiskWarnings(updated, "update") });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", async (req, res, next) => {
    try {
      const existing = await findAccessibleCase(db, req.user!.id, req.params.id);
      if (!existing) return res.status(404).json({ message: "after-sales case not found" });
      const role = existing.organizationId ? await getActiveOrganizationRole(db as any, existing.organizationId, req.user!.id) : null;
      if (existing.organizationId && !canWriteOrganizationResource(role)) return res.status(403).json({ message: "owner or manager role required" });
      const confirmError = requireConfirm(req, "afterSales.delete");
      if (confirmError) return res.status(409).json(confirmError);
      await (db as any).afterSalesCase.delete({ where: { id: existing.id } });
      await audit(db, req.user!.id, existing.organizationId, "delete", existing.id, existing, null, { operation: "after_sales_delete", caseNo: existing.caseNo, confirmed: true }, "high");
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id/status", async (req, res, next) => {
    try {
      const status = clean(req.body.status);
      const errors = validateAfterSalesPayload({ status, resolutionNotes: req.body.resolutionNotes, notes: req.body.notes }, { partial: true });
      if (errors.length) return res.status(400).json({ message: "validation failed", errors });
      const existing = await findAccessibleCase(db, req.user!.id, req.params.id);
      if (!existing) return res.status(404).json({ message: "after-sales case not found" });
      if (status === "closed") {
        const confirmError = requireConfirm(req, "afterSales.close");
        if (confirmError) return res.status(409).json(confirmError);
      }
      if (status === "resolved" && !clean(req.body.resolutionNotes) && !clean(req.body.notes) && !existing.finalSolution && !existing.resolutionNotes) {
        return res.status(400).json({ message: "resolved status requires resolution notes or final solution" });
      }
      const data: any = { status };
      if (clean(req.body.resolutionNotes) || clean(req.body.notes)) data.resolutionNotes = clean(req.body.resolutionNotes) || clean(req.body.notes);
      if (status === "resolved") data.resolvedAt = new Date();
      if (status === "closed") data.closedAt = new Date();
      const updated = await (db as any).afterSalesCase.update({ where: { id: existing.id }, data, include: caseInclude() });
      await writeCaseEvent(db, updated, "status_changed", { status: existing.status }, { status }, clean(req.body.notes), req.user!.id);
      await audit(db, req.user!.id, updated.organizationId, "update", updated.id, existing, updated, { operation: "after_sales_status_update", oldStatus: existing.status, newStatus: status }, status === "closed" ? "high" : "medium");
      res.json({ ...serializeAfterSalesCase(updated), riskWarnings: afterSalesRiskWarnings(updated, "status") });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id/responsibility", async (req, res, next) => {
    try {
      const responsibility = clean(req.body.responsibility);
      const errors = validateAfterSalesPayload({ responsibility }, { partial: true });
      if (errors.length) return res.status(400).json({ message: "validation failed", errors });
      const existing = await findAccessibleCase(db, req.user!.id, req.params.id);
      if (!existing) return res.status(404).json({ message: "after-sales case not found" });
      const confirmError = requireConfirm(req, "afterSales.updateResponsibility");
      if (confirmError) return res.status(409).json(confirmError);
      if (!(await canUpdateResponsibilityOrSolution(db, req.user!.id, existing.organizationId))) return res.status(403).json({ message: "owner or manager role required" });
      const updated = await (db as any).afterSalesCase.update({ where: { id: existing.id }, data: { responsibility }, include: caseInclude() });
      await writeCaseEvent(db, updated, "responsibility_changed", { responsibility: existing.responsibility }, { responsibility }, clean(req.body.notes), req.user!.id);
      await audit(db, req.user!.id, updated.organizationId, "update", updated.id, existing, updated, { operation: "after_sales_responsibility_update", confirmed: true }, "medium");
      res.json({ ...serializeAfterSalesCase(updated), riskWarnings: afterSalesRiskWarnings(updated, "responsibility") });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id/solution", async (req, res, next) => {
    try {
      const errors = validateAfterSalesPayload(req.body, { partial: true });
      if (errors.length) return res.status(400).json({ message: "validation failed", errors });
      const existing = await findAccessibleCase(db, req.user!.id, req.params.id);
      if (!existing) return res.status(404).json({ message: "after-sales case not found" });
      const confirmError = requireConfirm(req, "afterSales.updateSolution");
      if (confirmError) return res.status(409).json(confirmError);
      if (!(await canUpdateResponsibilityOrSolution(db, req.user!.id, existing.organizationId))) return res.status(403).json({ message: "owner or manager role required" });
      const data = toAfterSalesUpdateData({
        finalSolution: req.body.finalSolution,
        refundAmount: req.body.refundAmount,
        reshipCost: req.body.reshipCost,
        compensationAmount: req.body.compensationAmount,
        currency: req.body.currency,
        resolutionNotes: req.body.notes || req.body.resolutionNotes
      });
      const updated = await (db as any).afterSalesCase.update({ where: { id: existing.id }, data, include: caseInclude() });
      let orderCost = null;
      if (req.body.syncOrderCost === true && updated.orderId && (db as any).orderCost) {
        orderCost = await syncOrderCostFromAfterSales(db, updated, req.user!.id, clean(req.body.notes));
      }
      await writeCaseEvent(db, updated, "solution_changed", solutionSnapshot(existing), solutionSnapshot(updated), clean(req.body.notes), req.user!.id);
      await audit(db, req.user!.id, updated.organizationId, "update", updated.id, existing, { updated, orderCost }, { operation: "after_sales_solution_update", confirmed: true, syncOrderCost: req.body.syncOrderCost === true }, "high");
      res.json({ ...serializeAfterSalesCase(updated), orderCostImpact: orderCost, riskWarnings: afterSalesRiskWarnings(updated, "solution") });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/create-follow-up-task", async (req, res, next) => {
    try {
      const confirmError = requireConfirm(req, "afterSales.createTask");
      if (confirmError) return res.status(409).json(confirmError);
      const existing = await findAccessibleCase(db, req.user!.id, req.params.id);
      if (!existing) return res.status(404).json({ message: "after-sales case not found" });
      const remindAt = parseDate(req.body.remindAt) || tomorrow();
      const taskType = clean(req.body.taskType) || taskTypeForCase(existing);
      const recommendedScript = clean(req.body.recommendedScript) || defaultFollowUpScript(existing);
      const followUpTask = await (db as any).followUpTask.create({
        data: {
          customerId: existing.customerId,
          orderId: existing.orderId || null,
          afterSalesCaseId: existing.id,
          taskType,
          remindAt,
          recommendedScript,
          status: "pending",
          ownerId: existing.assignedTo || existing.ownerId || req.user!.id
        }
      });
      await writeCaseEvent(db, existing, "task_created", null, { followUpTaskId: followUpTask.id, taskType }, null, req.user!.id);
      await audit(db, req.user!.id, existing.organizationId, "create", followUpTask.id, existing, followUpTask, { operation: "after_sales_create_follow_up_task", caseId: existing.id, confirmed: true }, "medium");
      res.status(201).json({ followUpTask, riskWarnings: afterSalesRiskWarnings(existing, "task") });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export function createAfterSalesAiRouter(db: AfterSalesDb = prisma) {
  const router = Router();

  router.post("/after-sales-script", async (req, res, next) => {
    try {
      const caseId = clean(req.body.afterSalesCaseId);
      const existing = await findAccessibleCase(db, req.user!.id, caseId);
      if (!existing) return res.status(404).json({ message: "after-sales case not found" });
      const lookup = await findKnowledgeForAi(db as any, {
        ownerId: existing.customer?.ownerId || req.user!.id,
        organizationId: existing.organizationId || null,
        targetLanguage: clean(req.body.targetLanguage) || existing.customer?.language || "English",
        mode: "reply",
        scenario: "follow_up" as any,
        keyword: [existing.caseType, existing.description, existing.customerClaim, existing.finalSolution, req.body.scenario].filter(Boolean).join(" ")
      });
      const brandContext = clean(req.body.brandId)
        ? await resolveBrandContext(db as any, req.user!.id, {
            brandId: clean(req.body.brandId),
            customerId: existing.customerId,
            productId: existing.productId || null,
            scenario: clean(req.body.scenario) || existing.caseType
          })
        : null;
      const generated = generateAfterSalesScript(existing, req.body, [...(brandContext?.knowledgeContext || []), ...(lookup.items as any[])]);
      if (brandContext?.riskWarnings?.length) {
        generated.riskWarnings = Array.from(new Set([...(generated.riskWarnings || []), ...brandContext.riskWarnings]));
      }
      if (brandContext?.knowledgeUsed?.length) {
        generated.knowledgeUsed = Array.from(new Set([...(brandContext.knowledgeUsed || []), ...(generated.knowledgeUsed || [])]));
      }
      const log = await (db as any).aiActionSuggestionLog?.create?.({
        data: {
          organizationId: existing.organizationId || null,
          customerId: existing.customerId,
          userId: req.user!.id,
          actionType: "after_sales_script",
          scenario: clean(req.body.scenario) || "apologize_and_acknowledge",
          inputSnapshot: {
            afterSalesCaseId: existing.id,
            caseNo: existing.caseNo,
            caseType: existing.caseType,
            status: existing.status,
            finalSolution: existing.finalSolution || null
          },
          outputSnapshot: generated,
          riskLevel: "medium",
          brandId: brandContext?.brand?.id || null,
          brandUsed: brandContext?.brandUsed || null,
          brandRulesUsed: brandContext?.brandRulesUsed || undefined
        }
      });
      await writeCaseEvent(db, existing, "ai_script_generated", null, { scenario: clean(req.body.scenario), logId: log?.id || null }, null, req.user!.id);
      await audit(db, req.user!.id, existing.organizationId, "create", log?.id || existing.id, null, generated, { operation: "ai_after_sales_script", caseId: existing.id, caseNo: existing.caseNo, brandId: brandContext?.brand?.id || null }, "medium");
      res.json({ ...generated, brandUsed: brandContext?.brandUsed || null, brandRulesUsed: brandContext?.brandRulesUsed || [], createdLogId: log?.id || null });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export const afterSalesRouter = createAfterSalesRouter();
export const afterSalesAiRouter = createAfterSalesAiRouter();

async function organizationContext(db: AfterSalesDb, req: any) {
  const organizationId = organizationIdFromRequest(req) || null;
  const role = organizationId ? await getActiveOrganizationRole(db as any, organizationId, req.user!.id) : null;
  if (organizationId && !canReadOrganization(role)) {
    await recordSecurityAudit(db as any, req, { organizationId, action: "permission_denied", entityType: "AfterSalesCase", riskLevel: "high", failureReason: "organization access denied" });
    throw Object.assign(new Error("organization membership required"), { status: 403 });
  }
  return { organizationId, role };
}

function caseScope(userId: string, organizationId: string | null, role: string | null) {
  if (organizationId) {
    if (canWriteOrganizationResource(role as any)) return { organizationId };
    return {
      organizationId,
      OR: [
        { ownerId: userId },
        { assignedTo: userId },
        { customer: { OR: [{ ownerId: userId }, { assignedTo: userId }, { collaborators: { has: userId } }] } }
      ]
    };
  }
  return { ownerId: userId };
}

async function findAccessibleCase(db: AfterSalesDb, userId: string, id: string) {
  if (!id) return null;
  const row = await (db as any).afterSalesCase.findFirst({ where: { id }, include: caseInclude(true) });
  if (!row) return null;
  const role = row.organizationId ? await getActiveOrganizationRole(db as any, row.organizationId, userId) : null;
  if (canWriteOrganizationResource(role as any) || row.ownerId === userId || row.assignedTo === userId || row.customer?.ownerId === userId || row.customer?.assignedTo === userId || (row.customer?.collaborators || []).includes(userId)) return row;
  await recordSecurityAudit(db as any, { user: { id: userId }, socket: { remoteAddress: null }, header: () => null, originalUrl: "", url: "", method: "" } as any, { organizationId: row.organizationId || null, action: "permission_denied", entityType: "AfterSalesCase", entityId: id, riskLevel: "high", failureReason: "after-sales access denied" });
  throw Object.assign(new Error("after-sales access denied"), { status: 403 });
}

async function findAccessibleCustomer(db: AfterSalesDb, userId: string, customerId: string) {
  if (!customerId) return null;
  const customer = await (db as any).customer.findFirst({ where: { id: customerId } });
  if (!customer) return null;
  const role = customer.organizationId ? await getActiveOrganizationRole(db as any, customer.organizationId, userId) : null;
  if (canWriteOrganizationResource(role as any) || customer.ownerId === userId || customer.assignedTo === userId || (customer.collaborators || []).includes(userId)) return customer;
  throw Object.assign(new Error("customer access denied"), { status: 403 });
}

async function findAccessibleOrder(db: AfterSalesDb, userId: string, id: string) {
  if (!id) return null;
  const order = await (db as any).order.findFirst({ where: { id }, include: { customer: true, product: true } });
  if (!order) return null;
  await findAccessibleCustomer(db, userId, order.customerId);
  return order;
}

async function assertAccessibleProduct(db: AfterSalesDb, userId: string, productId: string, organizationId: string | null) {
  const product = await (db as any).product.findFirst({ where: { id: productId } });
  if (!product) throw Object.assign(new Error("product not found"), { status: 404 });
  if (product.ownerId === userId) return product;
  if (organizationId) {
    const role = await getActiveOrganizationRole(db as any, organizationId, userId);
    const shared = await (db as any).organizationProduct?.findFirst?.({ where: { organizationId, productId } });
    if (role && shared) return product;
  }
  throw Object.assign(new Error("product access denied"), { status: 403 });
}

async function assertOrganizationUser(db: AfterSalesDb, organizationId: string | null, userId: string) {
  if (!organizationId || !userId) return;
  const member = await (db as any).organizationMember.findFirst({ where: { organizationId, userId, status: "active" } });
  if (!member) throw Object.assign(new Error("assigned user must be active organization member"), { status: 400 });
}

async function canUpdateResponsibilityOrSolution(db: AfterSalesDb, userId: string, organizationId: string | null) {
  if (!organizationId) return true;
  const role = await getActiveOrganizationRole(db as any, organizationId, userId);
  return Boolean(role && (hasPermission(role, "afterSales.updateResponsibility") || hasPermission(role, "afterSales.updateSolution")));
}

async function generateCaseNo(db: AfterSalesDb, organizationId: string | null, ownerId: string) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `AS-${date}`;
  const where = organizationId ? { organizationId, caseNo: { startsWith: prefix } } : { ownerId, caseNo: { startsWith: prefix } };
  const count = await (db as any).afterSalesCase.count({ where }).catch(() => 0);
  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}

function caseInclude(withEvents = false) {
  return {
    customer: true,
    order: true,
    product: true,
    ...(withEvents ? { events: { orderBy: { createdAt: "desc" } } } : {})
  };
}

function filterField(value: unknown, field: string) {
  const cleaned = clean(value);
  return cleaned ? { [field]: cleaned } : {};
}

function hasSolutionChange(body: any, existing: any) {
  return body.finalSolution !== undefined || body.refundAmount !== undefined || body.reshipCost !== undefined || body.compensationAmount !== undefined || body.currency !== undefined;
}

function solutionSnapshot(row: any) {
  return {
    finalSolution: row.finalSolution || null,
    refundAmount: row.refundAmount || null,
    reshipCost: row.reshipCost || null,
    compensationAmount: row.compensationAmount || null,
    currency: row.currency || null
  };
}

async function syncOrderCostFromAfterSales(db: AfterSalesDb, row: any, userId: string, notes?: string) {
  if (!row.orderId || !(db as any).orderCost) return null;
  const order = await (db as any).order.findFirst({ where: { id: row.orderId } });
  if (!order) return null;
  const existing = await (db as any).orderCost.findFirst({ where: { orderId: row.orderId } });
  const payload = {
    ...(existing || {}),
    refundAmount: row.refundAmount ?? existing?.refundAmount ?? null,
    reshipCost: row.reshipCost ?? existing?.reshipCost ?? null,
    otherCost: row.compensationAmount ?? existing?.otherCost ?? null,
    currency: row.currency || existing?.currency || order.currency,
    notes: [existing?.notes, notes || "Synced from after-sales case."].filter(Boolean).join("\n")
  };
  const data = toOrderCostData(payload, order, userId);
  if (existing) return (db as any).orderCost.update({ where: { id: existing.id }, data });
  return (db as any).orderCost.create({ data });
}

async function writeCaseEvent(db: AfterSalesDb, row: any, eventType: string, oldValue: unknown, newValue: unknown, notes: string | null | undefined, createdBy: string) {
  if (!(db as any).afterSalesEvent) return null;
  return (db as any).afterSalesEvent.create({
    data: {
      organizationId: row.organizationId || null,
      afterSalesCaseId: row.id,
      eventType,
      oldValue: oldValue === undefined ? null : oldValue,
      newValue: newValue === undefined ? null : newValue,
      notes: notes || null,
      createdBy
    }
  });
}

async function audit(db: AfterSalesDb, userId: string, organizationId: string | null, action: "create" | "update" | "delete", entityId: string, before: unknown, after: unknown, metadata: Record<string, unknown>, riskLevel: RiskLevel = "low") {
  return writeAuditLog(db as any, { organizationId, userId, action, entityType: "AfterSalesCase", entityId, before, after, metadata, riskLevel });
}

function riskForAfterSalesChange(before: any, after: any): RiskLevel {
  if (before.status !== after.status && ["closed", "cancelled"].includes(after.status)) return "high";
  if (before.finalSolution !== after.finalSolution || before.refundAmount !== after.refundAmount || before.reshipCost !== after.reshipCost || before.compensationAmount !== after.compensationAmount) return "high";
  if (before.responsibility !== after.responsibility && after.responsibility !== "unknown") return "medium";
  return "low";
}

function taskTypeForCase(row: any) {
  if (row.finalSolution === "refund" || row.requestedSolution === "refund") return "refund_status_follow_up";
  if (row.finalSolution === "reship" || row.requestedSolution === "reship") return "reship_status_follow_up";
  if (row.caseType === "complaint") return "complaint_resolution_follow_up";
  if (!row.evidenceUrls?.length) return "customer_evidence_request";
  return "after_sales_follow_up";
}

function defaultFollowUpScript(row: any) {
  if (!row.evidenceUrls?.length) return "Draft only: please share clear photos, videos, package pictures and logistics screenshots so we can verify the after-sales case.";
  if (row.finalSolution === "refund") return "Draft only: follow up on refund status after confirming company policy and actual refund process.";
  if (row.finalSolution === "reship") return "Draft only: follow up on reshipment after confirming product, address, logistics method and approval.";
  return "Draft only: follow up on the after-sales case. Confirm responsibility, company policy and final solution before sending.";
}

function tomorrow() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(10, 0, 0, 0);
  return date;
}

function parseDate(value: unknown) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? new Date(value) : null;
}

function clean(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}
