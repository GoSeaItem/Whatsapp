import type {
  ProductDetail,
  ProductIntroRequest,
  ProductIntroResponse,
  ProductUpsertRequest
} from "@wa-ai/shared";
import { AI_SAFETY_NOTE } from "@wa-ai/shared";
import { noKnowledgeWarning, type KnowledgeContextItem } from "./knowledge-base-utils.js";

type DecimalLike = { toFixed(decimalPlaces?: number): string } | number | string | null;

type RawProduct = {
  id: string;
  name: string;
  sku: string;
  category: string | null;
  images: string[];
  videos: string[];
  colors: string[];
  sizes: string[];
  material: string | null;
  moq: number | null;
  suggestedPrice: DecimalLike;
  minPrice: DecimalLike;
  leadTime: string | null;
  sellingPoints: string[];
  introEn: string | null;
  introEs: string | null;
  introPt: string | null;
  introAr: string | null;
  ownerId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function serializeProduct(product: RawProduct): ProductDetail {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    category: product.category,
    images: product.images,
    videos: product.videos,
    colors: product.colors,
    sizes: product.sizes,
    material: product.material,
    moq: product.moq,
    suggestedPrice: decimalToString(product.suggestedPrice),
    minPrice: decimalToString(product.minPrice),
    leadTime: product.leadTime,
    sellingPoints: product.sellingPoints,
    introEn: product.introEn,
    introEs: product.introEs,
    introPt: product.introPt,
    introAr: product.introAr,
    ownerId: product.ownerId || null,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString()
  };
}

export function validateProductPayload(input: Partial<ProductUpsertRequest>, options: { partial?: boolean } = {}) {
  const errors: Array<{ field: string; message: string }> = [];
  const name = cleanString(input.name);
  const sku = cleanString(input.sku);

  if (!options.partial && !name) errors.push({ field: "name", message: "Product name is required" });
  else if (options.partial && input.name !== undefined && !name) errors.push({ field: "name", message: "Product name is required" });
  if (!options.partial && !sku) errors.push({ field: "sku", message: "SKU is required" });
  else if (options.partial && input.sku !== undefined && !sku) errors.push({ field: "sku", message: "SKU is required" });
  if (name.length > 120) errors.push({ field: "name", message: "Product name must be 120 characters or less" });
  if (sku.length > 80) errors.push({ field: "sku", message: "SKU must be 80 characters or less" });

  const moq = input.moq;
  if (moq !== undefined && moq !== null && (!Number.isInteger(Number(moq)) || Number(moq) < 0)) {
    errors.push({ field: "moq", message: "MOQ must be a non-negative integer" });
  }

  for (const field of ["suggestedPrice", "minPrice"] as const) {
    const value = input[field];
    if (value !== undefined && value !== null && value !== "" && Number.isNaN(Number(value))) {
      errors.push({ field, message: "Price must be numeric" });
    }
  }

  if (normalizeList(input.sellingPoints).length > 20) {
    errors.push({ field: "sellingPoints", message: "Selling points can contain at most 20 items" });
  }

  return errors;
}

export function toProductCreateData(input: ProductUpsertRequest) {
  return {
    name: cleanString(input.name),
    sku: cleanString(input.sku),
    category: nullableString(input.category),
    images: normalizeList(input.images),
    videos: normalizeList(input.videos),
    colors: normalizeList(input.colors),
    sizes: normalizeList(input.sizes),
    material: nullableString(input.material),
    moq: input.moq === undefined || input.moq === null ? null : Number(input.moq),
    suggestedPrice: decimalOrNull(input.suggestedPrice),
    minPrice: decimalOrNull(input.minPrice),
    leadTime: nullableString(input.leadTime),
    sellingPoints: normalizeList(input.sellingPoints),
    introEn: nullableString(input.introEn),
    introEs: nullableString(input.introEs),
    introPt: nullableString(input.introPt),
    introAr: nullableString(input.introAr)
  };
}

export function toProductUpdateData(input: Partial<ProductUpsertRequest>) {
  const data: Record<string, unknown> = {};
  setIfPresent(data, "name", input.name, cleanString);
  setIfPresent(data, "sku", input.sku, cleanString);
  setIfPresent(data, "category", input.category, nullableString);
  if (input.images !== undefined) data.images = normalizeList(input.images);
  if (input.videos !== undefined) data.videos = normalizeList(input.videos);
  if (input.colors !== undefined) data.colors = normalizeList(input.colors);
  if (input.sizes !== undefined) data.sizes = normalizeList(input.sizes);
  setIfPresent(data, "material", input.material, nullableString);
  if (input.moq !== undefined) data.moq = input.moq === null ? null : Number(input.moq);
  if (input.suggestedPrice !== undefined) data.suggestedPrice = decimalOrNull(input.suggestedPrice);
  if (input.minPrice !== undefined) data.minPrice = decimalOrNull(input.minPrice);
  setIfPresent(data, "leadTime", input.leadTime, nullableString);
  if (input.sellingPoints !== undefined) data.sellingPoints = normalizeList(input.sellingPoints);
  setIfPresent(data, "introEn", input.introEn, nullableString);
  setIfPresent(data, "introEs", input.introEs, nullableString);
  setIfPresent(data, "introPt", input.introPt, nullableString);
  setIfPresent(data, "introAr", input.introAr, nullableString);
  return data;
}

export function generateProductIntro(
  product: ProductDetail,
  input: ProductIntroRequest,
  knowledgeItems: KnowledgeContextItem[] = []
): ProductIntroResponse {
  const language = normalizeLanguage(input.targetLanguage || "English");
  const storedIntro = getStoredIntro(product, language);
  const knowledgeUsed = knowledgeItems.map((item) => item.title);
  const riskWarnings = buildProductIntroWarnings(product, knowledgeItems);

  if (storedIntro) {
    return {
      productId: product.id,
      language,
      intro: withKnowledgeLine(storedIntro, knowledgeUsed),
      source: "stored",
      copyReminder: "Product introduction is ready. Copy or insert it into WhatsApp, then 手动发送 after manual confirmation.",
      riskWarnings,
      knowledgeUsed
    };
  }

  return {
    productId: product.id,
    language,
    intro: withKnowledgeLine(buildGeneratedIntro(product, language, knowledgeItems), knowledgeUsed),
    source: "generated",
    copyReminder: "No stored intro was found for this language. A draft was generated from selling points and knowledge base. Confirm MOQ, price, stock, and lead time, then 手动发送.",
    riskWarnings,
    knowledgeUsed
  };
}

export function normalizeList(value: unknown) {
  const raw = Array.isArray(value) ? value : typeof value === "string" ? value.split(/\n|,/) : [];
  return Array.from(new Set(raw.map((item) => cleanString(item)).filter(Boolean)));
}

function buildGeneratedIntro(product: ProductDetail, language: string, knowledgeItems: KnowledgeContextItem[]) {
  const points = product.sellingPoints.length > 0 ? product.sellingPoints : ["reliable quality", "suitable for bulk orders"];
  const knowledgePoints = knowledgeItems
    .filter((item) => item.category === "product_selling_points")
    .map((item) => item.content)
    .slice(0, 2);
  const pointText = [...points, ...knowledgePoints].join(", ");
  const moqText = product.moq ? ` MOQ: ${product.moq}.` : "";
  const leadText = product.leadTime ? ` Lead time: ${product.leadTime}.` : "";

  if (language === "Spanish") {
    return `Hola, te comparto una breve introduccion de ${product.name} (${product.sku}). Puntos destacados: ${pointText}.${moqText}${leadText} Antes de enviar, confirmare precio, stock, MOQ y plazo de entrega segun tu cantidad y destino.`;
  }
  if (language === "Portuguese") {
    return `Ola, segue uma breve apresentacao de ${product.name} (${product.sku}). Destaques: ${pointText}.${moqText}${leadText} Antes de enviar, vou confirmar preco, estoque, MOQ e prazo conforme a quantidade e o destino.`;
  }
  return `Hi, here is a short introduction for ${product.name} (${product.sku}). Key selling points: ${pointText}.${moqText}${leadText} Before sending, I will confirm price, stock, MOQ, and lead time based on quantity and destination.`;
}

function buildProductIntroWarnings(product: ProductDetail, knowledgeItems: KnowledgeContextItem[]) {
  const warnings = [
    AI_SAFETY_NOTE,
    "产品介绍仅作为草稿，不会自动发送 WhatsApp 消息。",
    "不得编造价格、库存、交期，也不得承诺最低价。"
  ];
  if (knowledgeItems.length === 0) warnings.push(noKnowledgeWarning());
  if (!product.moq) warnings.push("产品 MOQ 未填写，请业务员确认后再发送。");
  if (!product.suggestedPrice) warnings.push("产品建议价未填写，请业务员确认价格后再发送。");
  if (!product.leadTime) warnings.push("产品交期未填写，请业务员确认交期后再发送。");
  warnings.push("库存状态未在产品资料中维护，请业务员确认库存后再发送。");
  return warnings;
}

function withKnowledgeLine(text: string, knowledgeUsed: string[]) {
  if (knowledgeUsed.length === 0) return text;
  return `${text}\nReference checked: ${knowledgeUsed.join(", ")}. Please confirm price, stock, lead time, logistics, and after-sales promise before sending.`;
}

function getStoredIntro(product: ProductDetail, language: string) {
  if (language === "Spanish") return product.introEs?.trim() || "";
  if (language === "Portuguese") return product.introPt?.trim() || "";
  if (language === "Arabic") return product.introAr?.trim() || "";
  return product.introEn?.trim() || "";
}

function normalizeLanguage(value: string) {
  const text = value.toLowerCase();
  if (text.includes("spanish") || text.includes("es")) return "Spanish";
  if (text.includes("portuguese") || text.includes("pt")) return "Portuguese";
  if (text.includes("arabic") || text.includes("ar")) return "Arabic";
  return "English";
}

function setIfPresent(
  data: Record<string, unknown>,
  key: string,
  value: unknown,
  transform: (value: unknown) => unknown
) {
  if (value !== undefined) data[key] = transform(value);
}

function decimalToString(value: DecimalLike) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "object" && "toFixed" in value) return value.toFixed(2);
  return Number(value).toFixed(2);
}

function decimalOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return Number(value);
}

function nullableString(value: unknown) {
  return cleanString(value) || null;
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
