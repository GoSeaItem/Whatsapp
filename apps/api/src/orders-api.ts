import { Router } from "express";
import { prisma } from "./db.js";
import { writeAuditLog } from "./audit-log-utils.js";
import { resolveBrandContext } from "./brands-api.js";
import { findKnowledgeForAi } from "./knowledge-base-service.js";
import { canReadOrganization, canWriteOrganizationResource, getActiveOrganizationRole, organizationIdFromRequest } from "./organization-permissions.js";
import { recordSecurityAudit, requireConfirm } from "./permissions.js";
import {
  generateOrderScript,
  riskWarningsForOrder,
  serializeOrder,
  toOrderCreateData,
  toOrderUpdateData,
  validateOrderPayload
} from "./order-utils.js";
import {
  buildFulfillmentBoard,
  calculateFulfillmentAlerts,
  fulfillmentRiskWarnings,
  fulfillmentTimeline,
  generateFulfillmentScript,
  recommendedActionFor,
  serializeFulfillmentAlert
} from "./order-fulfillment-utils.js";

type OrderDb = typeof prisma;

const statusFields = {
  paymentStatus: ["unpaid", "deposit_paid", "paid", "refunded", "cancelled"],
  productionStatus: ["not_started", "preparing", "in_production", "completed", "delayed", "cancelled"],
  shippingStatus: ["pending", "ready_to_ship", "shipped", "delivered", "delayed", "cancelled"],
  afterSalesStatus: ["none", "pending", "processing", "resolved", "refunded", "closed"]
} as const;

export function createOrdersRouter(db: OrderDb = prisma) {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const organizationId = organizationIdFromRequest(req);
      const role = organizationId ? await getActiveOrganizationRole(db as any, organizationId, req.user!.id) : null;
      if (organizationId && !canReadOrganization(role)) return res.status(403).json({ message: "organization membership required" });
      const where: any = {
        ...orderScope(req.user!.id, organizationId || null, role),
        ...filterField(req.query.customerId, "customerId"),
        ...filterField(req.query.assignedTo, "assignedTo"),
        ...filterField(req.query.orderType, "orderType"),
        ...filterField(req.query.orderStatus, "orderStatus"),
        ...filterField(req.query.paymentStatus, "paymentStatus"),
        ...filterField(req.query.productionStatus, "productionStatus"),
        ...filterField(req.query.shippingStatus, "shippingStatus"),
        ...filterField(req.query.afterSalesStatus, "afterSalesStatus")
      };
      const keyword = clean(req.query.keyword);
      if (keyword) {
        where.OR = [
          { orderNo: { contains: keyword, mode: "insensitive" } },
          { title: { contains: keyword, mode: "insensitive" } },
          { notes: { contains: keyword, mode: "insensitive" } },
          { trackingNumber: { contains: keyword, mode: "insensitive" } },
          { customer: { name: { contains: keyword, mode: "insensitive" } } },
          { product: { name: { contains: keyword, mode: "insensitive" } } }
        ];
      }
      if (clean(req.query.dateFrom) || clean(req.query.dateTo)) {
        where.createdAt = {};
        if (clean(req.query.dateFrom)) where.createdAt.gte = new Date(clean(req.query.dateFrom));
        if (clean(req.query.dateTo)) where.createdAt.lte = new Date(clean(req.query.dateTo));
      }
      const page = Math.max(Number(req.query.page) || 1, 1);
      const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 50, 1), 100);
      const rows = await (db as any).order.findMany({
        where,
        include: orderInclude(),
        orderBy: [{ updatedAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize
      });
      res.json(rows.map(serializeOrder));
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      const errors = validateOrderPayload(req.body);
      if (errors.length) return res.status(400).json({ message: "validation failed", errors });
      const customer = await findAccessibleCustomer(db, req.user!.id, clean(req.body.customerId));
      if (!customer) return res.status(404).json({ message: "customer not found" });
      if (clean(req.body.productId)) await assertAccessibleProduct(db, req.user!.id, clean(req.body.productId), customer.organizationId || null);
      if (clean(req.body.assignedTo)) await assertOrganizationUser(db, customer.organizationId, clean(req.body.assignedTo));
      const row = await (db as any).order.create({
        data: toOrderCreateData(req.body, {
          orderNo: await generateOrderNo(db, customer.organizationId || null, customer.ownerId),
          customer,
          userId: req.user!.id
        }),
        include: orderInclude()
      });
      await audit(db, req.user!.id, row.organizationId, "create", row.id, null, row, { operation: "manual_create", orderNo: row.orderNo });
      res.status(201).json({ ...serializeOrder(row), riskWarnings: riskWarningsForOrder(row, "create") });
    } catch (error) {
      next(error);
    }
  });

  router.get("/fulfillment-board", async (req, res, next) => {
    try {
      const organizationId = organizationIdFromRequest(req);
      const role = organizationId ? await getActiveOrganizationRole(db as any, organizationId, req.user!.id) : null;
      if (organizationId && !canReadOrganization(role)) return res.status(403).json({ message: "organization membership required" });
      const where: any = {
        ...orderScope(req.user!.id, organizationId || null, role),
        ...filterField(req.query.assignedTo, "assignedTo"),
        ...filterField(req.query.orderType, "orderType")
      };
      if (clean(req.query.dateFrom) || clean(req.query.dateTo)) {
        where.createdAt = {};
        if (clean(req.query.dateFrom)) where.createdAt.gte = new Date(clean(req.query.dateFrom));
        if (clean(req.query.dateTo)) where.createdAt.lte = new Date(clean(req.query.dateTo));
      }
      const orders = await (db as any).order.findMany({ where, include: orderInclude(), orderBy: [{ updatedAt: "desc" }], take: Math.min(Number(req.query.pageSize) || 100, 200) });
      const orderIds = orders.map((order: any) => order.id);
      const customerIds = [...new Set(orders.map((order: any) => order.customerId))];
      const alerts = await findAlertsForOrders(db, orderIds);
      const followUps = customerIds.length ? await db.followUpTask.findMany({ where: { customerId: { in: customerIds } } as any }) : [];
      const board = buildFulfillmentBoard(orders, alerts, followUps);
      const group = clean(req.query.group);
      const alertLevel = clean(req.query.alertLevel);
      if (group && board.groups[group]) board.groups = { [group]: board.groups[group] } as any;
      if (alertLevel) {
        for (const key of Object.keys(board.groups)) {
          board.groups[key] = board.groups[key].filter((item: any) => item.alerts.some((alert: any) => alert.level === alertLevel));
        }
      }
      res.json(board);
    } catch (error) {
      next(error);
    }
  });

  router.post("/recalculate-fulfillment-alerts", async (req, res, next) => {
    try {
      const organizationId = organizationIdFromRequest(req);
      const role = organizationId ? await getActiveOrganizationRole(db as any, organizationId, req.user!.id) : null;
      if (organizationId && !canWriteOrganizationResource(role)) return res.status(403).json({ message: "owner or manager role required" });
      if (!organizationId) return res.status(400).json({ message: "organizationId is required for batch recalculation" });
      const orders = await (db as any).order.findMany({ where: { organizationId }, include: orderInclude(), take: 500 });
      const result = { createdCount: 0, updatedCount: 0, resolvedCount: 0, skippedCount: 0 };
      for (const order of orders) {
        const followUps = await db.followUpTask.findMany({ where: { customerId: order.customerId } });
        const item = await syncFulfillmentAlerts(db, order, followUps);
        result.createdCount += item.createdCount;
        result.updatedCount += item.updatedCount;
        result.resolvedCount += item.resolvedCount;
      }
      await audit(db, req.user!.id, organizationId, "update", organizationId, null, result, { operation: "batch_recalculate_fulfillment_alerts" }, "medium");
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const row = await findAccessibleOrder(db, req.user!.id, req.params.id);
      if (!row) return res.status(404).json({ message: "order not found" });
      const followUps = await db.followUpTask.findMany({ where: { customerId: row.customerId }, orderBy: { remindAt: "desc" }, take: 20 });
      res.json({ ...serializeOrder(row), quote: row.quote || null, sampleOrder: row.sampleOrder || null, customRequest: row.customRequest || null, followUps });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id/fulfillment", async (req, res, next) => {
    try {
      const order = await findAccessibleOrder(db, req.user!.id, req.params.id);
      if (!order) return res.status(404).json({ message: "order not found" });
      const followUps = await db.followUpTask.findMany({ where: { customerId: order.customerId }, orderBy: { remindAt: "desc" } });
      const persistedAlerts = await findAlertsForOrders(db, [order.id]);
      const liveAlerts = calculateFulfillmentAlerts(order, followUps);
      const alerts = mergeAlertRows(persistedAlerts, liveAlerts).map(serializeFulfillmentAlert);
      res.json({
        order: { ...serializeOrder(order), quote: order.quote || null, sampleOrder: order.sampleOrder || null, customRequest: order.customRequest || null, followUps },
        customer: order.customer || null,
        product: order.product || null,
        alerts,
        timeline: fulfillmentTimeline(order),
        followUpTasks: followUps,
        recommendedActions: [recommendedActionFor(order, alerts)],
        riskWarnings: fulfillmentRiskWarnings(order, alerts)
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/recalculate-fulfillment-alerts", async (req, res, next) => {
    try {
      const order = await findAccessibleOrder(db, req.user!.id, req.params.id);
      if (!order) return res.status(404).json({ message: "order not found" });
      const followUps = await db.followUpTask.findMany({ where: { customerId: order.customerId } });
      const result = await syncFulfillmentAlerts(db, order, followUps);
      await audit(db, req.user!.id, order.organizationId, "update", order.id, null, result.alerts, { operation: "recalculate_fulfillment_alerts", orderId: order.id, orderNo: order.orderNo }, "medium");
      res.json({ ...result, alerts: result.alerts.map(serializeFulfillmentAlert) });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id", async (req, res, next) => {
    try {
      const errors = validateOrderPayload(req.body, { partial: true });
      if (errors.length) return res.status(400).json({ message: "validation failed", errors });
      const existing = await findAccessibleOrder(db, req.user!.id, req.params.id);
      if (!existing) return res.status(404).json({ message: "order not found" });
      if (clean(req.body.productId)) await assertAccessibleProduct(db, req.user!.id, clean(req.body.productId), existing.organizationId || null);
      if (clean(req.body.assignedTo)) await assertOrganizationUser(db, existing.organizationId, clean(req.body.assignedTo));
      const row = await (db as any).order.update({ where: { id: existing.id }, data: toOrderUpdateData(req.body), include: orderInclude() });
      await audit(db, req.user!.id, row.organizationId, "update", row.id, existing, row, { operation: "manual_update", orderNo: row.orderNo }, riskForStatusChange(existing, row));
      res.json({ ...serializeOrder(row), riskWarnings: riskWarningsForOrder(row, "update") });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", async (req, res, next) => {
    try {
      const existing = await findAccessibleOrder(db, req.user!.id, req.params.id);
      if (!existing) return res.status(404).json({ message: "order not found" });
      const role = existing.organizationId ? await getActiveOrganizationRole(db as any, existing.organizationId, req.user!.id) : null;
      if (existing.organizationId && !canWriteOrganizationResource(role)) return res.status(403).json({ message: "owner or manager role required" });
      const confirmError = requireConfirm(req, "order.deleteOwn");
      if (confirmError) return res.status(409).json(confirmError);
      await (db as any).order.delete({ where: { id: existing.id } });
      await audit(db, req.user!.id, existing.organizationId, "delete", existing.id, existing, null, { operation: "delete", orderNo: existing.orderNo, confirmed: true }, "high");
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.post("/from-quote/:quoteId", async (req, res, next) => {
    try {
      const quote = await findAccessibleQuote(db, req.user!.id, req.params.quoteId);
      if (!quote) return res.status(404).json({ message: "quote not found" });
      const amount = Number(quote.quantity) * Number(quote.unitPrice) + Number(quote.shippingCost || 0);
      const body = {
        customerId: quote.customerId,
        productId: quote.productId,
        orderType: "normal",
        title: `Order from quote ${quote.id}`,
        amount,
        currency: quote.currency,
        quantity: quote.quantity,
        paymentStatus: "unpaid",
        productionStatus: "not_started",
        shippingStatus: "pending",
        afterSalesStatus: "none",
        orderStatus: "pending_payment",
        notes: quote.quoteText
      };
      const row = await (db as any).order.create({
        data: { ...toOrderCreateData(body, { orderNo: await generateOrderNo(db, quote.customer.organizationId || null, quote.customer.ownerId), customer: quote.customer, userId: req.user!.id }), quoteId: quote.id },
        include: orderInclude()
      });
      await audit(db, req.user!.id, row.organizationId, "create", row.id, null, row, { operation: "from_quote", relatedQuoteId: quote.id, orderNo: row.orderNo }, "medium");
      res.status(201).json({ ...serializeOrder(row), riskWarnings: riskWarningsForOrder(row, "from_quote") });
    } catch (error) {
      next(error);
    }
  });

  router.post("/from-sample/:sampleOrderId", async (req, res, next) => {
    try {
      const sample = await findAccessibleSample(db, req.user!.id, req.params.sampleOrderId);
      if (!sample) return res.status(404).json({ message: "sample order not found" });
      const body = { customerId: sample.customerId, productId: sample.productId, orderType: "sample_to_bulk", title: `Bulk order from sample ${sample.sampleName}`, currency: sample.currency, notes: sample.notes, orderStatus: "draft" };
      const row = await (db as any).order.create({
        data: { ...toOrderCreateData(body, { orderNo: await generateOrderNo(db, sample.customer.organizationId || null, sample.customer.ownerId), customer: sample.customer, userId: req.user!.id }), sampleOrderId: sample.id },
        include: orderInclude()
      });
      await audit(db, req.user!.id, row.organizationId, "create", row.id, null, row, { operation: "from_sample", relatedSampleOrderId: sample.id, orderNo: row.orderNo }, "medium");
      res.status(201).json({ ...serializeOrder(row), riskWarnings: riskWarningsForOrder(row, "from_sample") });
    } catch (error) {
      next(error);
    }
  });

  router.post("/from-custom-request/:customRequestId", async (req, res, next) => {
    try {
      const custom = await findAccessibleCustomRequest(db, req.user!.id, req.params.customRequestId);
      if (!custom) return res.status(404).json({ message: "custom request not found" });
      const body = { customerId: custom.customerId, productId: custom.productId, orderType: "custom", title: `Custom order ${custom.requestType}`, quantity: custom.quantity, notes: custom.notes, orderStatus: "draft" };
      const row = await (db as any).order.create({
        data: { ...toOrderCreateData(body, { orderNo: await generateOrderNo(db, custom.customer.organizationId || null, custom.customer.ownerId), customer: custom.customer, userId: req.user!.id }), customRequestId: custom.id },
        include: orderInclude()
      });
      await audit(db, req.user!.id, row.organizationId, "create", row.id, null, row, { operation: "from_custom_request", relatedCustomRequestId: custom.id, orderNo: row.orderNo }, "medium");
      res.status(201).json({ ...serializeOrder(row), riskWarnings: riskWarningsForOrder(row, "from_custom") });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id/payment-status", (req, res, next) => updateStatus(req, res, next, db, "paymentStatus", clean(req.body.paymentStatus || req.body.status)));
  router.patch("/:id/production-status", (req, res, next) => updateStatus(req, res, next, db, "productionStatus", clean(req.body.productionStatus || req.body.status), clean(req.body.notes)));
  router.patch("/:id/shipping-status", (req, res, next) => updateStatus(req, res, next, db, "shippingStatus", clean(req.body.shippingStatus || req.body.status), clean(req.body.notes), { trackingNumber: clean(req.body.trackingNumber) || undefined }));
  router.patch("/:id/after-sales-status", (req, res, next) => updateStatus(req, res, next, db, "afterSalesStatus", clean(req.body.afterSalesStatus || req.body.status), clean(req.body.notes)));

  router.post("/:id/create-follow-up-task", async (req, res, next) => {
    try {
      const order = await findAccessibleOrder(db, req.user!.id, req.params.id);
      if (!order) return res.status(404).json({ message: "order not found" });
      const taskType = order.paymentStatus === "unpaid" ? "Payment reminder" : order.shippingStatus === "shipped" ? "Delivery follow-up" : order.productionStatus === "delayed" ? "Delay follow-up" : "Order follow-up";
      const remindAt = parseDate(req.body.remindAt) || tomorrow();
      const task = await db.followUpTask.create({
        data: {
          customerId: order.customerId,
          taskType,
          remindAt,
          recommendedScript: clean(req.body.recommendedScript) || defaultFollowUpScript(order),
          status: "pending",
          ownerId: order.assignedTo || order.ownerId
        }
      });
      await audit(db, req.user!.id, order.organizationId, "create", task.id, null, task, { operation: "order_create_follow_up_task", orderId: order.id, orderNo: order.orderNo }, "medium");
      res.status(201).json({ followUpTask: task, riskWarnings: ["Follow-up task was created by manual click only. No WhatsApp message was sent."] });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/create-fulfillment-follow-up", async (req, res, next) => {
    try {
      const order = await findAccessibleOrder(db, req.user!.id, req.params.id);
      if (!order) return res.status(404).json({ message: "order not found" });
      const alert = clean(req.body.alertId) ? await findAccessibleAlert(db, req.user!.id, clean(req.body.alertId)) : null;
      const taskType = clean(req.body.taskType) || taskTypeForOrder(order);
      const remindAt = parseDate(req.body.remindAt) || tomorrow();
      const task = await db.followUpTask.create({
        data: {
          customerId: order.customerId,
          orderId: order.id,
          taskType,
          remindAt,
          recommendedScript: clean(req.body.recommendedScript) || defaultFulfillmentFollowUpScript(order, taskType),
          status: "pending",
          ownerId: order.assignedTo || order.ownerId
        } as any
      });
      if (alert) await (db as any).orderFulfillmentAlert.update({ where: { id: alert.id }, data: { status: "task_created" } });
      await audit(db, req.user!.id, order.organizationId, "create", task.id, null, task, { operation: "create_fulfillment_follow_up", orderId: order.id, orderNo: order.orderNo, alertId: alert?.id || null }, "medium");
      res.status(201).json({ followUpTask: task, riskWarnings: ["Fulfillment follow-up task was created by manual click only. No WhatsApp message was sent."] });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export function createOrderAiRouter(db: OrderDb = prisma) {
  const router = Router();
  router.post("/order-script", async (req, res, next) => {
    try {
      const order = await findAccessibleOrder(db, req.user!.id, clean(req.body.orderId));
      if (!order) return res.status(404).json({ message: "order not found" });
      const lookup = await findKnowledgeForAi(db as any, {
        ownerId: order.customer.ownerId || req.user!.id,
        organizationId: order.organizationId || null,
        targetLanguage: clean(req.body.targetLanguage) || order.customer.language || "English",
        mode: "reply",
        keyword: [order.title, order.notes, order.orderStatus, order.paymentStatus, order.shippingStatus].filter(Boolean).join(" "),
        scenario: "follow_up" as any
      });
      const brandContext = clean(req.body.brandId)
        ? await resolveBrandContext(db as any, req.user!.id, {
            brandId: clean(req.body.brandId),
            customerId: order.customerId,
            productId: order.productId || null,
            scenario: clean(req.body.scenario) || "order_confirm"
          })
        : null;
      const generated = generateOrderScript(order, req.body, [...(brandContext?.knowledgeContext || []), ...(lookup.items as any[])]);
      if (brandContext?.riskWarnings?.length) {
        generated.riskWarnings = Array.from(new Set([...(generated.riskWarnings || []), ...brandContext.riskWarnings]));
      }
      if (brandContext?.knowledgeUsed?.length) {
        generated.knowledgeUsed = Array.from(new Set([...(brandContext.knowledgeUsed || []), ...(generated.knowledgeUsed || [])]));
      }
      const log = await (db as any).aiActionSuggestionLog?.create?.({
        data: {
          organizationId: order.organizationId || null,
          customerId: order.customerId,
          userId: req.user!.id,
          actionType: "order_script",
          scenario: clean(req.body.scenario) || "order_confirm",
          inputSnapshot: { orderId: order.id, orderNo: order.orderNo, scenario: clean(req.body.scenario) },
          outputSnapshot: generated,
          riskLevel: "medium",
          brandId: brandContext?.brand?.id || null,
          brandUsed: brandContext?.brandUsed || null,
          brandRulesUsed: brandContext?.brandRulesUsed || undefined
        }
      });
      const response = { ...generated, brandUsed: brandContext?.brandUsed || null, brandRulesUsed: brandContext?.brandRulesUsed || [], createdLogId: log?.id || null };
      await audit(db, req.user!.id, order.organizationId, "create", response.createdLogId || order.id, null, { actionType: "order_script", orderId: order.id }, { operation: "ai_order_script", orderId: order.id, orderNo: order.orderNo, brandId: brandContext?.brand?.id || null }, "medium");
      res.json(response);
    } catch (error) {
      next(error);
    }
  });
  router.post("/order-fulfillment-script", async (req, res, next) => {
    try {
      const order = await findAccessibleOrder(db, req.user!.id, clean(req.body.orderId));
      if (!order) return res.status(404).json({ message: "order not found" });
      const alert = clean(req.body.alertId) ? await findAccessibleAlert(db, req.user!.id, clean(req.body.alertId)) : null;
      const lookup = await findKnowledgeForAi(db as any, {
        ownerId: order.customer.ownerId || req.user!.id,
        organizationId: order.organizationId || null,
        targetLanguage: clean(req.body.targetLanguage) || order.customer.language || "English",
        mode: "reply",
        keyword: [order.title, order.notes, order.orderStatus, order.paymentStatus, order.shippingStatus, alert?.alertType].filter(Boolean).join(" "),
        scenario: "follow_up" as any
      });
      const brandContext = clean(req.body.brandId)
        ? await resolveBrandContext(db as any, req.user!.id, {
            brandId: clean(req.body.brandId),
            customerId: order.customerId,
            productId: order.productId || null,
            scenario: clean(req.body.scenario) || alert?.alertType || "delivery_follow_up"
          })
        : null;
      const generated = generateFulfillmentScript(order, req.body, [...(brandContext?.knowledgeContext || []), ...(lookup.items as any[])]);
      if (brandContext?.riskWarnings?.length) {
        generated.riskWarnings = Array.from(new Set([...(generated.riskWarnings || []), ...brandContext.riskWarnings]));
      }
      if (brandContext?.knowledgeUsed?.length) {
        generated.knowledgeUsed = Array.from(new Set([...(brandContext.knowledgeUsed || []), ...(generated.knowledgeUsed || [])]));
      }
      const log = await (db as any).aiActionSuggestionLog?.create?.({
        data: {
          organizationId: order.organizationId || null,
          customerId: order.customerId,
          userId: req.user!.id,
          actionType: "order_fulfillment_script",
          scenario: clean(req.body.scenario) || "delivery_follow_up",
          inputSnapshot: { orderId: order.id, orderNo: order.orderNo, alertId: alert?.id || null, scenario: clean(req.body.scenario) },
          outputSnapshot: generated,
          riskLevel: "medium",
          brandId: brandContext?.brand?.id || null,
          brandUsed: brandContext?.brandUsed || null,
          brandRulesUsed: brandContext?.brandRulesUsed || undefined
        }
      });
      const response = { ...generated, brandUsed: brandContext?.brandUsed || null, brandRulesUsed: brandContext?.brandRulesUsed || [], createdLogId: log?.id || null };
      await audit(db, req.user!.id, order.organizationId, "create", response.createdLogId || order.id, null, { actionType: "order_fulfillment_script", orderId: order.id }, { operation: "ai_order_fulfillment_script", orderId: order.id, orderNo: order.orderNo, alertId: alert?.id || null, brandId: brandContext?.brand?.id || null }, "medium");
      res.json(response);
    } catch (error) {
      next(error);
    }
  });
  return router;
}

export const ordersRouter = createOrdersRouter();
export const orderAiRouter = createOrderAiRouter();

export function createOrderFulfillmentAlertsRouter(db: OrderDb = prisma) {
  const router = Router();
  router.patch("/:id", async (req, res, next) => {
    try {
      const alert = await findAccessibleAlert(db, req.user!.id, req.params.id);
      if (!alert) return res.status(404).json({ message: "alert not found" });
      const status = clean(req.body.status);
      if (!["dismissed", "resolved", "task_created"].includes(status)) return res.status(400).json({ message: "status is invalid" });
      const row = await (db as any).orderFulfillmentAlert.update({ where: { id: alert.id }, data: { status } });
      await audit(db, req.user!.id, row.organizationId, "update", row.id, alert, row, { operation: "update_fulfillment_alert", alertType: row.alertType, oldStatus: alert.status, newStatus: status }, status === "resolved" ? "low" : "medium");
      res.json(serializeFulfillmentAlert(row));
    } catch (error) {
      next(error);
    }
  });
  return router;
}

export const orderFulfillmentAlertsRouter = createOrderFulfillmentAlertsRouter();

async function updateStatus(req: any, res: any, next: any, db: OrderDb, field: keyof typeof statusFields, value: string, note?: string, extraData: Record<string, unknown> = {}) {
  try {
    if (!statusFields[field].includes(value as never)) return res.status(400).json({ message: `${field} is invalid` });
    const existing = await findAccessibleOrder(db, req.user!.id, req.params.id);
    if (!existing) return res.status(404).json({ message: "order not found" });
    const data: any = { [field]: value, ...extraData };
    if (note) data.notes = [existing.notes, note].filter(Boolean).join("\n");
    if (field === "paymentStatus" && (value === "paid" || value === "deposit_paid")) data.orderStatus = "processing";
    if (field === "shippingStatus" && value === "shipped") data.orderStatus = "shipped";
    if (field === "shippingStatus" && value === "delivered") data.orderStatus = "completed";
    if ((field === "paymentStatus" || field === "productionStatus") && value === "cancelled") data.orderStatus = "cancelled";
    const row = await (db as any).order.update({ where: { id: existing.id }, data, include: orderInclude() });
    await audit(db, req.user!.id, row.organizationId, "update", row.id, existing, row, { operation: `${field}_update`, oldStatus: existing[field], newStatus: value, orderNo: row.orderNo }, statusRisk(field, value));
    res.json({ ...serializeOrder(row), riskWarnings: riskWarningsForOrder(row, "status") });
  } catch (error) {
    next(error);
  }
}

async function findAccessibleOrder(db: OrderDb, userId: string, id: string) {
  if (!id) return null;
  const row = await (db as any).order.findFirst({ where: { id }, include: orderInclude() });
  if (!row) return null;
  const role = row.organizationId ? await getActiveOrganizationRole(db as any, row.organizationId, userId) : null;
  if (canWriteOrganizationResource(role) || row.ownerId === userId || row.assignedTo === userId || row.customer?.ownerId === userId || row.customer?.assignedTo === userId || (row.customer?.collaborators || []).includes(userId)) return row;
  await recordSecurityAudit(db as any, { user: { id: userId }, socket: { remoteAddress: null }, header: () => null, originalUrl: "", url: "", method: "" } as any, { organizationId: row.organizationId || null, action: "permission_denied", entityType: "Order", entityId: id, riskLevel: "high", failureReason: "order access denied" });
  throw Object.assign(new Error("order access denied"), { status: 403 });
}

async function findAccessibleAlert(db: OrderDb, userId: string, id: string) {
  if (!id) return null;
  const row = await (db as any).orderFulfillmentAlert.findFirst({ where: { id }, include: { order: { include: orderInclude() } } });
  if (!row) return null;
  await findAccessibleOrder(db, userId, row.orderId);
  return row;
}

async function findAccessibleCustomer(db: OrderDb, userId: string, customerId: string) {
  if (!customerId) return null;
  const customer = await db.customer.findFirst({ where: { id: customerId } }) as any;
  if (!customer) return null;
  const role = customer.organizationId ? await getActiveOrganizationRole(db as any, customer.organizationId, userId) : null;
  if (canWriteOrganizationResource(role) || customer.ownerId === userId || customer.assignedTo === userId || (customer.collaborators || []).includes(userId)) return customer;
  throw Object.assign(new Error("customer access denied"), { status: 403 });
}

async function findAccessibleQuote(db: OrderDb, userId: string, quoteId: string) {
  const quote = await db.quote.findFirst({ where: { id: quoteId }, include: { customer: true, product: true } }) as any;
  if (!quote) return null;
  await findAccessibleCustomer(db, userId, quote.customerId);
  return quote;
}

async function findAccessibleSample(db: OrderDb, userId: string, sampleOrderId: string) {
  const sample = await db.sampleOrder.findFirst({ where: { id: sampleOrderId }, include: { customer: true, product: true } }) as any;
  if (!sample) return null;
  await findAccessibleCustomer(db, userId, sample.customerId);
  return sample;
}

async function findAccessibleCustomRequest(db: OrderDb, userId: string, customRequestId: string) {
  const custom = await db.customRequest.findFirst({ where: { id: customRequestId }, include: { customer: true, product: true } }) as any;
  if (!custom) return null;
  await findAccessibleCustomer(db, userId, custom.customerId);
  return custom;
}

async function assertAccessibleProduct(db: OrderDb, userId: string, productId: string, organizationId: string | null) {
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

async function assertOrganizationUser(db: OrderDb, organizationId: string | null, userId: string) {
  if (!organizationId || !userId) return;
  const member = await (db as any).organizationMember.findFirst({ where: { organizationId, userId, status: "active" } });
  if (!member) throw Object.assign(new Error("assigned user must be active organization member"), { status: 400 });
}

function orderScope(userId: string, organizationId: string | null, role: string | null) {
  if (organizationId) {
    if (canWriteOrganizationResource(role as any)) return { organizationId };
    return { organizationId, OR: [{ ownerId: userId }, { assignedTo: userId }, { customer: { OR: [{ ownerId: userId }, { assignedTo: userId }, { collaborators: { has: userId } }] } }] };
  }
  return { ownerId: userId };
}

async function generateOrderNo(db: OrderDb, organizationId: string | null, ownerId: string) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `ORD-${date}`;
  const where = organizationId ? { organizationId, orderNo: { startsWith: prefix } } : { ownerId, orderNo: { startsWith: prefix } };
  const count = await (db as any).order.count({ where }).catch(() => 0);
  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}

async function findAlertsForOrders(db: OrderDb, orderIds: string[]) {
  if (!orderIds.length || !(db as any).orderFulfillmentAlert) return [];
  return (db as any).orderFulfillmentAlert.findMany({ where: { orderId: { in: orderIds }, status: { in: ["open", "task_created"] } } });
}

async function syncFulfillmentAlerts(db: OrderDb, order: any, followUps: any[]) {
  const drafts = calculateFulfillmentAlerts(order, followUps);
  const existing = await findAlertsForOrders(db, [order.id]);
  const result = { createdCount: 0, updatedCount: 0, resolvedCount: 0, skippedCount: 0, alerts: [] as any[] };
  const activeTypes = new Set(drafts.map((alert) => alert.alertType));
  for (const draft of drafts) {
    const found = existing.find((alert: any) => alert.alertType === draft.alertType);
    if (found) {
      const row = await (db as any).orderFulfillmentAlert.update({ where: { id: found.id }, data: { level: draft.level, reason: draft.reason, recommendedAction: draft.recommendedAction, status: found.status === "resolved" || found.status === "dismissed" ? found.status : "open" } });
      result.updatedCount += 1;
      result.alerts.push(row);
    } else {
      const row = await (db as any).orderFulfillmentAlert.create({ data: draft });
      result.createdCount += 1;
      result.alerts.push(row);
    }
  }
  for (const alert of existing) {
    if (!activeTypes.has(alert.alertType) && alert.status === "open") {
      await (db as any).orderFulfillmentAlert.update({ where: { id: alert.id }, data: { status: "resolved" } });
      result.resolvedCount += 1;
    }
  }
  return result;
}

function mergeAlertRows(persisted: any[], live: any[]) {
  const map = new Map<string, any>();
  for (const alert of live) map.set(alert.alertType, alert);
  for (const alert of persisted) map.set(alert.alertType, { ...map.get(alert.alertType), ...alert });
  return [...map.values()];
}

function orderInclude() {
  return { customer: true, product: true, quote: true, sampleOrder: true, customRequest: true };
}

function filterField(value: unknown, field: string) {
  const cleaned = clean(value);
  return cleaned ? { [field]: cleaned } : {};
}

async function audit(db: OrderDb, userId: string, organizationId: string | null, action: "create" | "update" | "delete", entityId: string, before: unknown, after: unknown, metadata: Record<string, unknown>, riskLevel: "low" | "medium" | "high" = "low") {
  return writeAuditLog(db as any, { organizationId, userId, action, entityType: "Order", entityId, before, after, metadata, riskLevel });
}

function statusRisk(field: string, value: string): "low" | "medium" | "high" {
  if (field === "paymentStatus" && ["paid", "deposit_paid", "refunded"].includes(value)) return "high";
  if (field === "shippingStatus" && ["shipped", "delivered"].includes(value)) return "medium";
  if (field === "productionStatus" && value === "delayed") return "medium";
  if (field === "afterSalesStatus" && ["refunded", "processing"].includes(value)) return "medium";
  return "low";
}

function riskForStatusChange(before: any, after: any): "low" | "medium" | "high" {
  for (const field of Object.keys(statusFields)) {
    if (before[field] !== after[field]) return statusRisk(field, after[field]);
  }
  return "low";
}

function defaultFollowUpScript(order: any) {
  if (order.paymentStatus === "unpaid") return "Hi, may I confirm the payment arrangement for this order? This is only a draft; confirm payment method and account before sending.";
  if (order.shippingStatus === "shipped") return "Hi, just checking if the shipment has arrived safely. Please confirm the tracking details before sending.";
  if (order.productionStatus === "delayed") return "Hi, I will update you on the order timeline after confirming the real delay reason and revised schedule.";
  return "Hi, I am following up on your order. Please confirm price, inventory, timeline, shipping, payment, and after-sales details before sending.";
}

function taskTypeForOrder(order: any) {
  if (order.paymentStatus === "unpaid") return "payment_follow_up";
  if (order.productionStatus === "delayed") return "production_update";
  if (order.shippingStatus === "shipped") return "delivery_follow_up";
  if (["pending", "processing"].includes(order.afterSalesStatus)) return "after_sales_follow_up";
  return "order_fulfillment_follow_up";
}

function defaultFulfillmentFollowUpScript(order: any, taskType: string) {
  if (taskType === "payment_follow_up") return "Draft only: confirm payment status and receiving account before sending a payment follow-up.";
  if (taskType === "production_update") return "Draft only: confirm real production progress and expected ship date before updating the customer.";
  if (taskType === "shipping_notice") return "Draft only: confirm tracking number and logistics timing before sending shipping notice.";
  if (taskType === "delivery_follow_up") return "Draft only: ask whether the order arrived safely and confirm any after-sales policy before promising a solution.";
  if (taskType === "delay_explain") return "Draft only: confirm the real delay reason and revised date before explaining to the customer.";
  return `Draft only: follow up on order ${order.orderNo}. Confirm payment, production, shipping, and after-sales details before sending.`;
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
