import {
  PURCHASE_NOTE_TYPES,
  SUPPLIER_LINK_ENTITY_TYPES,
  SUPPLIER_LINK_RELATION_TYPES,
  SUPPLIER_QUOTE_STATUSES,
  SUPPLIER_RISK_LEVELS,
  SUPPLIER_RISK_STATUSES,
  SUPPLIER_RISK_TYPES,
  SUPPLIER_SCRIPT_SCENARIOS,
  SUPPLIER_STATUSES
} from "@wa-ai/shared";

const moneyFields = ["unitCost", "sampleFee"] as const;
const supplierMoneyFields = ["rating"] as const;

export function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function arrayInput(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => clean(item)).filter(Boolean);
  if (typeof value === "string") return value.split("|").map((item) => item.trim()).filter(Boolean);
  return [];
}

export function nullableString(value: unknown) {
  const text = clean(value);
  return text || null;
}

export function numberInput(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function decimalInput(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

export function decimalString(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "object" && typeof (value as { toFixed?: unknown }).toFixed === "function") {
    return (value as { toFixed: (digits: number) => string }).toFixed(2);
  }
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(2) : String(value);
}

export function toIso(value: unknown) {
  return value instanceof Date ? value.toISOString() : value ? String(value) : null;
}

export function validateSupplierPayload(body: any, options: { partial?: boolean } = {}) {
  const errors: Array<{ field: string; message: string }> = [];
  if (!options.partial && !clean(body?.name)) errors.push({ field: "name", message: "name is required" });
  if (body?.status !== undefined && !SUPPLIER_STATUSES.includes(body.status)) errors.push({ field: "status", message: "status is invalid" });
  if (body?.riskLevel !== undefined && body.riskLevel && !SUPPLIER_RISK_LEVELS.includes(body.riskLevel)) errors.push({ field: "riskLevel", message: "riskLevel is invalid" });
  for (const field of supplierMoneyFields) {
    if (body?.[field] !== undefined && body[field] !== null && body[field] !== "" && !Number.isFinite(Number(body[field]))) {
      errors.push({ field, message: `${field} must be a number` });
    }
  }
  return errors;
}

export function validateSupplierContactPayload(body: any, options: { partial?: boolean } = {}) {
  const errors: Array<{ field: string; message: string }> = [];
  if (!options.partial && !clean(body?.name)) errors.push({ field: "name", message: "name is required" });
  return errors;
}

export function validateSupplierQuotePayload(body: any, options: { partial?: boolean } = {}) {
  const errors: Array<{ field: string; message: string }> = [];
  if (!options.partial && !clean(body?.supplierId)) errors.push({ field: "supplierId", message: "supplierId is required" });
  if (body?.status !== undefined && !SUPPLIER_QUOTE_STATUSES.includes(body.status)) errors.push({ field: "status", message: "status is invalid" });
  if (body?.moq !== undefined && body.moq !== null && body.moq !== "" && !Number.isFinite(Number(body.moq))) errors.push({ field: "moq", message: "moq must be a number" });
  for (const field of moneyFields) {
    if (body?.[field] !== undefined && body[field] !== null && body[field] !== "" && !Number.isFinite(Number(body[field]))) {
      errors.push({ field, message: `${field} must be a number` });
    }
  }
  if (body?.validUntil && Number.isNaN(new Date(body.validUntil).getTime())) errors.push({ field: "validUntil", message: "validUntil must be a valid date" });
  return errors;
}

export function validatePurchaseNotePayload(body: any, options: { partial?: boolean } = {}) {
  const errors: Array<{ field: string; message: string }> = [];
  if (!options.partial && !clean(body?.content)) errors.push({ field: "content", message: "content is required" });
  if (body?.noteType !== undefined && !PURCHASE_NOTE_TYPES.includes(body.noteType)) errors.push({ field: "noteType", message: "noteType is invalid" });
  return errors;
}

export function validateSupplierRiskPayload(body: any, options: { partial?: boolean } = {}) {
  const errors: Array<{ field: string; message: string }> = [];
  if (!options.partial && !clean(body?.supplierId)) errors.push({ field: "supplierId", message: "supplierId is required" });
  if (body?.riskType !== undefined && !SUPPLIER_RISK_TYPES.includes(body.riskType)) errors.push({ field: "riskType", message: "riskType is invalid" });
  if (body?.level !== undefined && !SUPPLIER_RISK_LEVELS.includes(body.level)) errors.push({ field: "level", message: "level is invalid" });
  if (body?.status !== undefined && !SUPPLIER_RISK_STATUSES.includes(body.status)) errors.push({ field: "status", message: "status is invalid" });
  return errors;
}

export function validateSupplierLinkPayload(body: any) {
  const errors: Array<{ field: string; message: string }> = [];
  if (!SUPPLIER_LINK_ENTITY_TYPES.includes(body?.entityType)) errors.push({ field: "entityType", message: "entityType is invalid" });
  if (!clean(body?.entityId)) errors.push({ field: "entityId", message: "entityId is required" });
  if (!SUPPLIER_LINK_RELATION_TYPES.includes(body?.relationType)) errors.push({ field: "relationType", message: "relationType is invalid" });
  return errors;
}

export function toSupplierData(body: any, userId: string, existing: any = null) {
  const data: Record<string, unknown> = {};
  for (const field of ["organizationId", "name", "contactName", "phone", "email", "whatsapp", "wechat", "country", "city", "address", "website", "riskLevel", "notes"] as const) {
    if (body[field] !== undefined) data[field] = field === "name" ? clean(body[field]) : nullableString(body[field]);
  }
  if (body.tags !== undefined) data.tags = arrayInput(body.tags);
  if (body.rating !== undefined) data.rating = numberInput(body.rating);
  if (body.status !== undefined) data.status = clean(body.status) || "candidate";
  if (!existing) data.createdBy = userId;
  return data;
}

export function toSupplierContactData(body: any, supplier: any, userId: string, existing: any = null) {
  const data: Record<string, unknown> = { organizationId: supplier.organizationId || null, supplierId: supplier.id };
  for (const field of ["name", "role", "phone", "email", "whatsapp", "wechat", "notes"] as const) {
    if (body[field] !== undefined) data[field] = field === "name" ? clean(body[field]) : nullableString(body[field]);
  }
  if (!existing) data.createdBy = userId;
  return data;
}

export function toSupplierQuoteData(body: any, supplier: any, userId: string, existing: any = null) {
  const data: Record<string, unknown> = { organizationId: supplier.organizationId || null, supplierId: supplier.id };
  for (const field of ["productId", "sku", "currency", "leadTime", "sampleLeadTime", "bulkLeadTime", "notes", "status"] as const) {
    if (body[field] !== undefined) data[field] = nullableString(body[field]);
  }
  if (body.moq !== undefined) data.moq = numberInput(body.moq);
  if (body.unitCost !== undefined) data.unitCost = decimalInput(body.unitCost);
  if (body.sampleFee !== undefined) data.sampleFee = decimalInput(body.sampleFee);
  if (body.validUntil !== undefined) data.validUntil = clean(body.validUntil) ? new Date(clean(body.validUntil)) : null;
  if (!existing) data.createdBy = userId;
  return data;
}

export function toPurchaseNoteData(body: any, userId: string, organizationId: string | null, existing: any = null) {
  const data: Record<string, unknown> = { organizationId };
  for (const field of ["supplierId", "productId", "orderId", "sampleOrderId", "customRequestId", "content", "noteType"] as const) {
    if (body[field] !== undefined) data[field] = field === "content" ? clean(body[field]) : nullableString(body[field]);
  }
  if (!data.noteType) data.noteType = "general";
  if (!existing) data.createdBy = userId;
  return data;
}

export function toSupplierRiskData(body: any, supplier: any, userId: string, existing: any = null) {
  const data: Record<string, unknown> = { organizationId: supplier.organizationId || null, supplierId: supplier.id };
  for (const field of ["riskType", "level", "description", "status"] as const) {
    if (body[field] !== undefined) data[field] = field === "description" ? nullableString(body[field]) : clean(body[field]);
  }
  if (!data.status) data.status = "open";
  if (!existing) data.createdBy = userId;
  return data;
}

export function serializeSupplier(row: any, options: { redactSensitive?: boolean } = {}) {
  return {
    id: row.id,
    organizationId: row.organizationId || null,
    name: row.name,
    contactName: row.contactName || null,
    phone: options.redactSensitive ? null : row.phone || null,
    email: options.redactSensitive ? null : row.email || null,
    whatsapp: options.redactSensitive ? null : row.whatsapp || null,
    wechat: options.redactSensitive ? null : row.wechat || null,
    country: row.country || null,
    city: row.city || null,
    website: row.website || null,
    tags: row.tags || [],
    rating: row.rating ?? null,
    status: row.status,
    riskLevel: row.riskLevel || null,
    notes: row.notes || null,
    createdBy: row.createdBy,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt)
  };
}

export function serializeSupplierContact(row: any, options: { redactSensitive?: boolean } = {}) {
  return {
    id: row.id,
    organizationId: row.organizationId || null,
    supplierId: row.supplierId,
    name: row.name,
    role: row.role || null,
    phone: options.redactSensitive ? null : row.phone || null,
    email: options.redactSensitive ? null : row.email || null,
    whatsapp: options.redactSensitive ? null : row.whatsapp || null,
    wechat: options.redactSensitive ? null : row.wechat || null,
    notes: row.notes || null,
    createdBy: row.createdBy,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt)
  };
}

export function serializeSupplierQuote(row: any) {
  return {
    id: row.id,
    organizationId: row.organizationId || null,
    supplierId: row.supplierId,
    productId: row.productId || null,
    productName: row.product?.name || null,
    sku: row.sku || row.product?.sku || null,
    moq: row.moq ?? null,
    unitCost: decimalString(row.unitCost),
    currency: row.currency || null,
    leadTime: row.leadTime || null,
    sampleFee: decimalString(row.sampleFee),
    sampleLeadTime: row.sampleLeadTime || null,
    bulkLeadTime: row.bulkLeadTime || null,
    validUntil: toIso(row.validUntil),
    notes: row.notes || null,
    status: row.status,
    createdBy: row.createdBy,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt)
  };
}

export function serializePurchaseNote(row: any) {
  return { ...row, createdAt: toIso(row.createdAt), updatedAt: toIso(row.updatedAt) };
}

export function serializeSupplierRisk(row: any) {
  return { ...row, createdAt: toIso(row.createdAt), updatedAt: toIso(row.updatedAt) };
}

export function serializeSupplierLink(row: any) {
  return { ...row, createdAt: toIso(row.createdAt) };
}

export function generateSupplierScript(input: {
  scenario: string;
  supplier?: any | null;
  product?: any | null;
  order?: any | null;
  sampleOrder?: any | null;
  customRequest?: any | null;
}) {
  const supplierName = input.supplier?.name || "supplier";
  const productName = input.product?.name || input.order?.product?.name || input.sampleOrder?.sampleName || "the product";
  const quantity = input.order?.quantity || input.customRequest?.quantity || "";
  const missingInfo: string[] = [];
  if (!input.product && !input.order && !input.sampleOrder && !input.customRequest) missingInfo.push("product / order / sample / custom context");
  if (["ask_price", "ask_bulk_order_cost", "negotiate_price"].includes(input.scenario) && !quantity) missingInfo.push("quantity");
  if (input.scenario === "ask_custom_feasibility" && !input.customRequest) missingInfo.push("custom requirement details");

  const scripts: Record<string, string> = {
    ask_price: `Hi ${supplierName}, please help confirm the cost for ${productName}${quantity ? `, quantity ${quantity}` : ""}. Please include MOQ, currency, lead time, and whether the price is still valid.`,
    ask_moq: `Hi ${supplierName}, please confirm the MOQ for ${productName}. If there are different MOQ levels for colors, sizes, or packaging, please list them clearly.`,
    ask_sample_fee: `Hi ${supplierName}, please confirm the sample fee, sample lead time, and shipping arrangement for ${productName}. We will confirm with the customer before making any commitment.`,
    ask_lead_time: `Hi ${supplierName}, please confirm the latest sample lead time and bulk production lead time for ${productName}. Please also tell us if there is any risk of delay.`,
    ask_bulk_order_cost: `Hi ${supplierName}, please quote the bulk order cost for ${productName}${quantity ? `, quantity ${quantity}` : ""}. Please include MOQ, packaging cost, production lead time, and currency.`,
    ask_custom_feasibility: `Hi ${supplierName}, please check whether this custom requirement can be made for ${productName}. Please confirm MOQ, sample fee, sample lead time, bulk lead time, and any artwork or packaging file requirement.`,
    ask_quality_issue: `Hi ${supplierName}, we received a quality issue report for ${productName}. Please help check the possible cause and what evidence you need, such as photos, videos, batch details, or packaging pictures.`,
    ask_reship_cost: `Hi ${supplierName}, please confirm the reshipment cost and preparation time for ${productName}. We need to review the case before confirming any solution to the customer.`,
    negotiate_price: `Hi ${supplierName}, thanks for the quote. Could you please check if there is a better cost for ${productName}${quantity ? ` at quantity ${quantity}` : ""}? Please do not reduce quality or change material unless you clearly tell us.`,
    confirm_purchase_details: `Hi ${supplierName}, before we move forward, please help confirm product details, quantity, unit cost, currency, MOQ, lead time, packaging, and payment terms. We will manually confirm internally before placing any purchase.`
  };
  const riskWarnings = [
    "Supplier / procurement script is only a draft. The team must manually confirm before sending.",
    "Do not auto-contact suppliers, auto-place purchase orders, auto-confirm supplier payment, or auto-apply supplier cost.",
    "Confirm price, MOQ, lead time, quality requirements, and reship cost manually before using them for customer promises or order cost."
  ];
  if (missingInfo.length) riskWarnings.push("Missing supplier or procurement context. Confirm missing product, quantity, specification, or custom details before sending.");
  return {
    scriptText: scripts[input.scenario] || scripts.ask_price,
    alternativeScripts: [
      `Please help confirm the latest details for ${productName}: cost, MOQ, lead time, quality requirements, and valid period.`,
      `Could you check this request and tell us any risk before we confirm with the customer?`
    ],
    riskWarnings: Array.from(new Set(riskWarnings)),
    missingInfo
  };
}

export function validateSupplierScriptScenario(value: string) {
  return SUPPLIER_SCRIPT_SCENARIOS.includes(value as any);
}
