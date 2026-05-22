import { Router } from "express";
import { prisma } from "./db.js";
import { writeAuditLog } from "./audit-log-utils.js";
import { buildKnowledgeContext, findKnowledgeForAi } from "./knowledge-base-service.js";
import { canReadOrganization, canWriteOrganizationResource, getActiveOrganizationRole, organizationIdFromRequest } from "./organization-permissions.js";
import { recordSecurityAudit } from "./permissions.js";
import {
  buildReorderScript,
  calculateCustomerPredictions,
  calculateProductOpportunities,
  type PredictionCustomer,
  type PredictionType
} from "./prediction-rules.js";

type PredictionDb = typeof prisma;

const customerPredictionTypes: PredictionType[] = ["reorder", "dormant", "high_value", "churn_risk"];
const predictionStatuses = new Set(["open", "dismissed", "converted", "task_created"]);
const reminderStatuses = new Set(["pending", "completed", "dismissed", "converted"]);
const reminderTypes = new Set(["reorder", "dormant_reactivation", "product_recommendation"]);

export function createPredictionsRouter(db: PredictionDb = prisma) {
  const router = Router();

  router.get("/customers", async (req, res, next) => {
    try {
      const organizationId = organizationIdFromRequest(req);
      const role = organizationId ? await getActiveOrganizationRole(db as any, organizationId, req.user!.id) : null;
      if (organizationId && !canReadOrganization(role)) return res.status(403).json({ message: "organization membership required" });
      const page = Math.max(Number(req.query.page) || 1, 1);
      const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 50, 1), 100);
      const where: any = {
        ...predictionScopeWhere(req.user!.id, organizationId, role),
        ...(clean(req.query.predictionType) ? { predictionType: clean(req.query.predictionType) } : {}),
        ...(clean(req.query.level) ? { level: clean(req.query.level) } : {}),
        ...(clean(req.query.status) ? { status: clean(req.query.status) } : {})
      };
      if (clean(req.query.assignedTo)) where.customer = { assignedTo: clean(req.query.assignedTo) };
      const rows = await (db as any).customerPrediction.findMany({
        where,
        include: { customer: true },
        orderBy: [{ score: "desc" }, { updatedAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize
      });
      res.json(rows.map(serializePrediction));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/customers/:id", async (req, res, next) => {
    try {
      const status = clean(req.body?.status);
      if (!predictionStatuses.has(status)) return res.status(400).json({ message: "invalid status" });
      const existing = await (db as any).customerPrediction.findFirst({
        where: { id: req.params.id },
        include: { customer: true }
      });
      if (!existing) return res.status(404).json({ message: "prediction not found" });
      await assertPredictionAccess(db, req.user!.id, existing);
      const updated = await (db as any).customerPrediction.update({
        where: { id: existing.id },
        data: { status },
        include: { customer: true }
      });
      await writeAuditLog(db as any, {
        organizationId: existing.organizationId || null,
        userId: req.user!.id,
        action: "update",
        entityType: "CustomerPrediction",
        entityId: existing.id,
        before: existing,
        after: updated,
        metadata: { operation: "status_update" },
        riskLevel: status === "converted" ? "medium" : "low"
      });
      res.json(serializePrediction(updated));
    } catch (error) {
      next(error);
    }
  });

  router.post("/customers/recalculate", async (req, res, next) => {
    try {
      const organizationId = clean(req.body?.organizationId) || organizationIdFromRequest(req);
      const customerId = clean(req.body?.customerId);
      const predictionTypes = normalizePredictionTypes(req.body?.predictionTypes);
      const role = organizationId ? await getActiveOrganizationRole(db as any, organizationId, req.user!.id) : null;
      if (organizationId && !canReadOrganization(role)) {
        await recordSecurityAudit(db as any, req, { organizationId, action: "permission_denied", entityType: "CustomerPrediction", riskLevel: "high", failureReason: "organization access denied" });
        return res.status(403).json({ message: "organization membership required" });
      }
      if (organizationId && !customerId && !canWriteOrganizationResource(role)) {
        await recordSecurityAudit(db as any, req, { organizationId, action: "permission_denied", entityType: "CustomerPrediction", riskLevel: "high", failureReason: "team recalculation requires owner or manager" });
        return res.status(403).json({ message: "owner or manager role required for team recalculation" });
      }
      const customers = customerId
        ? [await findAccessibleCustomer(db, req.user!.id, customerId, organizationId || null)]
        : await db.customer.findMany({ where: customerListScope(req.user!.id, organizationId || null, role), take: 500 });
      const validCustomers = customers.filter(Boolean) as any[];
      const result = { createdCount: 0, updatedCount: 0, skippedCount: 0, errors: [] as Array<{ customerId?: string; message: string }> };
      const related = await loadRelatedData(db, validCustomers.map((customer) => customer.id));
      for (const customer of validCustomers) {
        try {
          const predictions = calculateCustomerPredictions(customer, relatedForCustomer(customer.id, related), predictionTypes);
          if (!predictions.length) result.skippedCount += 1;
          for (const prediction of predictions) {
            const existing = await (db as any).customerPrediction.findFirst({
              where: { customerId: customer.id, userId: req.user!.id, predictionType: prediction.predictionType }
            });
            const data = {
              organizationId: customer.organizationId || null,
              customerId: customer.id,
              userId: req.user!.id,
              predictionType: prediction.predictionType,
              score: prediction.score,
              level: prediction.level,
              reasons: prediction.reasons,
              recommendedAction: prediction.recommendedAction,
              suggestedScript: prediction.suggestedScript,
              status: existing?.status || "open"
            };
            if (existing) {
              await (db as any).customerPrediction.update({ where: { id: existing.id }, data });
              result.updatedCount += 1;
            } else {
              await (db as any).customerPrediction.create({ data });
              result.createdCount += 1;
            }
          }
        } catch (error) {
          result.errors.push({ customerId: customer.id, message: error instanceof Error ? error.message : "prediction failed" });
        }
      }
      await writeAuditLog(db as any, {
        organizationId: organizationId || null,
        userId: req.user!.id,
        action: "update",
        entityType: "CustomerPrediction",
        entityId: customerId || organizationId || req.user!.id,
        before: null,
        after: result,
        metadata: { operation: "prediction_recalculate", predictionTypes, bulk: !customerId },
        riskLevel: organizationId && !customerId ? "medium" : "low"
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get("/product-opportunities", async (req, res, next) => {
    try {
      const organizationId = organizationIdFromRequest(req);
      const role = organizationId ? await getActiveOrganizationRole(db as any, organizationId, req.user!.id) : null;
      if (organizationId && !canReadOrganization(role)) return res.status(403).json({ message: "organization membership required" });
      const productId = clean(req.query.productId);
      const category = clean(req.query.category);
      const level = clean(req.query.level);
      const customerWhere = customerListScope(req.user!.id, organizationId || null, role);
      const productWhere = organizationId
        ? { OR: [{ ownerId: req.user!.id }, { organizationProducts: { some: { organizationId } } }] }
        : { ownerId: req.user!.id };
      if (productId) (productWhere as any).id = productId;
      if (category) (productWhere as any).category = category;
      const [customers, products] = await Promise.all([
        db.customer.findMany({ where: customerWhere, take: 500 }),
        db.product.findMany({ where: productWhere as any, take: 500 })
      ]);
      const related = await loadRelatedData(db, customers.map((customer) => customer.id));
      const rows = calculateProductOpportunities({
        products,
        customers,
        quotes: related.quotes,
        sampleOrders: related.sampleOrders,
        customRequests: related.customRequests,
        materials: await db.material.findMany({ where: organizationId ? { OR: [{ ownerId: req.user!.id }, { organizationMaterials: { some: { organizationId } } }] } : { ownerId: req.user!.id }, take: 500 })
      }).filter((item) => !level || item.level === level);
      res.json(rows);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export function createReorderRemindersRouter(db: PredictionDb = prisma) {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const organizationId = organizationIdFromRequest(req);
      const role = organizationId ? await getActiveOrganizationRole(db as any, organizationId, req.user!.id) : null;
      if (organizationId && !canReadOrganization(role)) return res.status(403).json({ message: "organization membership required" });
      const page = Math.max(Number(req.query.page) || 1, 1);
      const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 50, 1), 100);
      const where: any = {
        ...reminderScopeWhere(req.user!.id, organizationId, role),
        ...(clean(req.query.status) ? { status: clean(req.query.status) } : {}),
        ...(clean(req.query.reminderType) ? { reminderType: clean(req.query.reminderType) } : {})
      };
      if (clean(req.query.remindAtFrom) || clean(req.query.remindAtTo)) {
        where.remindAt = {};
        if (clean(req.query.remindAtFrom)) where.remindAt.gte = new Date(clean(req.query.remindAtFrom)!);
        if (clean(req.query.remindAtTo)) where.remindAt.lte = new Date(clean(req.query.remindAtTo)!);
      }
      if (clean(req.query.assignedTo)) where.customer = { assignedTo: clean(req.query.assignedTo) };
      const rows = await (db as any).reorderReminder.findMany({
        where,
        include: { customer: true, product: true },
        orderBy: [{ remindAt: "asc" }, { updatedAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize
      });
      res.json(rows.map(serializeReminder));
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      const customer = await findAccessibleCustomer(db, req.user!.id, clean(req.body?.customerId), null);
      if (!customer) return res.status(404).json({ message: "customer not found" });
      if (!reminderTypes.has(clean(req.body?.reminderType) || "")) return res.status(400).json({ message: "invalid reminderType" });
      const remindAt = parseDate(req.body?.remindAt);
      if (!remindAt) return res.status(400).json({ message: "remindAt is required" });
      const productId = clean(req.body?.productId);
      if (productId) await assertAccessibleProduct(db, req.user!.id, productId, customer.organizationId || null);
      const row = await (db as any).reorderReminder.create({
        data: {
          organizationId: customer.organizationId || null,
          customerId: customer.id,
          productId: productId || null,
          reminderType: clean(req.body?.reminderType),
          remindAt,
          reason: clean(req.body?.reason) || null,
          suggestedScript: clean(req.body?.suggestedScript) || null,
          status: "pending",
          ownerId: customer.assignedTo || customer.ownerId || req.user!.id
        },
        include: { customer: true, product: true }
      });
      await writeAuditLog(db as any, { organizationId: customer.organizationId || null, userId: req.user!.id, action: "create", entityType: "ReorderReminder", entityId: row.id, before: null, after: row });
      res.status(201).json(serializeReminder(row));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id", async (req, res, next) => {
    try {
      const existing = await findAccessibleReminder(db, req.user!.id, req.params.id);
      if (!existing) return res.status(404).json({ message: "reorder reminder not found" });
      const status = clean(req.body?.status);
      if (!status || !reminderStatuses.has(status)) return res.status(400).json({ message: "invalid status" });
      const updated = await (db as any).reorderReminder.update({
        where: { id: existing.id },
        data: { status },
        include: { customer: true, product: true }
      });
      await writeAuditLog(db as any, { organizationId: existing.organizationId || null, userId: req.user!.id, action: "update", entityType: "ReorderReminder", entityId: existing.id, before: existing, after: updated, metadata: { operation: "status_update" } });
      res.json(serializeReminder(updated));
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/create-follow-up-task", async (req, res, next) => {
    try {
      const reminder = await findAccessibleReminder(db, req.user!.id, req.params.id);
      if (!reminder) return res.status(404).json({ message: "reorder reminder not found" });
      const task = await db.followUpTask.create({
        data: {
          customerId: reminder.customerId,
          taskType: reminder.reminderType === "dormant_reactivation" ? "Dormant reactivation" : "Reorder follow-up",
          remindAt: reminder.remindAt,
          recommendedScript: reminder.suggestedScript || reminder.reason || "Follow up manually. Confirm price, inventory, lead time, and shipping before sending.",
          status: "pending",
          ownerId: reminder.ownerId
        }
      });
      const updated = await (db as any).reorderReminder.update({ where: { id: reminder.id }, data: { status: "task_created" } });
      await writeAuditLog(db as any, { organizationId: reminder.organizationId || null, userId: req.user!.id, action: "create", entityType: "FollowUpTask", entityId: task.id, before: null, after: task, metadata: { source: "reorderReminder", reminderId: reminder.id } });
      await writeAuditLog(db as any, { organizationId: reminder.organizationId || null, userId: req.user!.id, action: "update", entityType: "ReorderReminder", entityId: reminder.id, before: reminder, after: updated, metadata: { operation: "create_follow_up_task" } });
      res.status(201).json({ followUpTask: task, reminder: updated });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export function createReorderAiRouter(db: PredictionDb = prisma) {
  const router = Router();
  router.post("/reorder-script", async (req, res, next) => {
    try {
      const customer = await findAccessibleCustomer(db, req.user!.id, clean(req.body?.customerId), null);
      if (!customer) return res.status(404).json({ message: "customer not found" });
      const productId = clean(req.body?.productId);
      const product = productId ? await assertAccessibleProduct(db, req.user!.id, productId, customer.organizationId || null) : null;
      const lookup = await findKnowledgeForAi(db as any, {
        ownerId: customer.ownerId || req.user!.id,
        organizationId: customer.organizationId || null,
        targetLanguage: clean(req.body?.targetLanguage) || customer.language || "English",
        productId: product?.id || null,
        mode: "reply",
        keyword: [customer.latestSummary, customer.notes, customer.interestedProduct].filter(Boolean).join(" "),
        scenario: "follow_up" as any
      });
      const knowledge = buildKnowledgeContext(lookup.items as any);
      const generated = buildReorderScript({
        customer,
        productName: product?.name || customer.interestedProduct,
        reminderType: clean(req.body?.reminderType) || "reorder",
        targetLanguage: clean(req.body?.targetLanguage) || customer.language,
        tone: clean(req.body?.tone)
      });
      const response = {
        ...generated,
        knowledgeUsed: knowledge.knowledgeUsed,
        riskWarnings: [
          ...generated.riskWarnings,
          ...(knowledge.knowledgeUsed.length ? [] : ["No related knowledge base content found. Confirm company policy, price, inventory, lead time, shipping, payment, and after-sales rules."])
        ],
        createdLogId: null as string | null
      };
      const log = await (db as any).aiActionSuggestionLog?.create?.({
        data: {
          organizationId: customer.organizationId || null,
          customerId: customer.id,
          userId: req.user!.id,
          actionType: "reorder_script",
          scenario: clean(req.body?.reminderType) || "reorder",
          inputSnapshot: { customerId: customer.id, productId: product?.id || null, reminderType: clean(req.body?.reminderType) || "reorder" },
          outputSnapshot: response,
          riskLevel: "medium"
        }
      });
      response.createdLogId = log?.id || null;
      await writeAuditLog(db as any, { organizationId: customer.organizationId || null, userId: req.user!.id, action: "create", entityType: "AIActionSuggestionLog", entityId: response.createdLogId || customer.id, before: null, after: { actionType: "reorder_script", customerId: customer.id }, riskLevel: "medium" });
      res.json(response);
    } catch (error) {
      next(error);
    }
  });
  return router;
}

export const predictionsRouter = createPredictionsRouter();
export const reorderRemindersRouter = createReorderRemindersRouter();
export const reorderAiRouter = createReorderAiRouter();

function serializePrediction(row: any) {
  return {
    id: row.id,
    organizationId: row.organizationId || null,
    customerId: row.customerId,
    customerName: row.customer?.name || "",
    assignedTo: row.customer?.assignedTo || null,
    predictionType: row.predictionType,
    score: row.score,
    level: row.level,
    reasons: Array.isArray(row.reasons) ? row.reasons : [],
    recommendedAction: row.recommendedAction || null,
    suggestedScript: row.suggestedScript || null,
    status: row.status,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt)
  };
}

function serializeReminder(row: any) {
  return {
    id: row.id,
    organizationId: row.organizationId || null,
    customerId: row.customerId,
    customerName: row.customer?.name || "",
    productId: row.productId || null,
    productName: row.product?.name || null,
    reminderType: row.reminderType,
    remindAt: toIso(row.remindAt),
    reason: row.reason || null,
    suggestedScript: row.suggestedScript || null,
    status: row.status,
    ownerId: row.ownerId,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt)
  };
}

async function findAccessibleCustomer(db: PredictionDb, userId: string, customerId?: string | null, organizationId?: string | null) {
  if (!customerId) return null;
  const customer = await db.customer.findFirst({ where: { id: customerId } }) as any;
  if (!customer) return null;
  if (organizationId && customer.organizationId !== organizationId) throw Object.assign(new Error("customer organization mismatch"), { status: 403 });
  const role = customer.organizationId ? await getActiveOrganizationRole(db as any, customer.organizationId, userId) : null;
  if (canWriteOrganizationResource(role) || customer.ownerId === userId || customer.assignedTo === userId || (customer.collaborators || []).includes(userId)) return customer;
  throw Object.assign(new Error("customer access denied"), { status: 403 });
}

async function findAccessibleReminder(db: PredictionDb, userId: string, id: string) {
  const reminder = await (db as any).reorderReminder.findFirst({ where: { id }, include: { customer: true, product: true } });
  if (!reminder) return null;
  const role = reminder.organizationId ? await getActiveOrganizationRole(db as any, reminder.organizationId, userId) : null;
  if (canWriteOrganizationResource(role) || reminder.ownerId === userId || reminder.customer?.ownerId === userId || reminder.customer?.assignedTo === userId || (reminder.customer?.collaborators || []).includes(userId)) return reminder;
  throw Object.assign(new Error("reorder reminder access denied"), { status: 403 });
}

async function assertPredictionAccess(db: PredictionDb, userId: string, prediction: any) {
  const role = prediction.organizationId ? await getActiveOrganizationRole(db as any, prediction.organizationId, userId) : null;
  const customer = prediction.customer || await db.customer.findFirst({ where: { id: prediction.customerId } });
  if (canWriteOrganizationResource(role) || prediction.userId === userId || customer?.ownerId === userId || customer?.assignedTo === userId || (customer?.collaborators || []).includes(userId)) return;
  throw Object.assign(new Error("prediction access denied"), { status: 403 });
}

async function assertAccessibleProduct(db: PredictionDb, userId: string, productId: string, organizationId: string | null) {
  const product = await db.product.findFirst({ where: { id: productId } }) as any;
  if (!product) throw Object.assign(new Error("product not found"), { status: 404 });
  if (product.ownerId === userId) return product;
  if (organizationId) {
    const role = await getActiveOrganizationRole(db as any, organizationId, userId);
    const shared = await (db as any).organizationProduct?.findFirst?.({ where: { organizationId, productId } });
    if (shared && role) return product;
  }
  throw Object.assign(new Error("product access denied"), { status: 403 });
}

function customerListScope(userId: string, organizationId: string | null, role: string | null) {
  if (organizationId) {
    if (canWriteOrganizationResource(role as any)) return { organizationId };
    return { organizationId, OR: [{ ownerId: userId }, { assignedTo: userId }, { collaborators: { has: userId } }] };
  }
  return { ownerId: userId };
}

function predictionScopeWhere(userId: string, organizationId: string | null, role: string | null) {
  if (organizationId) {
    if (canWriteOrganizationResource(role as any)) return { organizationId };
    return { organizationId, customer: { OR: [{ ownerId: userId }, { assignedTo: userId }, { collaborators: { has: userId } }] } };
  }
  return { userId };
}

function reminderScopeWhere(userId: string, organizationId: string | null, role: string | null) {
  if (organizationId) {
    if (canWriteOrganizationResource(role as any)) return { organizationId };
    return { organizationId, customer: { OR: [{ ownerId: userId }, { assignedTo: userId }, { collaborators: { has: userId } }] } };
  }
  return { ownerId: userId };
}

async function loadRelatedData(db: PredictionDb, customerIds: string[]) {
  const where = { customerId: { in: customerIds } };
  const [quotes, followUps, sampleOrders, customRequests] = await Promise.all([
    db.quote.findMany({ where }),
    db.followUpTask.findMany({ where }),
    db.sampleOrder.findMany({ where }),
    db.customRequest.findMany({ where })
  ]);
  return { quotes, followUps, sampleOrders, customRequests, now: new Date() };
}

function relatedForCustomer(customerId: string, related: Awaited<ReturnType<typeof loadRelatedData>>) {
  return {
    now: related.now,
    quotes: related.quotes.filter((item) => item.customerId === customerId),
    followUps: related.followUps.filter((item) => item.customerId === customerId),
    sampleOrders: related.sampleOrders.filter((item) => item.customerId === customerId),
    customRequests: related.customRequests.filter((item) => item.customerId === customerId)
  };
}

function normalizePredictionTypes(value: unknown): PredictionType[] {
  if (!Array.isArray(value) || !value.length) return customerPredictionTypes;
  return value.filter((item): item is PredictionType => customerPredictionTypes.includes(item));
}

function clean(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function parseDate(value: unknown) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) return null;
  return new Date(value);
}

function toIso(value: unknown) {
  return value instanceof Date ? value.toISOString() : String(value || "");
}
