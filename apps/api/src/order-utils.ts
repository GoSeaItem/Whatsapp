import {
  ORDER_AFTER_SALES_STATUSES,
  ORDER_PAYMENT_STATUSES,
  ORDER_PRODUCTION_STATUSES,
  ORDER_SCRIPT_SCENARIOS,
  ORDER_SHIPPING_STATUSES,
  ORDER_STATUSES,
  ORDER_TYPES,
  type OrderScriptRequest
} from "@wa-ai/shared";
import { buildKnowledgeContext } from "./knowledge-base-service.js";
import type { KnowledgeContextItem } from "./knowledge-base-utils.js";

const draftWarning = "Order messages are drafts only. Confirm payment, production, shipping, after-sales policy, price, inventory, and lead time before manually sending.";

export function serializeOrder(row: any) {
  return {
    id: row.id,
    organizationId: row.organizationId || null,
    customerId: row.customerId,
    customerName: row.customer?.name || null,
    productId: row.productId || null,
    productName: row.product?.name || null,
    quoteId: row.quoteId || null,
    sampleOrderId: row.sampleOrderId || null,
    customRequestId: row.customRequestId || null,
    orderNo: row.orderNo,
    orderType: row.orderType,
    title: row.title || null,
    amount: decimalToString(row.amount),
    currency: row.currency || null,
    quantity: row.quantity ?? null,
    paymentStatus: row.paymentStatus,
    productionStatus: row.productionStatus,
    shippingStatus: row.shippingStatus,
    afterSalesStatus: row.afterSalesStatus,
    orderStatus: row.orderStatus,
    expectedShipDate: toIso(row.expectedShipDate),
    expectedDeliveryDate: toIso(row.expectedDeliveryDate),
    trackingNumber: row.trackingNumber || null,
    notes: row.notes || null,
    files: Array.isArray(row.files) ? row.files : [],
    ownerId: row.ownerId,
    assignedTo: row.assignedTo || null,
    createdBy: row.createdBy,
    createdAt: toIso(row.createdAt) || "",
    updatedAt: toIso(row.updatedAt) || ""
  };
}

export function validateOrderPayload(body: any, options: { partial?: boolean } = {}) {
  const errors: Array<{ field: string; message: string }> = [];
  if (!options.partial && !clean(body?.customerId)) errors.push({ field: "customerId", message: "customerId is required" });
  if (body?.orderType !== undefined && !ORDER_TYPES.includes(clean(body.orderType) as any)) errors.push({ field: "orderType", message: "orderType is invalid" });
  if (body?.paymentStatus !== undefined && !ORDER_PAYMENT_STATUSES.includes(clean(body.paymentStatus) as any)) errors.push({ field: "paymentStatus", message: "paymentStatus is invalid" });
  if (body?.productionStatus !== undefined && !ORDER_PRODUCTION_STATUSES.includes(clean(body.productionStatus) as any)) errors.push({ field: "productionStatus", message: "productionStatus is invalid" });
  if (body?.shippingStatus !== undefined && !ORDER_SHIPPING_STATUSES.includes(clean(body.shippingStatus) as any)) errors.push({ field: "shippingStatus", message: "shippingStatus is invalid" });
  if (body?.afterSalesStatus !== undefined && !ORDER_AFTER_SALES_STATUSES.includes(clean(body.afterSalesStatus) as any)) errors.push({ field: "afterSalesStatus", message: "afterSalesStatus is invalid" });
  if (body?.orderStatus !== undefined && !ORDER_STATUSES.includes(clean(body.orderStatus) as any)) errors.push({ field: "orderStatus", message: "orderStatus is invalid" });
  if (body?.amount !== undefined && body.amount !== null && body.amount !== "" && Number.isNaN(Number(body.amount))) errors.push({ field: "amount", message: "amount must be a number" });
  if (body?.quantity !== undefined && body.quantity !== null && body.quantity !== "" && (!Number.isInteger(Number(body.quantity)) || Number(body.quantity) < 0)) errors.push({ field: "quantity", message: "quantity must be a positive integer" });
  for (const field of ["expectedShipDate", "expectedDeliveryDate"] as const) {
    if (body?.[field] && Number.isNaN(Date.parse(body[field]))) errors.push({ field, message: `${field} must be a valid date` });
  }
  if (body?.files && (!Array.isArray(body.files) || body.files.some((item: unknown) => typeof item !== "string"))) errors.push({ field: "files", message: "files must be URL string array" });
  return errors;
}

export function toOrderCreateData(body: any, context: { orderNo: string; customer: any; userId: string }) {
  return {
    organizationId: context.customer.organizationId || null,
    customerId: context.customer.id,
    orderNo: context.orderNo,
    orderType: clean(body.orderType) || "normal",
    title: clean(body.title) || null,
    amount: decimalValue(body.amount),
    currency: clean(body.currency) || "USD",
    quantity: intValue(body.quantity),
    productId: clean(body.productId) || null,
    paymentStatus: clean(body.paymentStatus) || "unpaid",
    productionStatus: clean(body.productionStatus) || "not_started",
    shippingStatus: clean(body.shippingStatus) || "pending",
    afterSalesStatus: clean(body.afterSalesStatus) || "none",
    orderStatus: clean(body.orderStatus) || inferOrderStatus(body),
    expectedShipDate: dateValue(body.expectedShipDate),
    expectedDeliveryDate: dateValue(body.expectedDeliveryDate),
    trackingNumber: clean(body.trackingNumber) || null,
    notes: clean(body.notes) || null,
    files: Array.isArray(body.files) ? body.files.filter(Boolean) : [],
    ownerId: context.customer.ownerId,
    assignedTo: clean(body.assignedTo) || context.customer.assignedTo || null,
    createdBy: context.userId
  };
}

export function toOrderUpdateData(body: any) {
  const data: Record<string, unknown> = {};
  for (const field of ["title", "currency", "paymentStatus", "productionStatus", "shippingStatus", "afterSalesStatus", "orderStatus", "trackingNumber", "notes", "assignedTo"] as const) {
    if (body[field] !== undefined) data[field] = clean(body[field]) || null;
  }
  if (body.amount !== undefined) data.amount = decimalValue(body.amount);
  if (body.quantity !== undefined) data.quantity = intValue(body.quantity);
  if (body.expectedShipDate !== undefined) data.expectedShipDate = dateValue(body.expectedShipDate);
  if (body.expectedDeliveryDate !== undefined) data.expectedDeliveryDate = dateValue(body.expectedDeliveryDate);
  if (body.files !== undefined) data.files = Array.isArray(body.files) ? body.files.filter(Boolean) : [];
  if (body.productId !== undefined) data.productId = clean(body.productId) || null;
  return data;
}

export function riskWarningsForOrder(order: any, action = "order") {
  const warnings = [draftWarning];
  if (action === "from_quote") warnings.push("Quote-to-order is a draft business record. Confirm price, shipping cost, inventory, lead time, and customer approval before proceeding.");
  if (action === "from_sample") warnings.push("Sample-to-bulk order does not infer bulk quantity or amount. Confirm quantity, price, lead time, inventory, and payment terms.");
  if (action === "from_custom") warnings.push("Custom request conversion does not guarantee production capability, amount, MOQ, sample fee, or lead time. Confirm all custom details.");
  if (order.paymentStatus === "paid" || order.paymentStatus === "deposit_paid") warnings.push("Please confirm actual payment receipt before marking the order as paid or deposit paid.");
  if (order.shippingStatus === "shipped") warnings.push(order.trackingNumber ? "Confirm logistics carrier and tracking status before notifying the customer." : "Tracking number is missing. Confirm logistics number and shipping method before notifying the customer.");
  if (order.productionStatus === "delayed") warnings.push("Confirm the real delay reason and new expected timeline before messaging the customer.");
  if (order.afterSalesStatus === "refunded") warnings.push("Refund status is only a record. Confirm the actual refund process before promising the customer.");
  if (order.orderStatus === "completed") warnings.push("Confirm customer delivery/sign-off and unresolved after-sales issues before completing the order.");
  return Array.from(new Set(warnings));
}

export function generateOrderScript(order: any, body: OrderScriptRequest, knowledgeItems: KnowledgeContextItem[] = []) {
  const scenario = ORDER_SCRIPT_SCENARIOS.includes(body.scenario as any) ? body.scenario : "order_confirm";
  const customerName = order.customer?.name || "there";
  const orderNo = order.orderNo || "this order";
  const product = order.product?.name || order.title || "the product";
  const amountText = order.amount ? `${order.currency || ""} ${decimalToString(order.amount)}`.trim() : "[please confirm amount]";
  const trackingText = order.trackingNumber || "[please confirm tracking number]";
  const scripts: Record<string, string> = {
    order_confirm: `Hi ${customerName}, I would like to confirm the order details for ${orderNo}: ${product}, quantity ${order.quantity ?? "[please confirm quantity]"}, amount ${amountText}. Please confirm these details before we proceed.`,
    payment_reminder: `Hi ${customerName}, may I confirm the payment arrangement for ${orderNo}? We will proceed after actual payment is confirmed. Please confirm the payment method and receiving account before sending this draft.`,
    deposit_confirm: `Hi ${customerName}, please confirm if the deposit for ${orderNo} has been arranged. We will update the order only after the payment is actually received.`,
    production_update: `Hi ${customerName}, here is a production update for ${orderNo}: current status is ${order.productionStatus}. Please confirm the real production progress and timeline before sending.`,
    shipping_notice: `Hi ${customerName}, your order ${orderNo} is marked as ${order.shippingStatus}. Tracking reference: ${trackingText}. Please confirm carrier, tracking number, and logistics timing before sending.`,
    delivery_follow_up: `Hi ${customerName}, I am checking whether order ${orderNo} has arrived safely. Please let me know if everything is fine or if you need any support.`,
    delay_explain: `Hi ${customerName}, we need to update you about ${orderNo}. There may be a delay, and we will confirm the real reason and revised timeline before sharing final details.`,
    after_sales_soothing: `Hi ${customerName}, I understand your concern about ${orderNo}. Please send details, photos, or videos if available, and we will check according to our after-sales policy.`,
    reorder_after_delivery: `Hi ${customerName}, if everything is working well with ${orderNo}, would you like to discuss a reorder plan or updated product options? We will confirm current price, inventory, and lead time first.`
  };
  const missingInfo = [
    !order.amount ? "amount" : "",
    !order.quantity ? "quantity" : "",
    !order.trackingNumber && scenario === "shipping_notice" ? "trackingNumber" : "",
    order.paymentStatus !== "paid" && (scenario === "payment_reminder" || scenario === "deposit_confirm") ? "payment confirmation" : ""
  ].filter(Boolean);
  const knowledge = buildKnowledgeContext(knowledgeItems);
  return {
    scriptText: scripts[scenario],
    alternativeScripts: [],
    riskWarnings: [
      ...riskWarningsForOrder(order, "script"),
      ...(knowledge.knowledgeUsed.length ? [] : ["No related knowledge base content found. Confirm payment, logistics, and after-sales policy before sending."])
    ],
    missingInfo,
    knowledgeUsed: knowledge.knowledgeUsed
  };
}

function inferOrderStatus(body: any) {
  const paymentStatus = clean(body.paymentStatus);
  const shippingStatus = clean(body.shippingStatus);
  const productionStatus = clean(body.productionStatus);
  if (paymentStatus === "unpaid") return "pending_payment";
  if (shippingStatus === "shipped") return "shipped";
  if (shippingStatus === "delivered") return "completed";
  if (paymentStatus === "cancelled" || productionStatus === "cancelled") return "cancelled";
  if (paymentStatus === "paid" || paymentStatus === "deposit_paid") return "processing";
  return "draft";
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function decimalValue(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function intValue(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return Number(value);
}

function dateValue(value: unknown) {
  return typeof value === "string" && value.trim() ? new Date(value) : null;
}

function decimalToString(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value === "object" && typeof (value as { toFixed?: unknown }).toFixed === "function") return (value as { toFixed: (digits: number) => string }).toFixed(2);
  return String(value);
}

function toIso(value: unknown) {
  return value instanceof Date ? value.toISOString() : value ? String(value) : null;
}
