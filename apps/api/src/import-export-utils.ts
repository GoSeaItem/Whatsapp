import {
  CUSTOM_REQUEST_STATUSES,
  CUSTOM_REQUEST_TYPES,
  KNOWLEDGE_BASE_CATEGORIES,
  KNOWLEDGE_BASE_LANGUAGES,
  MATERIAL_LANGUAGES,
  MATERIAL_TYPES,
  SAMPLE_FEEDBACK_STATUSES,
  SAMPLE_PAYMENT_STATUSES,
  SAMPLE_SHIPPING_STATUSES
} from "@wa-ai/shared";

export const IMPORT_EXPORT_TYPES = [
  "customers",
  "products",
  "knowledge-base",
  "materials",
  "sample-orders",
  "custom-requests"
] as const;

export type ImportExportType = typeof IMPORT_EXPORT_TYPES[number];

export const MAX_CSV_BYTES = 5 * 1024 * 1024;

type Row = Record<string, string>;
type ValidationError = { row: number; field: string; message: string };
type ImportContext = { db: ImportExportDb; ownerId: string; dryRun: boolean; skipDuplicates: boolean };
type BuildResult = { data?: Record<string, unknown>; skipped?: boolean; errors: ValidationError[] };

export type ImportResult = {
  totalRows: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
  errors: ValidationError[];
  dryRun: boolean;
};

export type ImportExportDb = {
  customer: {
    findMany(args: Record<string, unknown>): Promise<unknown[]>;
    findFirst(args: Record<string, unknown>): Promise<any | null>;
    create(args: Record<string, unknown>): Promise<unknown>;
  };
  product: {
    findMany(args: Record<string, unknown>): Promise<unknown[]>;
    findFirst(args: Record<string, unknown>): Promise<any | null>;
    create(args: Record<string, unknown>): Promise<unknown>;
  };
  knowledgeBase: {
    findMany(args: Record<string, unknown>): Promise<unknown[]>;
    create(args: Record<string, unknown>): Promise<unknown>;
  };
  material: {
    findMany(args: Record<string, unknown>): Promise<unknown[]>;
    create(args: Record<string, unknown>): Promise<unknown>;
  };
  sampleOrder: {
    findMany(args: Record<string, unknown>): Promise<unknown[]>;
    create(args: Record<string, unknown>): Promise<unknown>;
  };
  customRequest: {
    findMany(args: Record<string, unknown>): Promise<unknown[]>;
    create(args: Record<string, unknown>): Promise<unknown>;
  };
};

export const EXPORT_HEADERS: Record<ImportExportType, string[]> = {
  customers: ["name", "whatsappNumber", "country", "language", "tags", "stage", "interestedProduct", "latestSummary", "nextFollowUpAt", "notes", "createdAt", "updatedAt"],
  products: ["name", "sku", "category", "images", "videos", "colors", "sizes", "material", "moq", "suggestedPrice", "minPrice", "leadTime", "sellingPoints", "introEn", "introEs", "introPt", "introAr", "createdAt", "updatedAt"],
  "knowledge-base": ["title", "category", "content", "language", "productSku", "enabled", "createdAt", "updatedAt"],
  materials: ["title", "type", "url", "description", "language", "productSku", "tags", "createdAt", "updatedAt"],
  "sample-orders": ["customerName", "customerWhatsappNumber", "sampleName", "productSku", "sampleFee", "shippingCost", "currency", "paymentStatus", "shippingStatus", "trackingNumber", "feedbackStatus", "expectedShipDate", "expectedDeliveryDate", "notes", "createdAt", "updatedAt"],
  "custom-requests": ["customerName", "customerWhatsappNumber", "requestType", "productSku", "logoRequired", "packagingRequired", "colorRequirement", "sizeRequirement", "materialRequirement", "quantity", "moq", "sampleFee", "sampleLeadTime", "bulkLeadTime", "files", "status", "notes", "createdAt", "updatedAt"]
};

export const TEMPLATE_ROWS: Record<ImportExportType, Row> = {
  customers: {
    name: "Maria Buyer",
    whatsappNumber: "+5215512345678",
    country: "Mexico",
    language: "English",
    tags: "new|high_intent",
    stage: "new_lead",
    interestedProduct: "Blue Dress",
    latestSummary: "Asked for MOQ and shipping",
    nextFollowUpAt: "2026-05-21T09:00:00.000Z",
    notes: "Template example only"
  },
  products: {
    name: "Blue Dress",
    sku: "BD-001",
    category: "Dress",
    images: "https://example.com/blue-dress.jpg",
    videos: "",
    colors: "blue|black",
    sizes: "S|M|L",
    material: "cotton",
    moq: "100",
    suggestedPrice: "12.50",
    minPrice: "10.00",
    leadTime: "15 days",
    sellingPoints: "soft fabric|fast selling style",
    introEn: "",
    introEs: "",
    introPt: "",
    introAr: ""
  },
  "knowledge-base": {
    title: "Shipping to Mexico",
    category: "logistics",
    content: "Shipping time must be confirmed by city and shipping method.",
    language: "en",
    productSku: "",
    enabled: "true"
  },
  materials: {
    title: "Blue Dress Real Photo",
    type: "image",
    url: "https://example.com/blue-dress-real.jpg",
    description: "Real product photo",
    language: "en",
    productSku: "BD-001",
    tags: "real_photo|dress"
  },
  "sample-orders": {
    customerName: "Maria Buyer",
    customerWhatsappNumber: "+5215512345678",
    sampleName: "Blue Dress Sample",
    productSku: "BD-001",
    sampleFee: "20",
    shippingCost: "8",
    currency: "USD",
    paymentStatus: "unpaid",
    shippingStatus: "pending",
    trackingNumber: "",
    feedbackStatus: "pending",
    expectedShipDate: "2026-05-22",
    expectedDeliveryDate: "2026-05-29",
    notes: "Template example only"
  },
  "custom-requests": {
    customerName: "Maria Buyer",
    customerWhatsappNumber: "+5215512345678",
    requestType: "logo",
    productSku: "BD-001",
    logoRequired: "true",
    packagingRequired: "false",
    colorRequirement: "blue",
    sizeRequirement: "M/L",
    materialRequirement: "cotton",
    quantity: "500",
    moq: "300",
    sampleFee: "30",
    sampleLeadTime: "7 days",
    bulkLeadTime: "25 days",
    files: "https://example.com/logo.ai",
    status: "draft",
    notes: "Template example only"
  }
};

export function isImportExportType(value: string): value is ImportExportType {
  return (IMPORT_EXPORT_TYPES as readonly string[]).includes(value);
}

export function csvForTemplate(type: ImportExportType) {
  const headers = EXPORT_HEADERS[type].filter((header) => header !== "createdAt" && header !== "updatedAt");
  return stringifyCsv([Object.fromEntries(headers.map((header) => [header, TEMPLATE_ROWS[type][header] || ""]))], headers);
}

export async function exportCsv(db: ImportExportDb, type: ImportExportType, ownerId: string) {
  const rows = await loadExportRows(db, type, ownerId);
  return stringifyCsv(rows, EXPORT_HEADERS[type]);
}

export async function importCsv(db: ImportExportDb, type: ImportExportType, ownerId: string, csvText: string, options: { dryRun?: boolean; skipDuplicates?: boolean } = {}): Promise<ImportResult> {
  const parsed = parseCsv(csvText);
  const rows = parsed.rows.map(stripSensitiveFields);
  const ctx: ImportContext = { db, ownerId, dryRun: Boolean(options.dryRun), skipDuplicates: options.skipDuplicates !== false };
  let successCount = 0;
  let skippedCount = 0;
  const errors: ValidationError[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const rowNumber = index + 2;
    const result = await buildImportData(type, rows[index], rowNumber, ctx);
    if (result.errors.length) {
      errors.push(...result.errors);
      continue;
    }
    if (result.skipped) {
      skippedCount += 1;
      continue;
    }
    if (!ctx.dryRun && result.data) {
      await createByType(db, type, result.data);
    }
    successCount += 1;
  }

  return {
    totalRows: rows.length,
    successCount,
    failureCount: errors.length ? new Set(errors.map((error) => error.row)).size : 0,
    skippedCount,
    errors,
    dryRun: ctx.dryRun
  };
}

export function parseCsv(text: string) {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  const normalized = text.replace(/^\uFEFF/, "");

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  row.push(field);
  rows.push(row);

  const nonEmptyRows = rows.filter((item) => item.some((cell) => cell.trim()));
  const headers = (nonEmptyRows.shift() || []).map((header) => header.trim());
  return {
    headers,
    rows: nonEmptyRows.map((cells) => Object.fromEntries(headers.map((header, index) => [header, (cells[index] || "").trim()])))
  };
}

export function stringifyCsv(rows: Row[], headers: string[]) {
  const lines = [headers.map(escapeCsvCell).join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => escapeCsvCell(row[header] || "")).join(","));
  }
  return `${lines.join("\n")}\n`;
}

export function escapeCsvCell(value: unknown) {
  const text = sanitizeCsvCell(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function sanitizeCsvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return /^[=+\-@]/.test(text.trimStart()) ? `'${text}` : text;
}

async function loadExportRows(db: ImportExportDb, type: ImportExportType, ownerId: string): Promise<Row[]> {
  if (type === "customers") {
    const items = await db.customer.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" } }) as any[];
    return items.map((item) => ({
      name: item.name,
      whatsappNumber: item.whatsappNumber,
      country: item.country,
      language: item.language,
      tags: joinArray(item.tags),
      stage: item.stage,
      interestedProduct: item.interestedProduct,
      latestSummary: item.latestSummary,
      nextFollowUpAt: iso(item.nextFollowUpAt),
      notes: item.notes,
      createdAt: iso(item.createdAt),
      updatedAt: iso(item.updatedAt)
    }));
  }
  if (type === "products") {
    const items = await db.product.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" } }) as any[];
    return items.map((item) => ({
      name: item.name,
      sku: item.sku,
      category: item.category,
      images: joinArray(item.images),
      videos: joinArray(item.videos),
      colors: joinArray(item.colors),
      sizes: joinArray(item.sizes),
      material: item.material,
      moq: item.moq,
      suggestedPrice: decimal(item.suggestedPrice),
      minPrice: decimal(item.minPrice),
      leadTime: item.leadTime,
      sellingPoints: joinArray(item.sellingPoints),
      introEn: item.introEn,
      introEs: item.introEs,
      introPt: item.introPt,
      introAr: item.introAr,
      createdAt: iso(item.createdAt),
      updatedAt: iso(item.updatedAt)
    }));
  }
  if (type === "knowledge-base") {
    const items = await db.knowledgeBase.findMany({ where: { ownerId }, include: { product: true }, orderBy: { createdAt: "desc" } }) as any[];
    return items.map((item) => ({ title: item.title, category: item.category, content: item.content, language: item.language, productSku: relationOwned(item.product, ownerId) ? item.product.sku : "", enabled: String(Boolean(item.enabled)), createdAt: iso(item.createdAt), updatedAt: iso(item.updatedAt) }));
  }
  if (type === "materials") {
    const items = await db.material.findMany({ where: { ownerId }, include: { product: true }, orderBy: { createdAt: "desc" } }) as any[];
    return items.map((item) => ({ title: item.title, type: item.type, url: item.url, description: item.description, language: item.language, productSku: relationOwned(item.product, ownerId) ? item.product.sku : "", tags: joinArray(item.tags), createdAt: iso(item.createdAt), updatedAt: iso(item.updatedAt) }));
  }
  if (type === "sample-orders") {
    const items = await db.sampleOrder.findMany({ where: { ownerId }, include: { customer: true, product: true }, orderBy: { createdAt: "desc" } }) as any[];
    return items.map((item) => ({
      customerName: relationOwned(item.customer, ownerId) ? item.customer.name : "",
      customerWhatsappNumber: relationOwned(item.customer, ownerId) ? item.customer.whatsappNumber : "",
      sampleName: item.sampleName,
      productSku: relationOwned(item.product, ownerId) ? item.product.sku : "",
      sampleFee: decimal(item.sampleFee),
      shippingCost: decimal(item.shippingCost),
      currency: item.currency,
      paymentStatus: item.paymentStatus,
      shippingStatus: item.shippingStatus,
      trackingNumber: item.trackingNumber,
      feedbackStatus: item.feedbackStatus,
      expectedShipDate: iso(item.expectedShipDate),
      expectedDeliveryDate: iso(item.expectedDeliveryDate),
      notes: item.notes,
      createdAt: iso(item.createdAt),
      updatedAt: iso(item.updatedAt)
    }));
  }
  const items = await db.customRequest.findMany({ where: { ownerId }, include: { customer: true, product: true }, orderBy: { createdAt: "desc" } }) as any[];
  return items.map((item) => ({
    customerName: relationOwned(item.customer, ownerId) ? item.customer.name : "",
    customerWhatsappNumber: relationOwned(item.customer, ownerId) ? item.customer.whatsappNumber : "",
    requestType: item.requestType,
    productSku: relationOwned(item.product, ownerId) ? item.product.sku : "",
    logoRequired: String(Boolean(item.logoRequired)),
    packagingRequired: String(Boolean(item.packagingRequired)),
    colorRequirement: item.colorRequirement,
    sizeRequirement: item.sizeRequirement,
    materialRequirement: item.materialRequirement,
    quantity: item.quantity,
    moq: item.moq,
    sampleFee: decimal(item.sampleFee),
    sampleLeadTime: item.sampleLeadTime,
    bulkLeadTime: item.bulkLeadTime,
    files: joinArray(item.files),
    status: item.status,
    notes: item.notes,
    createdAt: iso(item.createdAt),
    updatedAt: iso(item.updatedAt)
  }));
}

async function buildImportData(type: ImportExportType, row: Row, rowNumber: number, ctx: ImportContext): Promise<BuildResult> {
  if (type === "customers") return buildCustomer(row, rowNumber, ctx);
  if (type === "products") return buildProduct(row, rowNumber, ctx);
  if (type === "knowledge-base") return buildKnowledge(row, rowNumber, ctx);
  if (type === "materials") return buildMaterial(row, rowNumber, ctx);
  if (type === "sample-orders") return buildSampleOrder(row, rowNumber, ctx);
  return buildCustomRequest(row, rowNumber, ctx);
}

async function buildCustomer(row: Row, rowNumber: number, ctx: ImportContext): Promise<BuildResult> {
  const errors = requireFields(row, rowNumber, ["name"]);
  const nextFollowUpAt = parseOptionalDate(row.nextFollowUpAt, "nextFollowUpAt", rowNumber, errors);
  if (row.whatsappNumber && ctx.skipDuplicates) {
    const existing = await ctx.db.customer.findFirst({ where: { ownerId: ctx.ownerId, whatsappNumber: row.whatsappNumber } });
    if (existing) return { skipped: true, errors: [] };
  }
  return {
    errors,
    data: {
      name: row.name,
      whatsappNumber: emptyToNull(row.whatsappNumber),
      country: emptyToNull(row.country),
      language: emptyToNull(row.language),
      tags: splitArray(row.tags),
      ...(row.stage ? { stage: row.stage } : {}),
      interestedProduct: emptyToNull(row.interestedProduct),
      latestSummary: emptyToNull(row.latestSummary),
      nextFollowUpAt,
      notes: emptyToNull(row.notes),
      ownerId: ctx.ownerId
    }
  };
}

async function buildProduct(row: Row, rowNumber: number, ctx: ImportContext): Promise<BuildResult> {
  const errors = requireFields(row, rowNumber, ["name"]);
  const sku = row.sku || slugSku(row.name, rowNumber);
  const moq = parseOptionalInteger(row.moq, "moq", rowNumber, errors);
  const suggestedPrice = parseOptionalNumber(row.suggestedPrice, "suggestedPrice", rowNumber, errors);
  const minPrice = parseOptionalNumber(row.minPrice, "minPrice", rowNumber, errors);
  if (sku && ctx.skipDuplicates) {
    const existing = await ctx.db.product.findFirst({ where: { ownerId: ctx.ownerId, sku } });
    if (existing) return { skipped: true, errors: [] };
  }
  return {
    errors,
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
      ownerId: ctx.ownerId
    }
  };
}

async function buildKnowledge(row: Row, rowNumber: number, ctx: ImportContext): Promise<BuildResult> {
  const errors = requireFields(row, rowNumber, ["title", "category", "content"]);
  enumValue(row.category, KNOWLEDGE_BASE_CATEGORIES, "category", rowNumber, errors);
  const language = row.language || "other";
  enumValue(language, KNOWLEDGE_BASE_LANGUAGES, "language", rowNumber, errors);
  const product = await findProductBySku(ctx, row.productSku, rowNumber, errors);
  return {
    errors,
    data: {
      title: row.title,
      category: row.category,
      content: row.content,
      language,
      productId: product?.id || null,
      enabled: parseBoolean(row.enabled, true),
      ownerId: ctx.ownerId
    }
  };
}

async function buildMaterial(row: Row, rowNumber: number, ctx: ImportContext): Promise<BuildResult> {
  const errors = requireFields(row, rowNumber, ["title", "type", "url"]);
  enumValue(row.type, MATERIAL_TYPES, "type", rowNumber, errors);
  const language = row.language || "other";
  enumValue(language, MATERIAL_LANGUAGES, "language", rowNumber, errors);
  if (row.url && !/^https?:\/\//i.test(row.url)) errors.push({ row: rowNumber, field: "url", message: "url must start with http:// or https://" });
  const product = await findProductBySku(ctx, row.productSku, rowNumber, errors);
  return { errors, data: { title: row.title, type: row.type, url: row.url, description: emptyToNull(row.description), language, productId: product?.id || null, tags: splitArray(row.tags), ownerId: ctx.ownerId } };
}

async function buildSampleOrder(row: Row, rowNumber: number, ctx: ImportContext): Promise<BuildResult> {
  const errors = requireFields(row, rowNumber, ["sampleName"]);
  const customer = await findCustomer(ctx, row, rowNumber, errors);
  const product = await findProductBySku(ctx, row.productSku, rowNumber, errors);
  const sampleFee = parseOptionalNumber(row.sampleFee, "sampleFee", rowNumber, errors);
  const shippingCost = parseOptionalNumber(row.shippingCost, "shippingCost", rowNumber, errors);
  const paymentStatus = row.paymentStatus || "unpaid";
  const shippingStatus = row.shippingStatus || "pending";
  const feedbackStatus = row.feedbackStatus || "pending";
  enumValue(paymentStatus, SAMPLE_PAYMENT_STATUSES, "paymentStatus", rowNumber, errors);
  enumValue(shippingStatus, SAMPLE_SHIPPING_STATUSES, "shippingStatus", rowNumber, errors);
  enumValue(feedbackStatus, SAMPLE_FEEDBACK_STATUSES, "feedbackStatus", rowNumber, errors);
  return {
    errors,
    data: {
      customerId: customer?.id,
      productId: product?.id || null,
      sampleName: row.sampleName,
      sampleFee,
      shippingCost,
      currency: row.currency || "USD",
      paymentStatus,
      shippingStatus,
      trackingNumber: emptyToNull(row.trackingNumber),
      feedbackStatus,
      expectedShipDate: parseOptionalDate(row.expectedShipDate, "expectedShipDate", rowNumber, errors),
      expectedDeliveryDate: parseOptionalDate(row.expectedDeliveryDate, "expectedDeliveryDate", rowNumber, errors),
      notes: emptyToNull(row.notes),
      ownerId: ctx.ownerId
    }
  };
}

async function buildCustomRequest(row: Row, rowNumber: number, ctx: ImportContext): Promise<BuildResult> {
  const errors = requireFields(row, rowNumber, ["requestType"]);
  const customer = await findCustomer(ctx, row, rowNumber, errors);
  const product = await findProductBySku(ctx, row.productSku, rowNumber, errors);
  const status = row.status || "draft";
  enumValue(row.requestType, CUSTOM_REQUEST_TYPES, "requestType", rowNumber, errors);
  enumValue(status, CUSTOM_REQUEST_STATUSES, "status", rowNumber, errors);
  return {
    errors,
    data: {
      customerId: customer?.id,
      productId: product?.id || null,
      requestType: row.requestType,
      logoRequired: parseBoolean(row.logoRequired, false),
      packagingRequired: parseBoolean(row.packagingRequired, false),
      colorRequirement: emptyToNull(row.colorRequirement),
      sizeRequirement: emptyToNull(row.sizeRequirement),
      materialRequirement: emptyToNull(row.materialRequirement),
      quantity: parseOptionalInteger(row.quantity, "quantity", rowNumber, errors),
      moq: parseOptionalInteger(row.moq, "moq", rowNumber, errors),
      sampleFee: parseOptionalNumber(row.sampleFee, "sampleFee", rowNumber, errors),
      sampleLeadTime: emptyToNull(row.sampleLeadTime),
      bulkLeadTime: emptyToNull(row.bulkLeadTime),
      files: splitArray(row.files),
      status,
      notes: emptyToNull(row.notes),
      ownerId: ctx.ownerId
    }
  };
}

async function createByType(db: ImportExportDb, type: ImportExportType, data: Record<string, unknown>) {
  if (type === "customers") return db.customer.create({ data });
  if (type === "products") return db.product.create({ data });
  if (type === "knowledge-base") return db.knowledgeBase.create({ data });
  if (type === "materials") return db.material.create({ data });
  if (type === "sample-orders") return db.sampleOrder.create({ data });
  return db.customRequest.create({ data });
}

function stripSensitiveFields(row: Row) {
  const normalizeKey = (key: string) => key.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const blocked = new Set([
    "ownerid",
    "createdby",
    "organizationid",
    "password",
    "passwordhash",
    "token",
    "secret",
    "apikey",
    "openaiapikey",
    "session",
    "sessionsecret",
    "cookie",
    "cookiesecret"
  ]);
  return Object.fromEntries(Object.entries(row).filter(([key]) => !blocked.has(normalizeKey(key))));
}

function requireFields(row: Row, rowNumber: number, fields: string[]) {
  return fields.flatMap((field) => row[field] ? [] : [{ row: rowNumber, field, message: `${field} is required` }]);
}

async function findCustomer(ctx: ImportContext, row: Row, rowNumber: number, errors: ValidationError[]) {
  if (!row.customerName && !row.customerWhatsappNumber) {
    errors.push({ row: rowNumber, field: "customerName", message: "customerName or customerWhatsappNumber is required" });
    return null;
  }
  const where = row.customerWhatsappNumber
    ? { ownerId: ctx.ownerId, whatsappNumber: row.customerWhatsappNumber }
    : { ownerId: ctx.ownerId, name: row.customerName };
  const customer = await ctx.db.customer.findFirst({ where });
  if (!customer) errors.push({ row: rowNumber, field: "customerName", message: "customer not found for current user" });
  return customer;
}

async function findProductBySku(ctx: ImportContext, sku: string | undefined, rowNumber: number, errors: ValidationError[]) {
  if (!sku) return null;
  const product = await ctx.db.product.findFirst({ where: { ownerId: ctx.ownerId, sku } });
  if (!product) errors.push({ row: rowNumber, field: "productSku", message: "productSku not found for current user" });
  return product;
}

function enumValue(value: string, allowed: readonly string[], field: string, row: number, errors: ValidationError[]) {
  if (!allowed.includes(value)) errors.push({ row, field, message: `${field} is invalid` });
}

function parseOptionalNumber(value: string | undefined, field: string, row: number, errors: ValidationError[]) {
  if (!value) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) {
    errors.push({ row, field, message: `${field} must be a number` });
    return null;
  }
  return number;
}

function parseOptionalInteger(value: string | undefined, field: string, row: number, errors: ValidationError[]) {
  if (!value) return null;
  const number = Number(value);
  if (!Number.isInteger(number)) {
    errors.push({ row, field, message: `${field} must be an integer` });
    return null;
  }
  return number;
}

function parseOptionalDate(value: string | undefined, field: string, row: number, errors: ValidationError[]) {
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

function splitArray(value?: string) {
  return value ? value.split("|").map((item) => item.trim()).filter(Boolean) : [];
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

function relationOwned(value: any, ownerId: string) {
  return value && value.ownerId === ownerId;
}

function slugSku(name: string, rowNumber: number) {
  const slug = (name || "product").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "product";
  return `${slug}-${rowNumber}`;
}
