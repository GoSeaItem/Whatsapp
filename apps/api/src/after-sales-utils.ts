import {
  AFTER_SALES_CASE_TYPES,
  AFTER_SALES_PRIORITIES,
  AFTER_SALES_RESPONSIBILITIES,
  AFTER_SALES_SCRIPT_SCENARIOS,
  AFTER_SALES_SOLUTIONS,
  AFTER_SALES_STATUSES,
  type AfterSalesScriptRequest
} from "@wa-ai/shared";
import { buildKnowledgeContext } from "./knowledge-base-service.js";
import type { KnowledgeContextItem } from "./knowledge-base-utils.js";

const draftWarning = "After-sales messages are drafts only. Confirm company policy, responsibility, refund, reship, compensation, logistics, and evidence before manually sending.";

export function validateAfterSalesPayload(body: any, options: { partial?: boolean } = {}) {
  const errors: Array<{ field: string; message: string }> = [];
  if (!options.partial && !clean(body?.customerId)) errors.push({ field: "customerId", message: "customerId is required" });
  if (!options.partial && !clean(body?.caseType)) errors.push({ field: "caseType", message: "caseType is required" });
  if (body?.caseType !== undefined && !AFTER_SALES_CASE_TYPES.includes(clean(body.caseType) as any)) errors.push({ field: "caseType", message: "caseType is invalid" });
  if (body?.priority !== undefined && clean(body.priority) && !AFTER_SALES_PRIORITIES.includes(clean(body.priority) as any)) errors.push({ field: "priority", message: "priority is invalid" });
  if (body?.status !== undefined && clean(body.status) && !AFTER_SALES_STATUSES.includes(clean(body.status) as any)) errors.push({ field: "status", message: "status is invalid" });
  if (body?.responsibility !== undefined && clean(body.responsibility) && !AFTER_SALES_RESPONSIBILITIES.includes(clean(body.responsibility) as any)) errors.push({ field: "responsibility", message: "responsibility is invalid" });
  if (body?.requestedSolution !== undefined && clean(body.requestedSolution) && !AFTER_SALES_SOLUTIONS.includes(clean(body.requestedSolution) as any)) errors.push({ field: "requestedSolution", message: "requestedSolution is invalid" });
  if (body?.finalSolution !== undefined && clean(body.finalSolution) && !AFTER_SALES_SOLUTIONS.includes(clean(body.finalSolution) as any)) errors.push({ field: "finalSolution", message: "finalSolution is invalid" });
  for (const field of ["refundAmount", "reshipCost", "compensationAmount"] as const) {
    if (body?.[field] !== undefined && body[field] !== null && body[field] !== "" && Number.isNaN(Number(body[field]))) errors.push({ field, message: `${field} must be a number` });
  }
  if (body?.evidenceUrls && (!Array.isArray(body.evidenceUrls) || body.evidenceUrls.some((item: unknown) => typeof item !== "string"))) errors.push({ field: "evidenceUrls", message: "evidenceUrls must be URL string array" });
  if (body?.status === "resolved" && !clean(body?.resolutionNotes) && !clean(body?.finalSolution) && !clean(body?.notes)) {
    errors.push({ field: "resolutionNotes", message: "resolved status requires resolutionNotes, notes, or finalSolution" });
  }
  return errors;
}

export function toAfterSalesCreateData(body: any, context: { caseNo: string; customer: any; order?: any | null; userId: string }) {
  return {
    organizationId: context.customer.organizationId || context.order?.organizationId || null,
    customerId: context.customer.id,
    orderId: clean(body.orderId) || null,
    productId: clean(body.productId) || context.order?.productId || null,
    caseNo: context.caseNo,
    caseType: clean(body.caseType),
    priority: clean(body.priority) || "medium",
    status: "open",
    responsibility: "unknown",
    requestedSolution: clean(body.requestedSolution) || null,
    finalSolution: null,
    refundAmount: null,
    reshipCost: null,
    compensationAmount: null,
    currency: clean(body.currency) || context.order?.currency || null,
    description: clean(body.description) || null,
    customerClaim: clean(body.customerClaim) || null,
    internalNotes: clean(body.internalNotes) || null,
    evidenceUrls: Array.isArray(body.evidenceUrls) ? body.evidenceUrls.filter(Boolean) : [],
    resolutionNotes: null,
    ownerId: context.customer.ownerId,
    assignedTo: clean(body.assignedTo) || context.customer.assignedTo || null,
    createdBy: context.userId
  };
}

export function toAfterSalesUpdateData(body: any) {
  const data: Record<string, unknown> = {};
  for (const field of ["caseType", "priority", "status", "responsibility", "requestedSolution", "finalSolution", "currency", "description", "customerClaim", "internalNotes", "resolutionNotes", "assignedTo"] as const) {
    if (body[field] !== undefined) data[field] = clean(body[field]) || null;
  }
  for (const field of ["refundAmount", "reshipCost", "compensationAmount"] as const) {
    if (body[field] !== undefined) data[field] = decimalValue(body[field]);
  }
  if (body.evidenceUrls !== undefined) data.evidenceUrls = Array.isArray(body.evidenceUrls) ? body.evidenceUrls.filter(Boolean) : [];
  if (body.status === "resolved") data.resolvedAt = new Date();
  if (body.status === "closed") data.closedAt = new Date();
  return data;
}

export function serializeAfterSalesCase(row: any) {
  return {
    id: row.id,
    organizationId: row.organizationId || null,
    customerId: row.customerId,
    customerName: row.customer?.name || null,
    orderId: row.orderId || null,
    orderNo: row.order?.orderNo || null,
    productId: row.productId || null,
    productName: row.product?.name || null,
    caseNo: row.caseNo,
    caseType: row.caseType,
    priority: row.priority,
    status: row.status,
    responsibility: row.responsibility || "unknown",
    requestedSolution: row.requestedSolution || null,
    finalSolution: row.finalSolution || null,
    refundAmount: decimalToString(row.refundAmount),
    reshipCost: decimalToString(row.reshipCost),
    compensationAmount: decimalToString(row.compensationAmount),
    currency: row.currency || null,
    description: row.description || null,
    customerClaim: row.customerClaim || null,
    internalNotes: row.internalNotes || null,
    evidenceUrls: Array.isArray(row.evidenceUrls) ? row.evidenceUrls : [],
    resolutionNotes: row.resolutionNotes || null,
    assignedTo: row.assignedTo || null,
    ownerId: row.ownerId,
    openedAt: toIso(row.openedAt) || "",
    resolvedAt: toIso(row.resolvedAt),
    closedAt: toIso(row.closedAt),
    createdAt: toIso(row.createdAt) || "",
    updatedAt: toIso(row.updatedAt) || ""
  };
}

export function serializeAfterSalesEvent(row: any) {
  return {
    id: row.id,
    organizationId: row.organizationId || null,
    afterSalesCaseId: row.afterSalesCaseId,
    eventType: row.eventType,
    oldValue: row.oldValue || null,
    newValue: row.newValue || null,
    notes: row.notes || null,
    createdBy: row.createdBy,
    createdAt: toIso(row.createdAt) || ""
  };
}

export function afterSalesRiskWarnings(rowOrBody: any, action = "after_sales") {
  const warnings = [draftWarning];
  const finalSolution = clean(rowOrBody.finalSolution);
  const requestedSolution = clean(rowOrBody.requestedSolution);
  const status = clean(rowOrBody.status);
  const responsibility = clean(rowOrBody.responsibility);
  if (["refund", "reship", "discount", "replacement"].includes(finalSolution) || ["refund", "reship", "discount", "replacement"].includes(requestedSolution)) {
    warnings.push("Refund, reship, discount, replacement, or compensation must be confirmed against company policy and manager approval before messaging the customer.");
  }
  if (rowOrBody.refundAmount !== undefined && rowOrBody.refundAmount !== null && rowOrBody.refundAmount !== "") warnings.push("Refund amount is only a record. It does not execute an actual refund.");
  if (rowOrBody.reshipCost !== undefined && rowOrBody.reshipCost !== null && rowOrBody.reshipCost !== "") warnings.push("Reship cost is only a record. It does not create a real reshipment.");
  if (rowOrBody.compensationAmount !== undefined && rowOrBody.compensationAmount !== null && rowOrBody.compensationAmount !== "") warnings.push("Compensation amount must be manually confirmed before any customer commitment.");
  if (responsibility && responsibility !== "unknown") warnings.push("Responsibility attribution is manual. AI must not confirm whether the company, customer, logistics, or supplier is responsible.");
  if (status === "closed") warnings.push("Close after-sales only after confirming the case is resolved and no pending refund, reship, or complaint remains.");
  if (action === "script") warnings.push("Do not promise refund, reship, compensation, unconditional returns, logistics status, or processing time unless confirmed.");
  return Array.from(new Set(warnings));
}

export function generateAfterSalesScript(caseRow: any, body: AfterSalesScriptRequest, knowledgeItems: KnowledgeContextItem[] = []) {
  const scenario = AFTER_SALES_SCRIPT_SCENARIOS.includes(body.scenario as any) ? body.scenario : "apologize_and_acknowledge";
  const customerName = caseRow.customer?.name || "there";
  const caseNo = caseRow.caseNo || "this after-sales case";
  const orderNo = caseRow.order?.orderNo ? ` for order ${caseRow.order.orderNo}` : "";
  const scripts: Record<string, string> = {
    ask_for_evidence: `Hi ${customerName}, thanks for letting us know about ${caseNo}${orderNo}. Could you please send clear photos, videos, packaging pictures, and any logistics screenshots? We will check carefully before confirming the next step.`,
    apologize_and_acknowledge: `Hi ${customerName}, I am sorry for the inconvenience. We have recorded ${caseNo}${orderNo} and will check the details carefully. Please allow us to verify the evidence and company policy before confirming a solution.`,
    explain_shipping_delay: `Hi ${customerName}, I understand the delivery delay is frustrating. We need to verify the latest logistics information and the real reason first, then we can update you with a confirmed explanation.`,
    explain_quality_check: `Hi ${customerName}, for the quality concern, could you please share photos or videos showing the issue clearly? We will review them with the product and quality team before confirming responsibility or solution.`,
    refund_policy_explain: `Hi ${customerName}, regarding the refund request, we need to check the case details and company after-sales policy first. I will not confirm any refund amount until it is internally approved.`,
    reship_arrangement: `Hi ${customerName}, regarding reshipment, we need to confirm the product, quantity, address, shipping method, and approval first. I will update you after these details are verified.`,
    solution_confirm: `Hi ${customerName}, here is the proposed solution for ${caseNo}${orderNo}: [please confirm final solution]. Please review and confirm whether this works for you before we proceed.`,
    follow_up_after_resolved: `Hi ${customerName}, I am following up to check whether the after-sales solution for ${caseNo}${orderNo} has been received and whether everything is now okay.`,
    calm_down_complaint: `Hi ${customerName}, I understand your concern and I am here to help resolve it. Please give us the key details and evidence, and we will check this case seriously before confirming the next step.`,
    request_internal_confirmation: `Hi ${customerName}, this case needs internal confirmation before we can give a final answer. I will check with the team and update you once the details and policy are confirmed.`
  };
  const knowledge = buildKnowledgeContext(knowledgeItems);
  const missingInfo = [
    !caseRow.evidenceUrls?.length ? "evidence photos/videos/screenshots" : "",
    !caseRow.finalSolution ? "final approved solution" : "",
    caseRow.responsibility === "unknown" || !caseRow.responsibility ? "responsibility confirmation" : "",
    !knowledge.knowledgeUsed.length ? "after-sales policy knowledge" : ""
  ].filter(Boolean);
  return {
    scriptText: scripts[scenario],
    alternativeScripts: [scripts[scenario], `Short version: ${scripts[scenario]}`, `Professional version: ${scripts[scenario]}`].slice(0, 3),
    riskWarnings: [
      ...afterSalesRiskWarnings(caseRow, "script"),
      ...(knowledge.knowledgeUsed.length ? [] : ["No related after-sales policy knowledge was found. Confirm company policy before sending."])
    ],
    missingInfo,
    knowledgeUsed: knowledge.knowledgeUsed
  };
}

export function afterSalesEventType(before: any, after: any) {
  if (!before) return "created";
  if (before.status !== after.status) return "status_changed";
  if (before.responsibility !== after.responsibility) return "responsibility_changed";
  if (before.finalSolution !== after.finalSolution) return "solution_changed";
  if (before.refundAmount !== after.refundAmount) return "refund_recorded";
  if (before.reshipCost !== after.reshipCost) return "reship_recorded";
  return "note_added";
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function decimalValue(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function decimalToString(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "object" && typeof (value as { toFixed?: unknown }).toFixed === "function") return (value as { toFixed: (digits: number) => string }).toFixed(2);
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(2) : String(value);
}

function toIso(value: unknown) {
  return value instanceof Date ? value.toISOString() : value ? String(value) : null;
}
