import { Router } from "express";
import { prisma } from "./db.js";
import { writeAuditLog } from "./audit-log-utils.js";
import { hasPermission, requireConfirm } from "./permissions.js";
import { canReadOrganization, canWriteOrganizationResource, getActiveOrganizationRole, organizationIdFromRequest } from "./organization-permissions.js";
import { calculateOrderProfit, generateProfitReview, marginLevelFromSummary, toOrderCostData, validateOrderCostPayload } from "./profit-utils.js";

type ProfitDb = typeof prisma;

export function createProfitRouter(db: ProfitDb = prisma) {
  const router = Router();

  router.get("/orders/:id/cost", async (req, res, next) => {
    try {
      const order = await findAccessibleProfitOrder(db, req.user!.id, req.params.id, "view");
      if (!order) return res.status(404).json({ message: "order not found" });
      const cost = await (db as any).orderCost.findUnique({ where: { orderId: order.id } });
      res.json(calculateOrderProfit(order, cost));
    } catch (error) {
      next(error);
    }
  });

  router.put("/orders/:id/cost", async (req, res, next) => {
    try {
      const order = await findAccessibleProfitOrder(db, req.user!.id, req.params.id, "edit");
      if (!order) return res.status(404).json({ message: "order not found" });
      const errors = validateOrderCostPayload(req.body);
      if (errors.length) return res.status(400).json({ message: "validation failed", errors });
      const existing = await (db as any).orderCost.findUnique({ where: { orderId: order.id } });
      const data = toOrderCostData(req.body, order, req.user!.id);
      const row = existing
        ? await (db as any).orderCost.update({ where: { orderId: order.id }, data: { ...data, createdBy: existing.createdBy, costConfirmed: false, confirmedBy: null, confirmedAt: null } })
        : await (db as any).orderCost.create({ data });
      const summary = calculateOrderProfit(order, row);
      await audit(db, req.user!.id, order.organizationId, existing ? "update" : "create", row.id, existing, row, {
        operation: existing ? "update_order_cost" : "create_order_cost",
        orderId: order.id,
        orderNo: order.orderNo,
        grossProfit: summary.grossProfit,
        grossMargin: summary.grossMargin,
        costConfirmed: summary.costConfirmed
      }, summary.riskLevel);
      res.json(summary);
    } catch (error) {
      next(error);
    }
  });

  router.patch("/orders/:id/cost/confirm", async (req, res, next) => {
    try {
      const order = await findAccessibleProfitOrder(db, req.user!.id, req.params.id, "confirm");
      if (!order) return res.status(404).json({ message: "order not found" });
      const confirmError = requireConfirm(req, "profit.confirmCost");
      if (confirmError) return res.status(409).json(confirmError);
      const existing = await (db as any).orderCost.findUnique({ where: { orderId: order.id } });
      if (!existing) return res.status(404).json({ message: "order cost not found" });
      const row = await (db as any).orderCost.update({ where: { orderId: order.id }, data: { costConfirmed: true, confirmedBy: req.user!.id, confirmedAt: new Date() } });
      const summary = calculateOrderProfit(order, row);
      await audit(db, req.user!.id, order.organizationId, "update", row.id, existing, row, {
        operation: "confirm_order_cost",
        orderId: order.id,
        orderNo: order.orderNo,
        grossProfit: summary.grossProfit,
        grossMargin: summary.grossMargin,
        confirmed: true
      }, "medium");
      res.json(summary);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/orders/:id/cost", async (req, res, next) => {
    try {
      const order = await findAccessibleProfitOrder(db, req.user!.id, req.params.id, "delete");
      if (!order) return res.status(404).json({ message: "order not found" });
      const confirmError = requireConfirm(req, "profit.deleteCost");
      if (confirmError) return res.status(409).json(confirmError);
      const existing = await (db as any).orderCost.findUnique({ where: { orderId: order.id } });
      if (!existing) return res.status(404).json({ message: "order cost not found" });
      await (db as any).orderCost.delete({ where: { orderId: order.id } });
      await audit(db, req.user!.id, order.organizationId, "delete", existing.id, existing, null, {
        operation: "delete_order_cost",
        orderId: order.id,
        orderNo: order.orderNo,
        confirmed: true
      }, "high");
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.get("/profit/orders", async (req, res, next) => {
    try {
      const rows = await findProfitOrders(db, req.user!.id, req.query);
      const marginLevel = clean(req.query.marginLevel);
      const costConfirmed = clean(req.query.costConfirmed);
      const mapped = rows.map((order: any) => toProfitOrderRow(order, order.cost || null));
      res.json(mapped.filter((row: ReturnType<typeof toProfitOrderRow>) => (!marginLevel || row.marginLevel === marginLevel) && (!costConfirmed || String(row.costConfirmed) === costConfirmed)));
    } catch (error) {
      next(error);
    }
  });

  router.get("/profit/summary", async (req, res, next) => {
    try {
      const rows = await findProfitOrders(db, req.user!.id, req.query);
      res.json(buildProfitSummary(rows));
    } catch (error) {
      next(error);
    }
  });

  router.get("/profit/by-product", async (req, res, next) => {
    try {
      const rows = await findProfitOrders(db, req.user!.id, req.query);
      res.json(buildBreakdown(rows, (order) => order.productId || "unassigned", (order) => order.product?.name || "Unassigned product", (order) => order.product?.sku || null));
    } catch (error) {
      next(error);
    }
  });

  router.get("/profit/by-customer", async (req, res, next) => {
    try {
      const rows = await findProfitOrders(db, req.user!.id, req.query);
      res.json(buildBreakdown(rows, (order) => order.customerId, (order) => order.customer?.name || "Unknown customer", undefined, (order) => order.customer?.country || null));
    } catch (error) {
      next(error);
    }
  });

  router.get("/profit/by-salesperson", async (req, res, next) => {
    try {
      const organizationId = organizationIdFromRequest(req);
      if (organizationId) {
        const role = await getActiveOrganizationRole(db as any, organizationId, req.user!.id);
        if (!hasPermission(role, "profit.viewTeam")) return res.status(403).json({ message: "team profit permission required" });
      }
      const rows = await findProfitOrders(db, req.user!.id, req.query, { requireTeam: true });
      res.json(buildBreakdown(rows, (order) => order.assignedTo || order.ownerId, (order) => order.assignee?.name || order.owner?.name || "Unassigned salesperson"));
    } catch (error) {
      next(error);
    }
  });

  router.post("/ai/profit-review", async (req, res, next) => {
    try {
      const scope = clean(req.body.scope) || "order";
      const order = clean(req.body.orderId) ? await findAccessibleProfitOrder(db, req.user!.id, clean(req.body.orderId), "ai") : null;
      if (clean(req.body.orderId) && !order) return res.status(404).json({ message: "order not found" });
      const cost = order ? await (db as any).orderCost.findUnique({ where: { orderId: order.id } }) : null;
      const summary = order ? calculateOrderProfit(order, cost) : null;
      const generated = generateProfitReview({ scope, targetName: order?.orderNo || clean(req.body.productId) || clean(req.body.customerId) || "organization", summary });
      const log = await (db as any).aiActionSuggestionLog?.create?.({
        data: {
          organizationId: order?.organizationId || clean(req.body.organizationId) || null,
          customerId: order?.customerId || clean(req.body.customerId) || null,
          userId: req.user!.id,
          actionType: "profit_review",
          scenario: scope,
          inputSnapshot: { scope, orderId: order?.id || null, productId: clean(req.body.productId) || null, customerId: clean(req.body.customerId) || null },
          outputSnapshot: generated,
          riskLevel: "medium"
        }
      });
      const response = { ...generated, createdLogId: log?.id || null };
      await audit(db, req.user!.id, order?.organizationId || null, "create", response.createdLogId || order?.id || req.user!.id, null, { actionType: "profit_review", scope }, { operation: "ai_profit_review", scope, orderId: order?.id || null }, "medium");
      res.json(response);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export const profitRouter = createProfitRouter();

async function findAccessibleProfitOrder(db: ProfitDb, userId: string, orderId: string, action: "view" | "edit" | "confirm" | "delete" | "ai") {
  if (!orderId) return null;
  const order = await (db as any).order.findFirst({ where: { id: orderId }, include: orderInclude() });
  if (!order) return null;
  const role = order.organizationId ? await getActiveOrganizationRole(db as any, order.organizationId, userId) : null;
  if (role === "support") throw Object.assign(new Error("profit data is not available for support role"), { status: 403 });
  const isOwn = order.ownerId === userId || order.assignedTo === userId || order.createdBy === userId || order.customer?.ownerId === userId || order.customer?.assignedTo === userId || (order.customer?.collaborators || []).includes(userId);
  if (!order.organizationId) {
    if (isOwn) return order;
    throw Object.assign(new Error("order access denied"), { status: 403 });
  }
  if (!canReadOrganization(role)) throw Object.assign(new Error("organization membership required"), { status: 403 });
  if (action === "view" || action === "ai") {
    if (hasPermission(role as any, "profit.viewTeam") || (hasPermission(role as any, "profit.viewOwn") && isOwn)) return order;
  }
  if (action === "edit" && hasPermission(role as any, "profit.editCost")) return order;
  if (action === "confirm" && hasPermission(role as any, "profit.confirmCost")) return order;
  if (action === "delete" && hasPermission(role as any, "profit.deleteCost")) return order;
  throw Object.assign(new Error("profit permission denied"), { status: 403 });
}

async function findProfitOrders(db: ProfitDb, userId: string, query: any, options: { requireTeam?: boolean } = {}) {
  const organizationId = organizationIdFromPlain(query);
  const role = organizationId ? await getActiveOrganizationRole(db as any, organizationId, userId) : null;
  if (organizationId && !canReadOrganization(role)) throw Object.assign(new Error("organization membership required"), { status: 403 });
  if (role === "support") throw Object.assign(new Error("profit data is not available for support role"), { status: 403 });
  if (options.requireTeam && organizationId && !hasPermission(role as any, "profit.viewTeam")) throw Object.assign(new Error("team profit permission required"), { status: 403 });
  const scope = organizationId
    ? hasPermission(role as any, "profit.viewTeam")
      ? { organizationId }
      : { organizationId, OR: [{ ownerId: userId }, { assignedTo: userId }, { createdBy: userId }, { customer: { OR: [{ ownerId: userId }, { assignedTo: userId }, { collaborators: { has: userId } }] } }] }
    : { ownerId: userId };
  const where: any = {
    ...scope,
    ...filterField(query.assignedTo, "assignedTo"),
    ...filterField(query.customerId, "customerId"),
    ...filterField(query.productId, "productId"),
    ...filterField(query.currency, "currency")
  };
  const country = clean(query.country);
  if (country) where.customer = { ...(where.customer || {}), country };
  if (clean(query.dateFrom) || clean(query.dateTo)) {
    where.createdAt = {};
    if (clean(query.dateFrom)) where.createdAt.gte = new Date(clean(query.dateFrom));
    if (clean(query.dateTo)) where.createdAt.lte = new Date(clean(query.dateTo));
  }
  return (db as any).order.findMany({
    where,
    include: orderInclude(),
    orderBy: [{ updatedAt: "desc" }],
    skip: (Math.max(Number(query.page) || 1, 1) - 1) * Math.min(Math.max(Number(query.pageSize) || 50, 1), 200),
    take: Math.min(Math.max(Number(query.pageSize) || 50, 1), 200)
  });
}

function toProfitOrderRow(order: any, cost: any) {
  const summary = calculateOrderProfit(order, cost);
  return {
    orderId: order.id,
    orderNo: order.orderNo,
    customerName: order.customer?.name || null,
    productName: order.product?.name || null,
    assignedTo: order.assignedTo || null,
    revenue: summary.revenue,
    currency: summary.currency,
    totalCost: summary.totalCost,
    grossProfit: summary.grossProfit,
    grossMargin: summary.grossMargin,
    marginLevel: marginLevelFromSummary(summary),
    costConfirmed: summary.costConfirmed,
    riskLevel: summary.riskLevel,
    createdAt: toIso(order.createdAt) || ""
  };
}

function buildProfitSummary(orders: any[]) {
  const byCurrency: Record<string, { revenue: number; totalCost: number; grossProfit: number; orderCount: number }> = {};
  let totalRevenue = 0;
  let totalCost = 0;
  let orderCount = 0;
  let lossOrderCount = 0;
  let lowMarginOrderCount = 0;
  let unconfirmedCostCount = 0;
  for (const order of orders) {
    const summary = calculateOrderProfit(order, order.cost || null);
    const revenue = Number(summary.revenue || 0);
    const cost = Number(summary.totalCost || 0);
    const profit = Number(summary.grossProfit || 0);
    const currency = summary.currency || "UNKNOWN";
    byCurrency[currency] ||= { revenue: 0, totalCost: 0, grossProfit: 0, orderCount: 0 };
    byCurrency[currency].revenue += revenue;
    byCurrency[currency].totalCost += cost;
    byCurrency[currency].grossProfit += profit;
    byCurrency[currency].orderCount += 1;
    totalRevenue += revenue;
    totalCost += cost;
    orderCount += 1;
    if (summary.marginLevel === "loss") lossOrderCount += 1;
    if (summary.marginLevel === "low") lowMarginOrderCount += 1;
    if (!summary.costConfirmed) unconfirmedCostCount += 1;
  }
  const totalGrossProfit = totalRevenue - totalCost;
  const avgGrossMargin = totalRevenue > 0 ? ((totalGrossProfit / totalRevenue) * 100).toFixed(2) : null;
  return {
    totalRevenue: money(totalRevenue),
    totalCost: money(totalCost),
    totalGrossProfit: money(totalGrossProfit),
    avgGrossMargin,
    orderCount,
    lossOrderCount,
    lowMarginOrderCount,
    unconfirmedCostCount,
    byCurrency: Object.fromEntries(Object.entries(byCurrency).map(([key, value]) => [key, { revenue: money(value.revenue), totalCost: money(value.totalCost), grossProfit: money(value.grossProfit), orderCount: value.orderCount }])),
    riskWarnings: ["Profit summary is for operational review only. Currency conversion is not performed across currencies."]
  };
}

function buildBreakdown(orders: any[], idFor: (order: any) => string, nameFor: (order: any) => string, skuFor?: (order: any) => string | null, countryFor?: (order: any) => string | null) {
  const map = new Map<string, any>();
  for (const order of orders) {
    const id = idFor(order);
    const summary = calculateOrderProfit(order, order.cost || null);
    const item = map.get(id) || { id, name: nameFor(order), sku: skuFor?.(order) || null, country: countryFor?.(order) || null, orderCount: 0, revenue: 0, totalCost: 0, grossProfit: 0 };
    item.orderCount += 1;
    item.revenue += Number(summary.revenue || 0);
    item.totalCost += Number(summary.totalCost || 0);
    item.grossProfit += Number(summary.grossProfit || 0);
    map.set(id, item);
  }
  return [...map.values()].map((item) => ({
    ...item,
    revenue: money(item.revenue),
    totalCost: money(item.totalCost),
    grossProfit: money(item.grossProfit),
    grossMargin: item.revenue > 0 ? ((item.grossProfit / item.revenue) * 100).toFixed(2) : null
  }));
}

function orderInclude() {
  return { customer: true, product: true, cost: true, owner: true, assignee: true };
}

function filterField(value: unknown, field: string) {
  const cleaned = clean(value);
  return cleaned ? { [field]: cleaned } : {};
}

function organizationIdFromPlain(query: any) {
  return clean(query.organizationId);
}

async function audit(db: ProfitDb, userId: string, organizationId: string | null, action: "create" | "update" | "delete", entityId: string, before: unknown, after: unknown, metadata: Record<string, unknown>, riskLevel: "low" | "medium" | "high" = "low") {
  return writeAuditLog(db as any, { organizationId, userId, action, entityType: "OrderCost", entityId, before, after, metadata, riskLevel });
}

function clean(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function money(value: number) {
  return value.toFixed(2);
}

function toIso(value: unknown) {
  return value instanceof Date ? value.toISOString() : value ? String(value) : null;
}
