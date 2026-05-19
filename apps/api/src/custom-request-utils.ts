import {
  AI_SAFETY_NOTE,
  CUSTOM_REQUEST_STATUSES,
  CUSTOM_REQUEST_TYPES,
  CUSTOM_SCRIPT_SCENARIOS,
  type CustomRequestDetail,
  type CustomRequestStatus,
  type CustomRequestType,
  type CustomRequestUpsertRequest,
  type CustomScriptRequest,
  type CustomScriptResponse,
  type CustomScriptScenario
} from "@wa-ai/shared";
import { noKnowledgeWarning, type KnowledgeContextItem } from "./knowledge-base-utils.js";

type RawCustomRequest = {
  id: string;
  customerId: string;
  productId: string | null;
  requestType: string;
  logoRequired: boolean;
  packagingRequired: boolean;
  colorRequirement: string | null;
  sizeRequirement: string | null;
  materialRequirement: string | null;
  quantity: number | null;
  moq: number | null;
  sampleFee: unknown | null;
  sampleLeadTime: string | null;
  bulkLeadTime: string | null;
  files: string[];
  status: string;
  notes: string | null;
  ownerId?: string | null;
  customer?: { name?: string | null } | null;
  product?: { name?: string | null } | null;
  createdAt: Date;
  updatedAt: Date;
};

const requestTypeSet = new Set<string>(CUSTOM_REQUEST_TYPES);
const statusSet = new Set<string>(CUSTOM_REQUEST_STATUSES);
const scriptScenarioSet = new Set<string>(CUSTOM_SCRIPT_SCENARIOS);

export function serializeCustomRequest(item: RawCustomRequest): CustomRequestDetail {
  return {
    id: item.id,
    customerId: item.customerId,
    productId: item.productId,
    requestType: normalizeRequestType(item.requestType),
    logoRequired: item.logoRequired,
    packagingRequired: item.packagingRequired,
    colorRequirement: item.colorRequirement,
    sizeRequirement: item.sizeRequirement,
    materialRequirement: item.materialRequirement,
    quantity: item.quantity,
    moq: item.moq,
    sampleFee: decimalToString(item.sampleFee),
    sampleLeadTime: item.sampleLeadTime,
    bulkLeadTime: item.bulkLeadTime,
    files: item.files || [],
    status: normalizeStatus(item.status),
    notes: item.notes,
    ownerId: item.ownerId || null,
    customerName: item.customer?.name || null,
    productName: item.product?.name || null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  };
}

export function validateCustomRequestPayload(input: Partial<CustomRequestUpsertRequest>, options: { partial?: boolean } = {}) {
  const errors: Array<{ field: string; message: string }> = [];
  const customerId = cleanString(input.customerId);
  if (!options.partial && !customerId) errors.push({ field: "customerId", message: "customerId is required" });
  if (input.customerId !== undefined && !customerId) errors.push({ field: "customerId", message: "customerId is required" });
  if (!options.partial && !requestTypeSet.has(cleanString(input.requestType))) errors.push({ field: "requestType", message: "requestType is invalid" });
  if (input.requestType !== undefined && !requestTypeSet.has(cleanString(input.requestType))) errors.push({ field: "requestType", message: "requestType is invalid" });
  if (input.status !== undefined && !statusSet.has(cleanString(input.status))) errors.push({ field: "status", message: "status is invalid" });
  if (!isNullableNonNegativeInteger(input.quantity)) errors.push({ field: "quantity", message: "quantity must be a non-negative integer" });
  if (!isNullableNonNegativeInteger(input.moq)) errors.push({ field: "moq", message: "moq must be a non-negative integer" });
  if (!isNullableNonNegative(input.sampleFee)) errors.push({ field: "sampleFee", message: "sampleFee must be a non-negative number" });
  if (input.files !== undefined && !Array.isArray(input.files)) errors.push({ field: "files", message: "files must be an array" });
  if (Array.isArray(input.files) && input.files.some((file) => typeof file !== "string" || file.trim().length === 0)) {
    errors.push({ field: "files", message: "files must be non-empty URLs or text references" });
  }
  return errors;
}

export function toCustomRequestCreateData(input: CustomRequestUpsertRequest) {
  return {
    customerId: cleanString(input.customerId),
    productId: nullableString(input.productId),
    requestType: normalizeRequestType(input.requestType),
    logoRequired: Boolean(input.logoRequired),
    packagingRequired: Boolean(input.packagingRequired),
    colorRequirement: nullableString(input.colorRequirement),
    sizeRequirement: nullableString(input.sizeRequirement),
    materialRequirement: nullableString(input.materialRequirement),
    quantity: nullableInteger(input.quantity),
    moq: nullableInteger(input.moq),
    sampleFee: nullableNumber(input.sampleFee),
    sampleLeadTime: nullableString(input.sampleLeadTime),
    bulkLeadTime: nullableString(input.bulkLeadTime),
    files: normalizeFiles(input.files),
    status: normalizeStatus(input.status),
    notes: nullableString(input.notes)
  };
}

export function toCustomRequestUpdateData(input: Partial<CustomRequestUpsertRequest>) {
  const data: Record<string, unknown> = {};
  if (input.customerId !== undefined) data.customerId = cleanString(input.customerId);
  if (input.productId !== undefined) data.productId = nullableString(input.productId);
  if (input.requestType !== undefined) data.requestType = normalizeRequestType(input.requestType);
  if (input.logoRequired !== undefined) data.logoRequired = Boolean(input.logoRequired);
  if (input.packagingRequired !== undefined) data.packagingRequired = Boolean(input.packagingRequired);
  if (input.colorRequirement !== undefined) data.colorRequirement = nullableString(input.colorRequirement);
  if (input.sizeRequirement !== undefined) data.sizeRequirement = nullableString(input.sizeRequirement);
  if (input.materialRequirement !== undefined) data.materialRequirement = nullableString(input.materialRequirement);
  if (input.quantity !== undefined) data.quantity = nullableInteger(input.quantity);
  if (input.moq !== undefined) data.moq = nullableInteger(input.moq);
  if (input.sampleFee !== undefined) data.sampleFee = nullableNumber(input.sampleFee);
  if (input.sampleLeadTime !== undefined) data.sampleLeadTime = nullableString(input.sampleLeadTime);
  if (input.bulkLeadTime !== undefined) data.bulkLeadTime = nullableString(input.bulkLeadTime);
  if (input.files !== undefined) data.files = normalizeFiles(input.files);
  if (input.status !== undefined) data.status = normalizeStatus(input.status);
  if (input.notes !== undefined) data.notes = nullableString(input.notes);
  return data;
}

export function validateCustomScriptPayload(input: Partial<CustomScriptRequest>) {
  if (!input.scenario || !scriptScenarioSet.has(input.scenario)) return [{ field: "scenario", message: "scenario is invalid" }];
  return [];
}

export function generateCustomScript(
  item: CustomRequestDetail,
  input: CustomScriptRequest,
  knowledgeItems: KnowledgeContextItem[] = []
): CustomScriptResponse {
  const scenario = normalizeScriptScenario(input.scenario);
  const knowledgeUsed = knowledgeItems.map((entry) => entry.title);
  return {
    customRequestId: item.id,
    scenario,
    scriptText: withKnowledgeLine(scriptForScenario(item, scenario), knowledgeUsed),
    riskWarnings: customScriptWarnings(item, scenario, knowledgeItems),
    knowledgeUsed
  };
}

function scriptForScenario(item: CustomRequestDetail, scenario: CustomScriptScenario) {
  const product = item.productName || "the selected product";
  const details = [
    `custom type: ${item.requestType}`,
    `product: ${product}`,
    `logo: ${item.logoRequired ? "required" : "not confirmed"}`,
    `packaging: ${item.packagingRequired ? "required" : "not confirmed"}`,
    `color: ${item.colorRequirement || "to be confirmed"}`,
    `size: ${item.sizeRequirement || "to be confirmed"}`,
    `material: ${item.materialRequirement || "to be confirmed"}`,
    `quantity: ${item.quantity || "to be confirmed"}`,
    `MOQ: ${item.moq || "to be confirmed"}`,
    `sample fee: ${item.sampleFee || "to be confirmed"}`,
    `sample lead time: ${item.sampleLeadTime || "to be confirmed"}`,
    `bulk lead time: ${item.bulkLeadTime || "to be confirmed"}`,
    `files: ${item.files.length ? item.files.join(", ") : "customer files to be provided"}`
  ].join("; ");

  const map: Record<CustomScriptScenario, string> = {
    custom_confirm: `Please help me confirm the customization details before we proceed: ${details}. This is only a draft, and I will confirm feasibility, MOQ, sample fee, and lead time before sending.`,
    custom_request_files: `To check this customization request, could you please send clear logo files, packaging references, artwork, or size/color/material details? This is only a draft request for missing information.`,
    custom_moq_explain: `For customized items, MOQ usually depends on logo, packaging, material, and production setup. I will confirm the exact MOQ with our team before sending a final answer.`,
    custom_sample_fee: `For customization samples, the sample fee depends on artwork, mold/setup needs, packaging, and product details. I will confirm the exact sample fee and whether it can be deducted before sending.`,
    custom_sample_lead_time: `For customization samples, lead time depends on file confirmation, material availability, and sample complexity. I will confirm the exact sample lead time before sending.`,
    custom_bulk_lead_time: `For bulk customization, production lead time depends on final artwork, quantity, material, packaging, and factory schedule. I will confirm the exact bulk lead time before sending.`,
    custom_risk_confirm: `For customized products, please confirm all artwork, logo, packaging, color, size, material, quantity, MOQ, sample fee, and lead time carefully. After confirmation, changes or returns may be limited and must be checked case by case.`
  };
  return map[scenario];
}

function customScriptWarnings(item: CustomRequestDetail, scenario: CustomScriptScenario, knowledgeItems: KnowledgeContextItem[]) {
  const warnings = [
    AI_SAFETY_NOTE,
    "Custom scripts are drafts only and will not automatically send WhatsApp messages.",
    "The system must not invent MOQ, sample fee, sample lead time, bulk lead time, payment method, customization capability, or production feasibility.",
    "Do not promise that customization is always possible, customer files are production-ready, or custom products support unconditional return or exchange."
  ];
  if (item.logoRequired && item.files.length === 0) warnings.push("Missing logo or design file. Ask the customer to provide a clear file before confirming.");
  if (item.packagingRequired && item.files.length === 0) warnings.push("Missing packaging artwork or packaging requirements. Ask the customer for reference images, size, and material requirements.");
  if (!item.moq) warnings.push("Missing MOQ. The salesperson must confirm the custom MOQ before sending.");
  if (!item.sampleFee && (scenario === "custom_confirm" || scenario === "custom_sample_fee")) warnings.push("Missing sample fee. The salesperson must confirm the sample fee and whether it can be deducted.");
  if (!item.sampleLeadTime && (scenario === "custom_confirm" || scenario === "custom_sample_lead_time")) warnings.push("Missing sample lead time. The salesperson must confirm it before sending.");
  if (!item.bulkLeadTime && (scenario === "custom_confirm" || scenario === "custom_bulk_lead_time")) warnings.push("Missing bulk lead time. The salesperson must confirm it before sending.");
  if (scenario === "custom_risk_confirm") warnings.push("Custom after-sales risk. The salesperson must confirm change, return, exchange, and after-sales rules.");
  if (knowledgeItems.length === 0) warnings.push(noKnowledgeWarning());
  return warnings;
}
function withKnowledgeLine(text: string, knowledgeUsed: string[]) {
  if (knowledgeUsed.length === 0) return text;
  return `${text}\nReference checked: ${knowledgeUsed.join(", ")}. Please confirm MOQ, fees, sample lead time, bulk lead time, files, and feasibility before sending.`;
}

function normalizeRequestType(value: unknown): CustomRequestType {
  const text = cleanString(value) || "other";
  return requestTypeSet.has(text) ? (text as CustomRequestType) : "other";
}

function normalizeStatus(value: unknown): CustomRequestStatus {
  const text = cleanString(value) || "draft";
  return statusSet.has(text) ? (text as CustomRequestStatus) : "draft";
}

function normalizeScriptScenario(value: unknown): CustomScriptScenario {
  const text = cleanString(value);
  return scriptScenarioSet.has(text) ? (text as CustomScriptScenario) : "custom_confirm";
}

function normalizeFiles(value: unknown) {
  return Array.isArray(value) ? Array.from(new Set(value.map((item) => cleanString(item)).filter(Boolean))) : [];
}

function isNullableNonNegative(value: unknown) {
  if (value === undefined || value === null || value === "") return true;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0;
}

function isNullableNonNegativeInteger(value: unknown) {
  if (value === undefined || value === null || value === "") return true;
  const number = Number(value);
  return Number.isInteger(number) && number >= 0;
}

function nullableNumber(value: unknown) {
  return value === undefined || value === null || value === "" ? null : Number(value);
}

function nullableInteger(value: unknown) {
  return value === undefined || value === null || value === "" ? null : Number(value);
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
