import {
  ORDER_FULFILLMENT_GROUPS,
  type OrderFulfillmentAlertStatus,
  type OrderFulfillmentAlertType,
  type OrderFulfillmentGroup,
  type OrderFulfillmentScriptRequest
} from "@wa-ai/shared";
import { buildKnowledgeContext } from "./knowledge-base-service.js";
import type { KnowledgeContextItem } from "./knowledge-base-utils.js";
import { serializeOrder } from "./order-utils.js";

const draftWarning = "Fulfillment messages are drafts only. Confirm payment, production, shipping, tracking, delivery timing, and after-sales policy before manually sending.";

export type FulfillmentAlertDraft = {
  organizationId?: string | null;
  orderId: string;
  customerId: string;
  alertType: OrderFulfillmentAlertType | string;
  level: "low" | "medium" | "high";
  reason: string;
  recommendedAction: string;
  status: OrderFulfillmentAlertStatus | string;
  ownerId: string;
};

export function getFulfillmentGroup(order: any): OrderFulfillmentGroup {
  if (order.orderStatus === "cancelled") return "cancelled";
  if (order.orderStatus === "completed") return "completed";
  if (["pending", "processing"].includes(order.afterSalesStatus)) return "after_sales_pending";
  if (isProductionDelayed(order)) return "production_delayed";
  if (isShippingDelayed(order)) return "shipping_delayed";
  if (order.paymentStatus === "unpaid" || order.orderStatus === "pending_payment") return "pending_payment";
  if (order.paymentStatus === "deposit_paid" && ["not_started", "preparing"].includes(order.productionStatus)) return "deposit_paid";
  if (order.productionStatus === "in_production") return "in_production";
  if (order.productionStatus === "completed" && ["pending", "ready_to_ship"].includes(order.shippingStatus)) return "pending_shipment";
  if (order.shippingStatus === "shipped") return "shipped_not_delivered";
  if (order.shippingStatus === "delivered" && ["none", "closed"].includes(order.afterSalesStatus)) return "delivered_follow_up";
  return "pending_payment";
}

export function calculateFulfillmentAlerts(order: any, followUps: any[] = [], now = new Date()): FulfillmentAlertDraft[] {
  const alerts: FulfillmentAlertDraft[] = [];
  const ownerId = order.assignedTo || order.ownerId;
  const base = {
    organizationId: order.organizationId || null,
    orderId: order.id,
    customerId: order.customerId,
    ownerId,
    status: "open"
  };

  const createdDays = daysBetween(order.createdAt, now);
  if ((order.orderStatus === "pending_payment" || order.paymentStatus === "unpaid") && createdDays > 3) {
    alerts.push({
      ...base,
      alertType: "payment_overdue",
      level: createdDays > 7 ? "high" : "medium",
      reason: `Payment has not been marked as received for ${createdDays} days.`,
      recommendedAction: "Confirm payment status and send a manual payment follow-up draft."
    });
  }

  const shipDelayDays = overdueDays(order.expectedShipDate, now);
  if (shipDelayDays > 0 && !["completed", "cancelled"].includes(order.productionStatus)) {
    alerts.push({
      ...base,
      alertType: "production_delayed",
      level: shipDelayDays > 7 ? "high" : "medium",
      reason: `Expected ship date is overdue by ${shipDelayDays} day(s).`,
      recommendedAction: "Confirm the real production delay reason and updated ship date before messaging the customer."
    });
  }

  const deliveryDelayDays = overdueDays(order.expectedDeliveryDate, now);
  if (deliveryDelayDays > 0 && !["delivered", "cancelled"].includes(order.shippingStatus)) {
    alerts.push({
      ...base,
      alertType: "shipping_delayed",
      level: deliveryDelayDays > 7 ? "high" : "medium",
      reason: `Expected delivery date is overdue by ${deliveryDelayDays} day(s).`,
      recommendedAction: "Confirm tracking and logistics timing before explaining the delay to the customer."
    });
  }

  if (order.shippingStatus === "shipped" && !order.trackingNumber) {
    alerts.push({
      ...base,
      alertType: "missing_tracking_number",
      level: "medium",
      reason: "Order is marked as shipped but tracking number is missing.",
      recommendedAction: "Add or confirm the tracking number before sending a shipping notice."
    });
  }

  const afterSalesDays = daysBetween(order.updatedAt || order.createdAt, now);
  if (["pending", "processing"].includes(order.afterSalesStatus) && afterSalesDays > 3) {
    alerts.push({
      ...base,
      alertType: "after_sales_pending",
      level: afterSalesDays > 7 ? "high" : "medium",
      reason: `After-sales issue has been pending for ${afterSalesDays} days.`,
      recommendedAction: "Confirm the after-sales policy and next handling step before replying."
    });
  }

  if (order.shippingStatus === "delivered" && order.afterSalesStatus === "none" && !hasOrderFollowUp(followUps, order.id, "delivery")) {
    alerts.push({
      ...base,
      alertType: "delivery_follow_up",
      level: "low",
      reason: "Order is delivered and no delivery follow-up task was found.",
      recommendedAction: "Ask whether the customer received the goods safely and prepare a reorder follow-up."
    });
  }

  if (!["completed", "cancelled"].includes(order.orderStatus) && !hasRecentFollowUp(followUps, order.customerId, now)) {
    alerts.push({
      ...base,
      alertType: "order_no_follow_up",
      level: "low",
      reason: "No recent follow-up was found for this active order.",
      recommendedAction: "Create a manual fulfillment follow-up task."
    });
  }

  return alerts;
}

export function buildFulfillmentBoard(orders: any[], alertRows: any[] = [], followUps: any[] = []) {
  const groups: Record<string, any[]> = Object.fromEntries(ORDER_FULFILLMENT_GROUPS.map((group: string) => [group, []]));
  const summary: Record<string, number> = {
    pendingPaymentCount: 0,
    depositPaidCount: 0,
    inProductionCount: 0,
    productionDelayedCount: 0,
    pendingShipmentCount: 0,
    shippedNotDeliveredCount: 0,
    shippingDelayedCount: 0,
    deliveredFollowUpCount: 0,
    afterSalesPendingCount: 0,
    completedCount: 0,
    cancelledCount: 0
  };

  for (const order of orders) {
    const persistedAlerts = alertRows.filter((alert) => alert.orderId === order.id && alert.status !== "resolved" && alert.status !== "dismissed");
    const liveAlerts = calculateFulfillmentAlerts(order, followUps.filter((task) => task.customerId === order.customerId));
    const mergedAlerts = mergeAlerts(persistedAlerts, liveAlerts);
    const fulfillmentGroup = getFulfillmentGroup(order);
    const item = {
      ...serializeOrder(order),
      alerts: mergedAlerts.map(serializeFulfillmentAlert),
      fulfillmentGroup,
      recommendedAction: recommendedActionFor(order, mergedAlerts)
    };
    groups[fulfillmentGroup].push(item);
    incrementSummary(summary, fulfillmentGroup);
  }

  return { summary, groups };
}

export function serializeFulfillmentAlert(alert: any) {
  return {
    id: alert.id || undefined,
    organizationId: alert.organizationId || null,
    orderId: alert.orderId,
    customerId: alert.customerId,
    alertType: alert.alertType,
    level: alert.level,
    reason: alert.reason || null,
    recommendedAction: alert.recommendedAction || null,
    status: alert.status || "open",
    ownerId: alert.ownerId,
    createdAt: toIso(alert.createdAt),
    updatedAt: toIso(alert.updatedAt)
  };
}

export function fulfillmentTimeline(order: any) {
  return [
    { label: "Order", value: order.orderNo, status: order.orderStatus },
    { label: "Payment", value: order.currency && order.amount ? `${order.currency} ${order.amount}` : null, status: order.paymentStatus },
    { label: "Production", value: toIso(order.expectedShipDate), status: order.productionStatus },
    { label: "Shipping", value: order.trackingNumber || toIso(order.expectedDeliveryDate), status: order.shippingStatus },
    { label: "After-sales", value: null, status: order.afterSalesStatus }
  ];
}

export function fulfillmentRiskWarnings(order: any, alerts: any[] = []) {
  const warnings = [draftWarning];
  if (order.paymentStatus === "paid" || order.paymentStatus === "deposit_paid") warnings.push("Confirm actual payment receipt before sending payment-related messages.");
  if (order.shippingStatus === "shipped" && !order.trackingNumber) warnings.push("Tracking number is missing. Confirm logistics details before notifying the customer.");
  if (alerts.some((alert) => alert.alertType === "production_delayed")) warnings.push("Production delay messages require a real delay reason and revised date.");
  if (alerts.some((alert) => alert.alertType === "shipping_delayed")) warnings.push("Shipping delay messages require confirmed tracking and logistics timing.");
  if (["pending", "processing"].includes(order.afterSalesStatus)) warnings.push("Confirm company after-sales policy before promising refund, return, or replacement.");
  return warnings;
}

export function generateFulfillmentScript(order: any, body: OrderFulfillmentScriptRequest, knowledgeItems: KnowledgeContextItem[] = []) {
  const scenario = clean(body.scenario) || "delivery_follow_up";
  const customerName = order.customer?.name || "there";
  const orderNo = order.orderNo || "[order number]";
  const product = order.product?.name || order.title || "the order";
  const scripts: Record<string, string> = {
    payment_follow_up: `Hi ${customerName}, may I confirm whether you have arranged payment for order ${orderNo}? I will verify the payment method and receiving account before sending final details.`,
    production_update: `Hi ${customerName}, here is a draft production update for order ${orderNo} (${product}). I will confirm the real production progress and expected ship date before sending.`,
    production_delay_explain: `Hi ${customerName}, I am checking the production timeline for order ${orderNo}. I will confirm the real delay reason and revised ship date before giving you an update.`,
    shipping_notice: `Hi ${customerName}, your order ${orderNo} is prepared for shipping. Tracking reference: ${order.trackingNumber || "[please confirm tracking number]"}. I will confirm carrier and timing before sending.`,
    shipping_delay_explain: `Hi ${customerName}, I am checking the logistics status for order ${orderNo}. I will confirm the real tracking update and revised delivery timing before sending you a clear explanation.`,
    delivery_follow_up: `Hi ${customerName}, may I confirm whether order ${orderNo} arrived safely? Please let me know if everything looks good or if you need after-sales support.`,
    after_sales_follow_up: `Hi ${customerName}, I am following up on the after-sales handling for order ${orderNo}. I will confirm our policy and the next solution before making any commitment.`,
    reorder_after_delivery: `Hi ${customerName}, I hope order ${orderNo} arrived well. If you need a reorder or want to adjust quantity, I can prepare a draft quotation after confirming price, stock, and lead time.`
  };
  const knowledge = buildKnowledgeContext(knowledgeItems);
  const riskWarnings = fulfillmentRiskWarnings(order);
  if (!knowledge.knowledgeContext.trim()) riskWarnings.push("No related knowledge base content found. Confirm logistics, payment, and after-sales policy before sending.");
  return {
    scriptText: scripts[scenario] || scripts.delivery_follow_up,
    alternativeScripts: [
      "Short draft: I am checking this order status and will confirm the real details before updating you.",
      "Professional draft: I will verify payment, production, logistics, and after-sales details internally before sending the final update."
    ],
    riskWarnings,
    missingInfo: missingInfoFor(order, scenario),
    knowledgeUsed: knowledge.knowledgeUsed
  };
}

export function recommendedActionFor(order: any, alerts: any[] = []) {
  const high = alerts.find((alert) => alert.level === "high") || alerts[0];
  if (high?.recommendedAction) return high.recommendedAction;
  if (order.paymentStatus === "unpaid") return "Confirm payment status and prepare a manual follow-up.";
  if (order.productionStatus === "delayed") return "Confirm delay reason and new expected ship date.";
  if (order.shippingStatus === "shipped") return "Confirm tracking and prepare delivery follow-up.";
  if (order.shippingStatus === "delivered") return "Confirm delivery experience and consider reorder follow-up.";
  return "Review fulfillment status and create a manual follow-up if needed.";
}

function mergeAlerts(persisted: any[], live: FulfillmentAlertDraft[]) {
  const map = new Map<string, any>();
  for (const alert of live) map.set(alert.alertType, alert);
  for (const alert of persisted) map.set(alert.alertType, { ...map.get(alert.alertType), ...alert });
  return [...map.values()];
}

function incrementSummary(summary: Record<string, number>, group: string) {
  const mapping: Record<string, string> = {
    pending_payment: "pendingPaymentCount",
    deposit_paid: "depositPaidCount",
    in_production: "inProductionCount",
    production_delayed: "productionDelayedCount",
    pending_shipment: "pendingShipmentCount",
    shipped_not_delivered: "shippedNotDeliveredCount",
    shipping_delayed: "shippingDelayedCount",
    delivered_follow_up: "deliveredFollowUpCount",
    after_sales_pending: "afterSalesPendingCount",
    completed: "completedCount",
    cancelled: "cancelledCount"
  };
  summary[mapping[group]] += 1;
}

function isProductionDelayed(order: any) {
  return overdueDays(order.expectedShipDate, new Date()) > 0 && !["completed", "cancelled"].includes(order.productionStatus);
}

function isShippingDelayed(order: any) {
  return overdueDays(order.expectedDeliveryDate, new Date()) > 0 && !["delivered", "cancelled"].includes(order.shippingStatus);
}

function hasOrderFollowUp(followUps: any[], orderId: string, keyword: string) {
  return followUps.some((task) => (task.orderId === orderId || !task.orderId) && String(task.taskType || "").toLowerCase().includes(keyword));
}

function hasRecentFollowUp(followUps: any[], customerId: string, now: Date) {
  return followUps.some((task) => task.customerId === customerId && daysBetween(task.completedAt || task.createdAt || task.remindAt, now) <= 7);
}

function missingInfoFor(order: any, scenario: string) {
  return [
    ["payment_follow_up", !order.paymentStatus || order.paymentStatus === "unpaid" ? "confirmed payment status" : ""],
    ["shipping_notice", !order.trackingNumber ? "tracking number" : ""],
    ["shipping_delay_explain", !order.expectedDeliveryDate ? "confirmed revised delivery date" : ""],
    ["production_delay_explain", !order.expectedShipDate ? "confirmed revised ship date" : ""],
    ["after_sales_follow_up", ["none", ""].includes(order.afterSalesStatus || "") ? "after-sales policy" : ""]
  ].filter(([target, value]) => target === scenario && value).map(([, value]) => value as string);
}

function overdueDays(value: unknown, now: Date) {
  const date = parseDate(value);
  if (!date || date.getTime() >= startOfDay(now).getTime()) return 0;
  return Math.max(daysBetween(date, now), 1);
}

function daysBetween(value: unknown, now: Date) {
  const date = parseDate(value);
  if (!date) return 0;
  return Math.floor((startOfDay(now).getTime() - startOfDay(date).getTime()) / 86_400_000);
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function parseDate(value: unknown) {
  if (value instanceof Date) return value;
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) return new Date(value);
  return null;
}

function toIso(value: unknown) {
  return value instanceof Date ? value.toISOString() : value ? String(value) : null;
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
