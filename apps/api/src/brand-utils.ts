import type { BrandAssignmentEntityType, BrandRuleType, BrandScriptType, BrandStatus } from "@wa-ai/shared";
import { BRAND_ASSIGNMENT_ENTITY_TYPES, BRAND_RULE_TYPES, BRAND_SCRIPT_TYPES, BRAND_STATUSES } from "@wa-ai/shared";

export function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function nullableString(value: unknown) {
  const text = clean(value);
  return text || null;
}

export function booleanValue(value: unknown, fallback = true) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return fallback;
}

export function validateBrandPayload(body: any, options: { partial?: boolean } = {}) {
  const errors: string[] = [];
  if (!options.partial && !clean(body.name)) errors.push("name is required");
  if (body.status !== undefined && !BRAND_STATUSES.includes(clean(body.status) as BrandStatus)) errors.push("status is invalid");
  return errors;
}

export function validateBrandRulePayload(body: any, options: { partial?: boolean } = {}) {
  const errors: string[] = [];
  if (!options.partial && !clean(body.ruleType)) errors.push("ruleType is required");
  if (!options.partial && !clean(body.title)) errors.push("title is required");
  if (!options.partial && !clean(body.content)) errors.push("content is required");
  if (body.ruleType !== undefined && !BRAND_RULE_TYPES.includes(clean(body.ruleType) as BrandRuleType)) errors.push("ruleType is invalid");
  return errors;
}

export function validateBrandScriptPayload(body: any) {
  const errors: string[] = [];
  if (!clean(body.scriptId)) errors.push("scriptId is required");
  if (!clean(body.scriptType)) errors.push("scriptType is required");
  if (body.scriptType !== undefined && !BRAND_SCRIPT_TYPES.includes(clean(body.scriptType) as BrandScriptType)) errors.push("scriptType is invalid");
  return errors;
}

export function validateBrandAssignmentPayload(body: any) {
  const errors: string[] = [];
  if (!clean(body.entityType)) errors.push("entityType is required");
  if (!clean(body.entityId)) errors.push("entityId is required");
  if (body.entityType !== undefined && !BRAND_ASSIGNMENT_ENTITY_TYPES.includes(clean(body.entityType) as BrandAssignmentEntityType)) errors.push("entityType is invalid");
  return errors;
}

export function toBrandData(body: any, organizationId: string, userId: string, existing?: any) {
  const data: any = {};
  if (!existing) {
    data.organizationId = organizationId;
    data.createdBy = userId;
    data.status = clean(body.status) || "active";
  }
  for (const field of ["name", "displayName", "description", "logoUrl", "website", "defaultLanguage", "defaultCurrency", "country", "status", "notes"]) {
    if (body[field] !== undefined) data[field] = field === "name" || field === "status" ? clean(body[field]) : nullableString(body[field]);
  }
  return data;
}

export function toBrandRuleData(body: any, brand: any, userId: string, existing?: any) {
  const data: any = {};
  if (!existing) {
    data.organizationId = brand.organizationId;
    data.brandId = brand.id;
    data.createdBy = userId;
  }
  for (const field of ["ruleType", "title", "content", "language"]) {
    if (body[field] !== undefined) data[field] = field === "language" ? nullableString(body[field]) : clean(body[field]);
  }
  if (body.enabled !== undefined) data.enabled = booleanValue(body.enabled, true);
  return data;
}

export function serializeBrand(row: any, counts: { productCount?: number; materialCount?: number; ruleCount?: number } = {}) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    displayName: row.displayName,
    description: row.description,
    logoUrl: row.logoUrl,
    website: row.website,
    defaultLanguage: row.defaultLanguage,
    defaultCurrency: row.defaultCurrency,
    country: row.country,
    status: row.status,
    notes: row.notes,
    createdBy: row.createdBy,
    createdAt: row.createdAt?.toISOString?.() || row.createdAt,
    updatedAt: row.updatedAt?.toISOString?.() || row.updatedAt,
    ...counts
  };
}

export function serializeBrandRule(row: any) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    brandId: row.brandId,
    ruleType: row.ruleType,
    title: row.title,
    content: row.content,
    language: row.language,
    enabled: row.enabled,
    createdBy: row.createdBy,
    createdAt: row.createdAt?.toISOString?.() || row.createdAt,
    updatedAt: row.updatedAt?.toISOString?.() || row.updatedAt
  };
}

export function serializeBrandLink(row: any) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    brandId: row.brandId,
    productId: row.productId,
    materialId: row.materialId,
    knowledgeBaseId: row.knowledgeBaseId,
    scriptId: row.scriptId,
    scriptType: row.scriptType,
    createdBy: row.createdBy,
    createdAt: row.createdAt?.toISOString?.() || row.createdAt
  };
}

export function serializeBrandAssignment(row: any) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    brandId: row.brandId,
    entityType: row.entityType,
    entityId: row.entityId,
    assignedBy: row.assignedBy,
    createdAt: row.createdAt?.toISOString?.() || row.createdAt
  };
}

export function brandRulesAsKnowledge(rules: any[]) {
  return rules
    .filter((rule) => rule.enabled !== false)
    .map((rule) => ({
      id: rule.id,
      title: `[Brand] ${rule.title}`,
      category: mapRuleTypeToCategory(rule.ruleType),
      content: rule.content,
      language: rule.language || "other",
      productId: null,
      source: "Brand" as const
    }));
}

export function brandRiskWarnings(input: { brand?: any | null; rules: any[]; scenario?: string | null; mismatch?: boolean }) {
  const warnings = [
    "Brand context only provides draft guidance. Confirm price, stock, lead time, shipping, payment and after-sales policy before sending."
  ];
  if (!input.brand) warnings.push("No brand context was selected. Confirm the brand/store identity before sending.");
  if (input.brand && input.rules.length === 0) warnings.push("Current brand has no related rules. Confirm brand quote rules, payment instructions, logistics and after-sales policy manually.");
  if (input.mismatch) warnings.push("Selected brand differs from the customer or entity brand. Confirm before using this brand context.");
  return warnings;
}

function mapRuleTypeToCategory(ruleType: string) {
  if (ruleType === "quote_rule") return "quote_rules";
  if (ruleType === "payment_method") return "payment_methods";
  if (ruleType === "after_sales_policy") return "after_sales_policy";
  if (ruleType === "forbidden_expression") return "forbidden_expressions";
  if (ruleType === "logistics") return "logistics";
  return "faq";
}
