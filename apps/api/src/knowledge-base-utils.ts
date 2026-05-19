import {
  KNOWLEDGE_BASE_CATEGORIES,
  KNOWLEDGE_BASE_LANGUAGES,
  type AiReplyScenario,
  type KnowledgeBaseCategory,
  type KnowledgeBaseDetail,
  type KnowledgeBaseLanguage,
  type KnowledgeBaseUpsertRequest
} from "@wa-ai/shared";

export type KnowledgeBaseRaw = {
  id: string;
  title: string;
  category: string;
  content: string;
  language: string;
  productId: string | null;
  enabled: boolean;
  ownerId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type KnowledgeContextItem = {
  id: string;
  title: string;
  category: KnowledgeBaseCategory;
  content: string;
  language: KnowledgeBaseLanguage;
  productId?: string | null;
};

const categorySet = new Set<string>(KNOWLEDGE_BASE_CATEGORIES);
const languageSet = new Set<string>(KNOWLEDGE_BASE_LANGUAGES);

const scenarioCategories: Record<AiReplyScenario, KnowledgeBaseCategory[]> = {
  price: ["quote_rules", "payment_methods", "product_selling_points", "faq"],
  moq: ["quote_rules", "product_selling_points", "faq"],
  shipping: ["logistics", "faq"],
  discount: ["quote_rules", "forbidden_expressions", "faq"],
  sample: ["product_selling_points", "logistics", "payment_methods", "faq"],
  lead_time: ["logistics", "quote_rules", "faq"],
  product_proof: ["product_selling_points", "faq"],
  follow_up: ["company_intro", "product_selling_points", "faq"],
  payment: ["payment_methods", "quote_rules", "faq"],
  order_status: ["logistics", "after_sales_policy", "faq"]
};

export function serializeKnowledgeBase(item: KnowledgeBaseRaw): KnowledgeBaseDetail {
  return {
    id: item.id,
    title: item.title,
    category: normalizeCategory(item.category),
    content: item.content,
    language: normalizeKnowledgeLanguage(item.language),
    productId: item.productId,
    enabled: item.enabled,
    ownerId: item.ownerId || null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  };
}

export function validateKnowledgeBasePayload(input: Partial<KnowledgeBaseUpsertRequest>, options: { partial?: boolean } = {}) {
  const errors: Array<{ field: string; message: string }> = [];
  const title = cleanString(input.title);
  const content = cleanString(input.content);
  const category = cleanString(input.category);
  const language = input.language === null ? "" : cleanString(input.language);

  if (!options.partial && !title) errors.push({ field: "title", message: "title is required" });
  if (options.partial && input.title !== undefined && !title) errors.push({ field: "title", message: "title is required" });
  if (!options.partial && !content) errors.push({ field: "content", message: "content is required" });
  if (options.partial && input.content !== undefined && !content) errors.push({ field: "content", message: "content is required" });
  if (!options.partial && !category) errors.push({ field: "category", message: "category is required" });
  if (category && !categorySet.has(category)) errors.push({ field: "category", message: "unsupported category" });
  if (language && !languageSet.has(language)) errors.push({ field: "language", message: "unsupported language" });
  if (title.length > 160) errors.push({ field: "title", message: "title must be 160 characters or less" });
  if (content.length > 8000) errors.push({ field: "content", message: "content must be 8000 characters or less" });

  return errors;
}

export function toKnowledgeBaseCreateData(input: KnowledgeBaseUpsertRequest) {
  return {
    title: cleanString(input.title),
    category: normalizeCategory(input.category),
    content: cleanString(input.content),
    language: normalizeKnowledgeLanguage(input.language || "other"),
    productId: nullableString(input.productId),
    enabled: input.enabled ?? true
  };
}

export function toKnowledgeBaseUpdateData(input: Partial<KnowledgeBaseUpsertRequest>) {
  const data: Record<string, unknown> = {};
  if (input.title !== undefined) data.title = cleanString(input.title);
  if (input.category !== undefined) data.category = normalizeCategory(input.category);
  if (input.content !== undefined) data.content = cleanString(input.content);
  if (input.language !== undefined) data.language = normalizeKnowledgeLanguage(input.language || "other");
  if (input.productId !== undefined) data.productId = nullableString(input.productId);
  if (input.enabled !== undefined) data.enabled = Boolean(input.enabled);
  return data;
}

export function categoriesForScenario(scenario?: AiReplyScenario): KnowledgeBaseCategory[] {
  if (!scenario) {
    return ["company_intro", "product_selling_points", "logistics", "after_sales_policy", "quote_rules", "payment_methods", "faq"];
  }
  return scenarioCategories[scenario] || ["faq"];
}

export function categoriesForProductIntro(): KnowledgeBaseCategory[] {
  return ["product_selling_points", "company_intro", "faq"];
}

export function categoriesForQuote(): KnowledgeBaseCategory[] {
  return ["quote_rules", "payment_methods", "logistics", "forbidden_expressions", "faq"];
}

export function categoriesForMaterial(type?: string | null): KnowledgeBaseCategory[] {
  if (type === "shipping_proof") return ["logistics", "faq"];
  if (type === "payment_proof") return ["payment_methods", "quote_rules", "faq"];
  if (type === "certificate") return ["company_intro", "faq"];
  return ["product_selling_points", "company_intro", "faq"];
}

export function categoriesForSampleScript(scenario?: string | null): KnowledgeBaseCategory[] {
  if (scenario === "sample_payment_reminder") return ["payment_methods", "quote_rules", "faq"];
  if (scenario === "sample_shipped") return ["logistics", "faq"];
  if (scenario === "sample_feedback_follow_up") return ["after_sales_policy", "faq"];
  if (scenario === "sample_to_bulk_order") return ["quote_rules", "product_selling_points", "faq"];
  return ["quote_rules", "payment_methods", "logistics", "faq"];
}

export function categoriesForCustomScript(scenario?: string | null): KnowledgeBaseCategory[] {
  if (scenario === "custom_request_files") return ["product_selling_points", "faq"];
  if (scenario === "custom_moq_explain") return ["quote_rules", "faq"];
  if (scenario === "custom_sample_fee") return ["quote_rules", "payment_methods", "faq"];
  if (scenario === "custom_sample_lead_time" || scenario === "custom_bulk_lead_time") return ["logistics", "faq"];
  if (scenario === "custom_risk_confirm") return ["after_sales_policy", "faq"];
  return ["quote_rules", "payment_methods", "product_selling_points", "faq"];
}

export function languageCandidates(targetLanguage?: string): KnowledgeBaseLanguage[] {
  const normalized = (targetLanguage || "").toLowerCase();
  if (normalized.includes("spanish") || normalized === "es") return ["es", "zh", "other"];
  if (normalized.includes("portuguese") || normalized === "pt") return ["pt", "zh", "other"];
  if (normalized.includes("arabic") || normalized === "ar") return ["ar", "zh", "other"];
  if (normalized.includes("french") || normalized === "fr") return ["fr", "zh", "other"];
  if (normalized.includes("russian") || normalized === "ru") return ["ru", "zh", "other"];
  if (normalized.includes("chinese") || normalized === "zh") return ["zh", "other"];
  if (normalized.includes("english") || normalized === "en") return ["en", "zh", "other"];
  return ["en", "zh", "other"];
}

export function rankKnowledgeItems(
  items: KnowledgeContextItem[],
  options: { categories: KnowledgeBaseCategory[]; productId?: string | null; targetLanguage?: string | null; keyword?: string }
) {
  const languageRank = languageCandidates(options.targetLanguage || undefined);
  const keyword = normalizeText(options.keyword || "");
  return [...items]
    .sort((left, right) => scoreKnowledge(right, options, languageRank, keyword) - scoreKnowledge(left, options, languageRank, keyword))
    .slice(0, 5);
}

export function formatKnowledgeContext(items: KnowledgeContextItem[]) {
  return items
    .map((item, index) => `${index + 1}. [${item.category}/${item.language}] ${item.title}: ${item.content}`)
    .join("\n");
}

export function forbiddenExpressionsFrom(items: KnowledgeContextItem[]) {
  return items
    .filter((item) => item.category === "forbidden_expressions")
    .flatMap((item) => item.content.split(/\n|,|;/).map((part) => part.trim()).filter(Boolean));
}

export function detectForbiddenExpressionWarnings(replies: string, forbiddenExpressions: string[]) {
  const normalizedReplies = normalizeText(replies);
  return forbiddenExpressions
    .filter((expression) => normalizedReplies.includes(normalizeText(expression)))
    .map((expression) => `AI 回复中可能包含禁用表达「${expression}」，请业务员确认并修改后再发送。`);
}

export function noKnowledgeWarning() {
  return "未找到相关知识库内容，请业务员确认公司政策、价格、库存、交期和售后规则。";
}

export function normalizeKnowledgeLanguage(value: unknown): KnowledgeBaseLanguage {
  const text = cleanString(value) || "other";
  return languageSet.has(text) ? (text as KnowledgeBaseLanguage) : "other";
}

function normalizeCategory(value: unknown): KnowledgeBaseCategory {
  const text = cleanString(value);
  return categorySet.has(text) ? (text as KnowledgeBaseCategory) : "faq";
}

function scoreKnowledge(
  item: KnowledgeContextItem,
  options: { categories: KnowledgeBaseCategory[]; productId?: string | null },
  languageRank: KnowledgeBaseLanguage[],
  keyword: string
) {
  let score = 0;
  const categoryIndex = options.categories.indexOf(item.category);
  if (categoryIndex >= 0) score += 100 - categoryIndex * 8;
  const languageIndex = languageRank.indexOf(item.language);
  if (languageIndex >= 0) score += 50 - languageIndex * 6;
  if (options.productId && item.productId === options.productId) score += 80;
  if (item.category === "forbidden_expressions") score += 20;
  if (keyword && (normalizeText(item.title).includes(keyword) || normalizeText(item.content).includes(keyword))) score += 30;
  return score;
}

function nullableString(value: unknown) {
  return cleanString(value) || null;
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeText(value: string) {
  return value.toLowerCase().normalize("NFC");
}
