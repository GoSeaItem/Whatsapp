import {
  DEFAULT_CUSTOMER_STAGES,
  type CustomerDetail,
  type CustomerSummary,
  type CustomerUpsertRequest,
  type CustomerValidationError
} from "@wa-ai/shared";

type RawCustomer = {
  id: string;
  name: string;
  whatsappNumber: string | null;
  country: string | null;
  language: string | null;
  tags: string[];
  stage: string;
  interestedProduct: string | null;
  latestSummary: string | null;
  nextFollowUpAt: Date | null;
  ownerId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function serializeCustomer(customer: RawCustomer): CustomerSummary | CustomerDetail {
  return {
    id: customer.id,
    name: customer.name,
    whatsappNumber: customer.whatsappNumber,
    country: customer.country,
    language: customer.language,
    tags: customer.tags,
    stage: customer.stage,
    interestedProduct: customer.interestedProduct,
    latestSummary: customer.latestSummary,
    nextFollowUpAt: customer.nextFollowUpAt?.toISOString() || null,
    ownerId: customer.ownerId,
    notes: customer.notes,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString()
  };
}

export function validateCustomerPayload(input: Partial<CustomerUpsertRequest>, options: { partial?: boolean } = {}) {
  const errors: CustomerValidationError[] = [];
  const name = cleanString(input.name);

  if (!options.partial && !name) {
    errors.push({ field: "name", message: "客户名称不能为空" });
  }
  if (input.name !== undefined && !name) {
    errors.push({ field: "name", message: "客户名称不能为空" });
  }
  if (name && name.length > 80) {
    errors.push({ field: "name", message: "客户名称不能超过 80 个字符" });
  }

  const whatsappNumber = cleanString(input.whatsappNumber);
  if (whatsappNumber && whatsappNumber.length > 40) {
    errors.push({ field: "whatsappNumber", message: "WhatsApp 号码不能超过 40 个字符" });
  }

  const stage = cleanString(input.stage);
  if (stage && !DEFAULT_CUSTOMER_STAGES.includes(stage as (typeof DEFAULT_CUSTOMER_STAGES)[number])) {
    errors.push({ field: "stage", message: "销售阶段不在默认选项中" });
  }

  const tags = normalizeTags(input.tags);
  if (tags.length > 12) {
    errors.push({ field: "tags", message: "标签最多 12 个" });
  }
  if (tags.some((tag) => tag.length > 20)) {
    errors.push({ field: "tags", message: "单个标签不能超过 20 个字符" });
  }

  const nextFollowUpAt = cleanString(input.nextFollowUpAt);
  if (nextFollowUpAt && Number.isNaN(Date.parse(nextFollowUpAt))) {
    errors.push({ field: "nextFollowUpAt", message: "跟进时间格式不正确" });
  }

  return errors;
}

export function toCustomerCreateData(input: CustomerUpsertRequest) {
  return {
    name: cleanString(input.name),
    whatsappNumber: cleanString(input.whatsappNumber) || null,
    country: cleanString(input.country) || null,
    language: cleanString(input.language) || "English",
    tags: normalizeTags(input.tags),
    stage: cleanString(input.stage) || DEFAULT_CUSTOMER_STAGES[0],
    interestedProduct: cleanString(input.interestedProduct) || null,
    latestSummary: cleanString(input.latestSummary) || null,
    nextFollowUpAt: parseDateOrNull(input.nextFollowUpAt),
    notes: cleanString(input.notes) || null
  };
}

export function toCustomerUpdateData(input: Partial<CustomerUpsertRequest>) {
  const data: Record<string, unknown> = {};

  setIfPresent(data, "name", input.name, cleanString);
  setIfPresent(data, "whatsappNumber", input.whatsappNumber, nullableString);
  setIfPresent(data, "country", input.country, nullableString);
  setIfPresent(data, "language", input.language, (value) => cleanString(value) || "English");
  if (input.tags !== undefined) data.tags = normalizeTags(input.tags);
  setIfPresent(data, "stage", input.stage, (value) => cleanString(value) || DEFAULT_CUSTOMER_STAGES[0]);
  setIfPresent(data, "interestedProduct", input.interestedProduct, nullableString);
  setIfPresent(data, "latestSummary", input.latestSummary, nullableString);
  if (input.nextFollowUpAt !== undefined) data.nextFollowUpAt = parseDateOrNull(input.nextFollowUpAt);
  setIfPresent(data, "notes", input.notes, nullableString);

  return data;
}

export function normalizeTags(value: unknown) {
  const raw = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return Array.from(new Set(raw.map((item) => cleanString(item)).filter(Boolean)));
}

function setIfPresent(
  data: Record<string, unknown>,
  key: string,
  value: unknown,
  transform: (value: unknown) => unknown
) {
  if (value !== undefined) {
    data[key] = transform(value);
  }
}

function nullableString(value: unknown) {
  return cleanString(value) || null;
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseDateOrNull(value: unknown) {
  const text = cleanString(value);
  return text ? new Date(text) : null;
}
