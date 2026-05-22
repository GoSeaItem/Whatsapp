import {
  KNOWLEDGE_BASE_CATEGORIES,
  KNOWLEDGE_BASE_LANGUAGES,
  MATERIAL_LANGUAGES,
  MATERIAL_TYPES,
  ORGANIZATION_IMPORT_EXPORT_TYPES,
  SCRIPT_ORG_CATEGORIES,
  type OrganizationImportExportType
} from "@wa-ai/shared";
import { prisma } from "./db.js";
import { escapeCsvCell, parseCsv, type ImportResult } from "./import-export-utils.js";

export const ORG_IMPORT_EXPORT_TYPES = ORGANIZATION_IMPORT_EXPORT_TYPES;

type Row = Record<string, string>;
type RowError = { row: number; field: string; message: string };

export type OrgImportExportDb = typeof prisma;

export const ORG_EXPORT_HEADERS: Record<OrganizationImportExportType, string[]> = {
  customer: ["name", "whatsappNumber", "email", "socialLinks", "country", "language", "tags", "stage", "assignedTo", "collaborators", "interestedProduct", "latestSummary", "nextFollowUpAt", "notes", "createdAt", "updatedAt"],
  product: ["name", "sku", "category", "images", "videos", "colors", "sizes", "material", "moq", "suggestedPrice", "minPrice", "leadTime", "sellingPoints", "introEn", "introEs", "introPt", "introAr", "createdBy", "createdAt", "updatedAt"],
  material: ["title", "type", "url", "description", "language", "productSku", "tags", "createdBy", "createdAt", "updatedAt"],
  knowledge: ["title", "category", "content", "language", "enabled", "createdBy", "createdAt", "updatedAt"],
  script: ["title", "category", "content", "language", "enabled", "createdBy", "createdAt", "updatedAt"]
};

const NORMAL_ORG_EXPORT_HEADERS: Partial<Record<OrganizationImportExportType, string[]>> = {
  customer: ["name", "country", "language", "tags", "stage", "assignedTo", "interestedProduct", "nextFollowUpAt", "createdAt", "updatedAt"],
  product: ["name", "sku", "category", "moq", "leadTime", "sellingPoints", "createdBy", "createdAt", "updatedAt"],
  material: ["title", "type", "url", "description", "language", "productSku", "tags", "createdBy", "createdAt", "updatedAt"],
  knowledge: ["title", "category", "content", "language", "enabled", "createdBy", "createdAt", "updatedAt"],
  script: ["title", "category", "content", "language", "enabled", "createdBy", "createdAt", "updatedAt"]
};

export function isOrgImportExportType(value: string): value is OrganizationImportExportType {
  return (ORG_IMPORT_EXPORT_TYPES as readonly string[]).includes(value);
}

export function orgTypeLabel(type: OrganizationImportExportType) {
  return `organization-${type}`;
}

export function stringifyOrgCsv(rows: Row[], headers: string[]) {
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escapeCsvCell(row[header] || "")).join(","))].join("\n") + "\n";
}

export async function exportOrganizationCsv(db: any, type: OrganizationImportExportType, organizationId: string, filters: Record<string, unknown> = {}) {
  const rows = await loadOrganizationRows(db, type, organizationId, filters);
  const fieldsScope = filters.fieldsScope === "sensitive" ? "sensitive" : "normal";
  return stringifyOrgCsv(rows, orgExportHeadersForScope(type, fieldsScope));
}

export function orgExportHeadersForScope(type: OrganizationImportExportType, fieldsScope: "normal" | "sensitive" = "normal") {
  return fieldsScope === "sensitive" ? ORG_EXPORT_HEADERS[type] : (NORMAL_ORG_EXPORT_HEADERS[type] || ORG_EXPORT_HEADERS[type]);
}

export async function importOrganizationCsv(
  db: any,
  type: OrganizationImportExportType,
  organizationId: string,
  userId: string,
  csvText: string,
  options: { dryRun?: boolean; skipDuplicates?: boolean } = {}
): Promise<ImportResult> {
  const parsed = parseCsv(csvText);
  const rows = parsed.rows.map(stripSensitiveFields);
  const dryRun = Boolean(options.dryRun);
  const skipDuplicates = options.skipDuplicates !== false;
  let successCount = 0;
  let skippedCount = 0;
  const errors: RowError[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const rowNumber = index + 2;
    const result = await buildOrgImportData(db, type, rows[index], rowNumber, { organizationId, userId, dryRun, skipDuplicates });
    if (result.errors.length) {
      errors.push(...result.errors);
      continue;
    }
    if (result.skipped) {
      skippedCount += 1;
      continue;
    }
    if (!dryRun && result.create) await result.create();
    successCount += 1;
  }

  return {
    totalRows: rows.length,
    successCount,
    failureCount: errors.length ? new Set(errors.map((error) => error.row)).size : 0,
    skippedCount,
    errors,
    dryRun
  };
}

async function loadOrganizationRows(db: any, type: OrganizationImportExportType, organizationId: string, filters: Record<string, unknown>): Promise<Row[]> {
  const dateWhere = createdAtWhere(filters);
  if (type === "customer") {
    const where: any = { organizationId, ...dateWhere };
    if (stringFilter(filters.ownerId)) where.ownerId = stringFilter(filters.ownerId);
    if (stringFilter(filters.assignedTo)) where.assignedTo = stringFilter(filters.assignedTo);
    if (stringFilter(filters.stage)) where.stage = stringFilter(filters.stage);
    const items = await db.customer.findMany({ where, orderBy: { createdAt: "desc" } });
    return items.map((item: any) => ({
      name: item.name,
      whatsappNumber: item.whatsappNumber,
      email: item.email,
      socialLinks: joinArray(item.socialLinks),
      country: item.country,
      language: item.language,
      tags: joinArray(item.tags),
      stage: item.stage,
      assignedTo: item.assignedTo,
      collaborators: joinArray(item.collaborators),
      interestedProduct: item.interestedProduct,
      latestSummary: item.latestSummary,
      nextFollowUpAt: iso(item.nextFollowUpAt),
      notes: item.notes,
      createdAt: iso(item.createdAt),
      updatedAt: iso(item.updatedAt)
    }));
  }
  if (type === "product") {
    const where: any = { organizationId, ...createdAtWhere(filters, "product") };
    const items = await db.organizationProduct.findMany({ where, include: { product: true }, orderBy: { createdAt: "desc" } });
    return items
      .filter((item: any) => matchesText(item.product, filters.q, ["name", "sku", "category"]))
      .map((item: any) => ({
        name: item.product.name,
        sku: item.product.sku,
        category: item.product.category,
        images: joinArray(item.product.images),
        videos: joinArray(item.product.videos),
        colors: joinArray(item.product.colors),
        sizes: joinArray(item.product.sizes),
        material: item.product.material,
        moq: item.product.moq,
        suggestedPrice: decimal(item.product.suggestedPrice),
        minPrice: decimal(item.product.minPrice),
        leadTime: item.product.leadTime,
        sellingPoints: joinArray(item.product.sellingPoints),
        introEn: item.product.introEn,
        introEs: item.product.introEs,
        introPt: item.product.introPt,
        introAr: item.product.introAr,
        createdBy: item.createdBy,
        createdAt: iso(item.createdAt),
        updatedAt: iso(item.updatedAt)
      }));
  }
  if (type === "material") {
    const items = await db.organizationMaterial.findMany({ where: { organizationId, ...createdAtWhere(filters, "material") }, include: { material: { include: { product: true } } }, orderBy: { createdAt: "desc" } });
    return items
      .filter((item: any) => matchesText(item.material, filters.q, ["title", "type", "description"]))
      .map((item: any) => ({
        title: item.material.title,
        type: item.material.type,
        url: item.material.url,
        description: item.material.description,
        language: item.material.language,
        productSku: item.material.product?.sku || "",
        tags: joinArray(item.material.tags),
        createdBy: item.createdBy,
        createdAt: iso(item.createdAt),
        updatedAt: iso(item.updatedAt)
      }));
  }
  if (type === "knowledge") {
    const where: any = { organizationId, ...dateWhere };
    if (stringFilter(filters.category)) where.category = stringFilter(filters.category);
    if (stringFilter(filters.language)) where.language = stringFilter(filters.language);
    const items = await db.knowledgeBaseOrg.findMany({ where, orderBy: { createdAt: "desc" } });
    return items.map((item: any) => ({ title: item.title, category: item.category, content: item.content, language: item.language, enabled: String(Boolean(item.enabled)), createdBy: item.createdBy, createdAt: iso(item.createdAt), updatedAt: iso(item.updatedAt) }));
  }
  const where: any = { organizationId, ...dateWhere };
  if (stringFilter(filters.category)) where.category = stringFilter(filters.category);
  if (stringFilter(filters.language)) where.language = stringFilter(filters.language);
  const items = await db.scriptOrg.findMany({ where, orderBy: { createdAt: "desc" } });
  return items.map((item: any) => ({ title: item.title, category: item.category, content: item.content, language: item.language, enabled: String(Boolean(item.enabled)), createdBy: item.createdBy, createdAt: iso(item.createdAt), updatedAt: iso(item.updatedAt) }));
}

async function buildOrgImportData(
  db: any,
  type: OrganizationImportExportType,
  row: Row,
  rowNumber: number,
  ctx: { organizationId: string; userId: string; dryRun: boolean; skipDuplicates: boolean }
): Promise<{ errors: RowError[]; skipped?: boolean; create?: () => Promise<unknown> }> {
  if (type === "customer") return buildOrgCustomer(db, row, rowNumber, ctx);
  if (type === "product") return buildOrgProduct(db, row, rowNumber, ctx);
  if (type === "material") return buildOrgMaterial(db, row, rowNumber, ctx);
  if (type === "knowledge") return buildOrgKnowledge(db, row, rowNumber, ctx);
  return buildOrgScript(db, row, rowNumber, ctx);
}

async function buildOrgCustomer(db: any, row: Row, rowNumber: number, ctx: { organizationId: string; userId: string; dryRun: boolean; skipDuplicates: boolean }) {
  const errors = requireFields(row, rowNumber, ["name"]);
  const socialLinks = splitArray(row.socialLinks);
  if (socialLinks.some((link) => !/^https?:\/\/\S+$/i.test(link))) errors.push({ row: rowNumber, field: "socialLinks", message: "socialLinks must be http/https URLs" });
  const duplicate = await findOrgCustomerDuplicate(db, ctx.organizationId, { whatsappNumber: row.whatsappNumber, email: row.email, socialLinks });
  if (duplicate) {
    if (ctx.dryRun || !ctx.skipDuplicates) {
      errors.push({ row: rowNumber, field: duplicate.fields.join("|"), message: `duplicate customer detected: ${duplicate.customer.name || duplicate.customer.id}` });
    } else {
      return { errors: [], skipped: true };
    }
  }
  const nextFollowUpAt = parseOptionalDate(row.nextFollowUpAt, "nextFollowUpAt", rowNumber, errors);
  const assignedTo = row.assignedTo || ctx.userId;
  if (assignedTo) await ensureOrgMember(db, ctx.organizationId, assignedTo, "assignedTo", rowNumber, errors);
  const collaborators = splitArray(row.collaborators);
  for (const collaborator of collaborators) await ensureOrgMember(db, ctx.organizationId, collaborator, "collaborators", rowNumber, errors);
  return {
    errors,
    create: () => db.customer.create({
      data: {
        name: row.name,
        whatsappNumber: emptyToNull(row.whatsappNumber),
        email: emptyToNull(row.email),
        socialLinks,
        country: emptyToNull(row.country),
        language: emptyToNull(row.language),
        tags: splitArray(row.tags),
        ...(row.stage ? { stage: row.stage } : {}),
        interestedProduct: emptyToNull(row.interestedProduct),
        latestSummary: emptyToNull(row.latestSummary),
        nextFollowUpAt,
        notes: emptyToNull(row.notes),
        ownerId: ctx.userId,
        organizationId: ctx.organizationId,
        assignedTo,
        collaborators
      }
    })
  };
}

async function buildOrgProduct(db: any, row: Row, rowNumber: number, ctx: { organizationId: string; userId: string; dryRun: boolean; skipDuplicates: boolean }) {
  const errors = requireFields(row, rowNumber, ["name"]);
  const sku = row.sku || slugSku(row.name, rowNumber);
  if (ctx.skipDuplicates && await findOrgProductBySku(db, ctx.organizationId, sku)) return { errors: [], skipped: true };
  const moq = parseOptionalInteger(row.moq, "moq", rowNumber, errors);
  const suggestedPrice = parseOptionalNumber(row.suggestedPrice, "suggestedPrice", rowNumber, errors);
  const minPrice = parseOptionalNumber(row.minPrice, "minPrice", rowNumber, errors);
  return {
    errors,
    create: async () => {
      const product = await db.product.create({
        data: {
          name: row.name,
          sku,
          category: emptyToNull(row.category),
          images: splitArray(row.images),
          videos: splitArray(row.videos),
          colors: splitArray(row.colors),
          sizes: splitArray(row.sizes),
          material: emptyToNull(row.material),
          moq,
          suggestedPrice,
          minPrice,
          leadTime: emptyToNull(row.leadTime),
          sellingPoints: splitArray(row.sellingPoints),
          introEn: emptyToNull(row.introEn),
          introEs: emptyToNull(row.introEs),
          introPt: emptyToNull(row.introPt),
          introAr: emptyToNull(row.introAr),
          ownerId: ctx.userId
        }
      });
      await db.organizationProduct.create({ data: { organizationId: ctx.organizationId, productId: product.id, createdBy: ctx.userId } });
      return product;
    }
  };
}

async function buildOrgMaterial(db: any, row: Row, rowNumber: number, ctx: { organizationId: string; userId: string }) {
  const errors = requireFields(row, rowNumber, ["title", "type", "url"]);
  enumValue(row.type, MATERIAL_TYPES, "type", rowNumber, errors);
  const language = row.language || "other";
  enumValue(language, MATERIAL_LANGUAGES, "language", rowNumber, errors);
  if (row.url && !/^https?:\/\//i.test(row.url)) errors.push({ row: rowNumber, field: "url", message: "url must start with http:// or https://" });
  const product = await findOrgProductBySku(db, ctx.organizationId, row.productSku || "");
  if (row.productSku && !product) errors.push({ row: rowNumber, field: "productSku", message: "productSku not found in organization products" });
  return {
    errors,
    create: async () => {
      const material = await db.material.create({ data: { title: row.title, type: row.type, url: row.url, description: emptyToNull(row.description), language, productId: product?.id || null, tags: splitArray(row.tags), ownerId: ctx.userId } });
      await db.organizationMaterial.create({ data: { organizationId: ctx.organizationId, materialId: material.id, createdBy: ctx.userId } });
      return material;
    }
  };
}

async function buildOrgKnowledge(db: any, row: Row, rowNumber: number, ctx: { organizationId: string; userId: string }) {
  const errors = requireFields(row, rowNumber, ["title", "category", "content"]);
  enumValue(row.category, KNOWLEDGE_BASE_CATEGORIES, "category", rowNumber, errors);
  const language = row.language || "other";
  enumValue(language, KNOWLEDGE_BASE_LANGUAGES, "language", rowNumber, errors);
  return {
    errors,
    create: () => db.knowledgeBaseOrg.create({ data: { organizationId: ctx.organizationId, title: row.title, category: row.category, content: row.content, language, enabled: parseBoolean(row.enabled, true), createdBy: ctx.userId } })
  };
}

async function buildOrgScript(db: any, row: Row, rowNumber: number, ctx: { organizationId: string; userId: string }) {
  const errors = requireFields(row, rowNumber, ["title", "category", "content"]);
  enumValue(row.category, SCRIPT_ORG_CATEGORIES, "category", rowNumber, errors);
  const language = row.language || "other";
  enumValue(language, KNOWLEDGE_BASE_LANGUAGES, "language", rowNumber, errors);
  return {
    errors,
    create: () => db.scriptOrg.create({ data: { organizationId: ctx.organizationId, title: row.title, category: row.category, content: row.content, language, enabled: parseBoolean(row.enabled, true), createdBy: ctx.userId } })
  };
}

async function ensureOrgMember(db: any, organizationId: string, userId: string, field: string, row: number, errors: RowError[]) {
  const member = await db.organizationMember.findFirst({ where: { organizationId, userId, status: "active" } });
  if (!member) errors.push({ row, field, message: `${field} must be an active organization member` });
}

async function findOrgCustomerDuplicate(db: any, organizationId: string, input: { whatsappNumber?: string; email?: string; socialLinks?: string[] }) {
  const fields: string[] = [];
  const OR: Record<string, unknown>[] = [];
  if (input.whatsappNumber) {
    fields.push("whatsappNumber");
    OR.push({ whatsappNumber: input.whatsappNumber });
  }
  if (input.email) {
    fields.push("email");
    OR.push({ email: input.email });
  }
  const socialLinks = splitArray(input.socialLinks);
  if (socialLinks.length) {
    fields.push("socialLinks");
    OR.push({ socialLinks: { hasSome: socialLinks } });
  }
  if (!OR.length) return null;
  const customer = await db.customer.findFirst({ where: { organizationId, OR } });
  if (!customer) return null;
  return { customer, fields };
}

async function findOrgProductBySku(db: any, organizationId: string, sku: string) {
  if (!sku) return null;
  const links = await db.organizationProduct.findMany({ where: { organizationId }, include: { product: true } });
  return links.map((link: any) => link.product).find((product: any) => product?.sku === sku) || null;
}

function createdAtWhere(filters: Record<string, unknown>, relation?: string) {
  const createdAt: Record<string, Date> = {};
  if (stringFilter(filters.from)) createdAt.gte = new Date(stringFilter(filters.from));
  if (stringFilter(filters.to)) createdAt.lte = new Date(stringFilter(filters.to));
  if (!Object.keys(createdAt).length) return {};
  return relation ? { [relation]: { createdAt } } : { createdAt };
}

function matchesText(value: any, q: unknown, keys: string[]) {
  const text = stringFilter(q).toLowerCase();
  if (!text) return true;
  return keys.some((key) => String(value?.[key] || "").toLowerCase().includes(text));
}

function stripSensitiveFields(row: Row) {
  const normalizeKey = (key: string) => key.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const blocked = new Set(["ownerid", "createdby", "organizationid", "password", "passwordhash", "token", "secret", "apikey", "openaiapikey", "session", "sessionsecret", "cookie", "cookiesecret"]);
  return Object.fromEntries(Object.entries(row).filter(([key]) => !blocked.has(normalizeKey(key))));
}

function requireFields(row: Row, rowNumber: number, fields: string[]) {
  return fields.flatMap((field) => row[field] ? [] : [{ row: rowNumber, field, message: `${field} is required` }]);
}

function enumValue(value: string, allowed: readonly string[], field: string, row: number, errors: RowError[]) {
  if (!allowed.includes(value)) errors.push({ row, field, message: `${field} is invalid` });
}

function parseOptionalNumber(value: string | undefined, field: string, row: number, errors: RowError[]) {
  if (!value) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) {
    errors.push({ row, field, message: `${field} must be a number` });
    return null;
  }
  return number;
}

function parseOptionalInteger(value: string | undefined, field: string, row: number, errors: RowError[]) {
  if (!value) return null;
  const number = Number(value);
  if (!Number.isInteger(number)) {
    errors.push({ row, field, message: `${field} must be an integer` });
    return null;
  }
  return number;
}

function parseOptionalDate(value: string | undefined, field: string, row: number, errors: RowError[]) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    errors.push({ row, field, message: `${field} must be a valid date` });
    return null;
  }
  return date;
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (!value) return fallback;
  return ["true", "1", "yes", "y"].includes(value.toLowerCase());
}

function splitArray(value?: string | string[]) {
  const raw = Array.isArray(value) ? value : value ? value.split("|") : [];
  return raw.map((item) => item.trim()).filter(Boolean);
}

function joinArray(value?: unknown[]) {
  return Array.isArray(value) ? value.filter((item) => item !== null && item !== undefined).join("|") : "";
}

function emptyToNull(value?: string) {
  return value ? value : null;
}

function iso(value: unknown) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function decimal(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
}

function slugSku(name: string, rowNumber: number) {
  const slug = (name || "product").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "product";
  return `${slug}-${rowNumber}`;
}

function stringFilter(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
