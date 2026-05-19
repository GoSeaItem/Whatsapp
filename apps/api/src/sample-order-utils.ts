import {
  AI_SAFETY_NOTE,
  SAMPLE_FEEDBACK_STATUSES,
  SAMPLE_PAYMENT_STATUSES,
  SAMPLE_SCRIPT_SCENARIOS,
  SAMPLE_SHIPPING_STATUSES,
  type SampleFeedbackStatus,
  type SampleOrderDetail,
  type SampleOrderUpsertRequest,
  type SamplePaymentStatus,
  type SampleScriptRequest,
  type SampleScriptResponse,
  type SampleScriptScenario,
  type SampleShippingStatus
} from "@wa-ai/shared";
import { noKnowledgeWarning, type KnowledgeContextItem } from "./knowledge-base-utils.js";

type RawSampleOrder = {
  id: string;
  customerId: string;
  productId: string | null;
  sampleName: string;
  sampleFee: unknown | null;
  shippingCost: unknown | null;
  currency: string;
  paymentStatus: string;
  shippingStatus: string;
  trackingNumber: string | null;
  feedbackStatus: string;
  expectedShipDate: Date | null;
  expectedDeliveryDate: Date | null;
  notes: string | null;
  ownerId?: string | null;
  customer?: { name?: string | null } | null;
  product?: { name?: string | null } | null;
  createdAt: Date;
  updatedAt: Date;
};

const paymentStatusSet = new Set<string>(SAMPLE_PAYMENT_STATUSES);
const shippingStatusSet = new Set<string>(SAMPLE_SHIPPING_STATUSES);
const feedbackStatusSet = new Set<string>(SAMPLE_FEEDBACK_STATUSES);
const scriptScenarioSet = new Set<string>(SAMPLE_SCRIPT_SCENARIOS);

export function serializeSampleOrder(sample: RawSampleOrder): SampleOrderDetail {
  return {
    id: sample.id,
    customerId: sample.customerId,
    productId: sample.productId,
    sampleName: sample.sampleName,
    sampleFee: decimalToString(sample.sampleFee),
    shippingCost: decimalToString(sample.shippingCost),
    currency: sample.currency,
    paymentStatus: normalizePaymentStatus(sample.paymentStatus),
    shippingStatus: normalizeShippingStatus(sample.shippingStatus),
    trackingNumber: sample.trackingNumber,
    feedbackStatus: normalizeFeedbackStatus(sample.feedbackStatus),
    expectedShipDate: sample.expectedShipDate?.toISOString() || null,
    expectedDeliveryDate: sample.expectedDeliveryDate?.toISOString() || null,
    notes: sample.notes,
    ownerId: sample.ownerId || null,
    customerName: sample.customer?.name || null,
    productName: sample.product?.name || null,
    createdAt: sample.createdAt.toISOString(),
    updatedAt: sample.updatedAt.toISOString()
  };
}

export function validateSampleOrderPayload(input: Partial<SampleOrderUpsertRequest>, options: { partial?: boolean } = {}) {
  const errors: Array<{ field: string; message: string }> = [];
  const customerId = cleanString(input.customerId);
  const sampleName = cleanString(input.sampleName);
  const currency = cleanString(input.currency);

  if (!options.partial && !customerId) errors.push({ field: "customerId", message: "customerId is required" });
  if (input.customerId !== undefined && !customerId) errors.push({ field: "customerId", message: "customerId is required" });
  if (!options.partial && !sampleName) errors.push({ field: "sampleName", message: "sampleName is required" });
  if (input.sampleName !== undefined && !sampleName) errors.push({ field: "sampleName", message: "sampleName is required" });
  if (sampleName.length > 160) errors.push({ field: "sampleName", message: "sampleName must be 160 characters or less" });
  if (currency && currency.length > 12) errors.push({ field: "currency", message: "currency must be 12 characters or less" });
  if (!isNullableNonNegative(input.sampleFee)) errors.push({ field: "sampleFee", message: "sampleFee must be a non-negative number" });
  if (!isNullableNonNegative(input.shippingCost)) errors.push({ field: "shippingCost", message: "shippingCost must be a non-negative number" });
  if (input.paymentStatus !== undefined && !paymentStatusSet.has(cleanString(input.paymentStatus))) errors.push({ field: "paymentStatus", message: "paymentStatus is invalid" });
  if (input.shippingStatus !== undefined && !shippingStatusSet.has(cleanString(input.shippingStatus))) errors.push({ field: "shippingStatus", message: "shippingStatus is invalid" });
  if (input.feedbackStatus !== undefined && !feedbackStatusSet.has(cleanString(input.feedbackStatus))) errors.push({ field: "feedbackStatus", message: "feedbackStatus is invalid" });
  if (input.expectedShipDate && Number.isNaN(Date.parse(input.expectedShipDate))) errors.push({ field: "expectedShipDate", message: "expectedShipDate is invalid" });
  if (input.expectedDeliveryDate && Number.isNaN(Date.parse(input.expectedDeliveryDate))) errors.push({ field: "expectedDeliveryDate", message: "expectedDeliveryDate is invalid" });
  return errors;
}

export function toSampleOrderCreateData(input: SampleOrderUpsertRequest) {
  return {
    customerId: cleanString(input.customerId),
    productId: nullableString(input.productId),
    sampleName: cleanString(input.sampleName),
    sampleFee: nullableNumber(input.sampleFee),
    shippingCost: nullableNumber(input.shippingCost),
    currency: cleanString(input.currency) || "USD",
    paymentStatus: normalizePaymentStatus(input.paymentStatus),
    shippingStatus: normalizeShippingStatus(input.shippingStatus),
    trackingNumber: nullableString(input.trackingNumber),
    feedbackStatus: normalizeFeedbackStatus(input.feedbackStatus),
    expectedShipDate: parseDateOrNull(input.expectedShipDate),
    expectedDeliveryDate: parseDateOrNull(input.expectedDeliveryDate),
    notes: nullableString(input.notes)
  };
}

export function toSampleOrderUpdateData(input: Partial<SampleOrderUpsertRequest>) {
  const data: Record<string, unknown> = {};
  if (input.customerId !== undefined) data.customerId = cleanString(input.customerId);
  if (input.productId !== undefined) data.productId = nullableString(input.productId);
  if (input.sampleName !== undefined) data.sampleName = cleanString(input.sampleName);
  if (input.sampleFee !== undefined) data.sampleFee = nullableNumber(input.sampleFee);
  if (input.shippingCost !== undefined) data.shippingCost = nullableNumber(input.shippingCost);
  if (input.currency !== undefined) data.currency = cleanString(input.currency) || "USD";
  if (input.paymentStatus !== undefined) data.paymentStatus = normalizePaymentStatus(input.paymentStatus);
  if (input.shippingStatus !== undefined) data.shippingStatus = normalizeShippingStatus(input.shippingStatus);
  if (input.trackingNumber !== undefined) data.trackingNumber = nullableString(input.trackingNumber);
  if (input.feedbackStatus !== undefined) data.feedbackStatus = normalizeFeedbackStatus(input.feedbackStatus);
  if (input.expectedShipDate !== undefined) data.expectedShipDate = parseDateOrNull(input.expectedShipDate);
  if (input.expectedDeliveryDate !== undefined) data.expectedDeliveryDate = parseDateOrNull(input.expectedDeliveryDate);
  if (input.notes !== undefined) data.notes = nullableString(input.notes);
  return data;
}

export function validateSampleScriptPayload(input: Partial<SampleScriptRequest>) {
  if (!input.scenario || !scriptScenarioSet.has(input.scenario)) return [{ field: "scenario", message: "scenario is invalid" }];
  return [];
}

export function generateSampleScript(
  sample: SampleOrderDetail,
  input: SampleScriptRequest,
  knowledgeItems: KnowledgeContextItem[] = []
): SampleScriptResponse {
  const scenario = normalizeScriptScenario(input.scenario);
  const knowledgeUsed = knowledgeItems.map((item) => item.title);
  return {
    sampleOrderId: sample.id,
    scenario,
    scriptText: withKnowledgeLine(scriptForScenario(sample, scenario), knowledgeUsed),
    riskWarnings: sampleScriptWarnings(sample, scenario, knowledgeItems),
    knowledgeUsed
  };
}

function scriptForScenario(sample: SampleOrderDetail, scenario: SampleScriptScenario) {
  const fee = sample.sampleFee ? `${sample.currency} ${sample.sampleFee}` : "sample fee to be confirmed";
  const shipping = sample.shippingCost ? `${sample.currency} ${sample.shippingCost}` : "shipping cost to be confirmed";
  const tracking = sample.trackingNumber || "tracking number to be confirmed";
  const delivery = sample.expectedDeliveryDate ? `around ${sample.expectedDeliveryDate.slice(0, 10)} after confirmation` : "after confirming logistics timing";
  const map: Record<SampleScriptScenario, string> = {
    sample_quote: `Here is the sample quotation for ${sample.sampleName}: sample fee ${fee}, shipping ${shipping}. Please note this is a draft; I will confirm whether the sample fee can be deducted from bulk orders and confirm payment details before sending.`,
    sample_payment_reminder: `Hi, the sample ${sample.sampleName} is ready to proceed. Please arrange payment after I confirm the receiving account and payment method. This is only a draft reminder and will not be sent automatically.`,
    sample_shipped: `Hi, your sample ${sample.sampleName} has been prepared for shipment. Tracking reference: ${tracking}. Estimated delivery should be confirmed with the logistics provider, ${delivery}.`,
    sample_feedback_follow_up: `Hi, have you received and checked the sample ${sample.sampleName}? Please share your feedback, and I can help adjust details or prepare the next quotation.`,
    sample_to_bulk_order: `Great to hear the sample feedback is positive. Would you like me to prepare a bulk order quotation for ${sample.sampleName}? I will confirm price, stock, lead time, and shipping before sending.`
  };
  return map[scenario];
}

function sampleScriptWarnings(sample: SampleOrderDetail, scenario: SampleScriptScenario, knowledgeItems: KnowledgeContextItem[]) {
  const warnings = [
    AI_SAFETY_NOTE,
    "样品话术仅作为草稿，不会自动发送 WhatsApp 消息。",
    "不允许系统编造样品费、运费、交期、付款方式、样品费抵扣规则或物流时效。",
    "不承诺样品费一定可抵扣，不承诺一定今天发货，不承诺物流一定按时到达。"
  ];
  if (!sample.sampleFee && scenario === "sample_quote") warnings.push("未填写样品费，请业务员确认后再发送。");
  if (!sample.shippingCost && (scenario === "sample_quote" || scenario === "sample_shipped")) warnings.push("未填写运费，请业务员确认客户国家、城市和物流方式。");
  if (scenario === "sample_payment_reminder" || scenario === "sample_quote") warnings.push("涉及付款时，请业务员确认收款账户、付款方式和手续费。");
  if (scenario === "sample_shipped") warnings.push("涉及发货时，请业务员确认物流单号、物流方式和物流时效。");
  if (knowledgeItems.length === 0) warnings.push(noKnowledgeWarning());
  return warnings;
}

function withKnowledgeLine(text: string, knowledgeUsed: string[]) {
  if (knowledgeUsed.length === 0) return text;
  return `${text}\nReference checked: ${knowledgeUsed.join(", ")}. Please confirm fees, shipping, payment account, lead time, and logistics before sending.`;
}

function normalizePaymentStatus(value: unknown): SamplePaymentStatus {
  const text = cleanString(value) || "unpaid";
  return paymentStatusSet.has(text) ? (text as SamplePaymentStatus) : "unpaid";
}

function normalizeShippingStatus(value: unknown): SampleShippingStatus {
  const text = cleanString(value) || "pending";
  return shippingStatusSet.has(text) ? (text as SampleShippingStatus) : "pending";
}

function normalizeFeedbackStatus(value: unknown): SampleFeedbackStatus {
  const text = cleanString(value) || "pending";
  return feedbackStatusSet.has(text) ? (text as SampleFeedbackStatus) : "pending";
}

function normalizeScriptScenario(value: unknown): SampleScriptScenario {
  const text = cleanString(value);
  return scriptScenarioSet.has(text) ? (text as SampleScriptScenario) : "sample_quote";
}

function isNullableNonNegative(value: unknown) {
  if (value === undefined || value === null || value === "") return true;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0;
}

function nullableNumber(value: unknown) {
  return value === undefined || value === null || value === "" ? null : Number(value);
}

function parseDateOrNull(value: unknown) {
  const text = cleanString(value);
  return text ? new Date(text) : null;
}

function nullableString(value: unknown) {
  return cleanString(value) || null;
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function decimalToString(value: unknown) {
  return value === null || value === undefined ? null : String(value);
}
