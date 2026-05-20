import type { AiReplyScenario, KnowledgeBaseCategory } from "@wa-ai/shared";
import { prisma } from "./db.js";
import {
  categoriesForProductIntro,
  categoriesForQuote,
  categoriesForCustomScript,
  categoriesForMaterial,
  categoriesForSampleScript,
  categoriesForScenario,
  formatKnowledgeContext,
  languageCandidates,
  rankKnowledgeItems,
  serializeKnowledgeBase,
  type KnowledgeContextItem
} from "./knowledge-base-utils.js";

type KnowledgeDb = Pick<typeof prisma, "knowledgeBase" | "product"> & Partial<Pick<typeof prisma, "knowledgeBaseOrg" | "scriptOrg">>;

export type KnowledgeLookupOptions = {
  ownerId: string;
  organizationId?: string | null;
  targetLanguage?: string | null;
  productId?: string | null;
  scenario?: AiReplyScenario;
  mode?: "reply" | "product_intro" | "quote" | "material" | "sample" | "custom";
  materialType?: string | null;
  sampleScenario?: string | null;
  customScenario?: string | null;
  keyword?: string;
};

export async function findKnowledgeForAi(db: KnowledgeDb, options: KnowledgeLookupOptions) {
  if (!(db as { knowledgeBase?: unknown }).knowledgeBase) {
    return { items: [], productNotFound: false };
  }

  const categories = categoriesForMode(options.mode, options.scenario, options.materialType, options.sampleScenario, options.customScenario);
  const languageIn = languageCandidates(options.targetLanguage || undefined);
  const productId = options.productId?.trim() || null;

  if (productId) {
    const product = await db.product.findFirst({ where: { id: productId, ownerId: options.ownerId } });
    if (!product) return { items: [], productNotFound: true };
  }

  const categoryIn = Array.from(new Set([...categories, "forbidden_expressions" as const]));
  const productScope = productId ? [{ productId }, { productId: null }] : [{ productId: null }];
  const records = await db.knowledgeBase.findMany({
    where: {
      ownerId: options.ownerId,
      enabled: true,
      category: { in: categoryIn },
      language: { in: languageIn },
      OR: productScope
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 50
  });

  const personalItems = records.map((record) => {
    const serialized = serializeKnowledgeBase(record);
    return {
      id: serialized.id,
      title: serialized.title,
      category: serialized.category,
      content: serialized.content,
      language: serialized.language,
      productId: serialized.productId
    } satisfies KnowledgeContextItem;
  });

  const organizationId = options.organizationId?.trim() || null;
  const orgItems = organizationId && db.knowledgeBaseOrg
    ? (await db.knowledgeBaseOrg.findMany({
        where: {
          organizationId,
          enabled: true,
          category: { in: categoryIn },
          language: { in: languageIn }
        },
        orderBy: [{ updatedAt: "desc" }],
        take: 50
      })).map((record) => ({
        id: record.id,
        title: record.title,
        category: record.category as KnowledgeBaseCategory,
        content: record.content,
        language: record.language as KnowledgeContextItem["language"],
        productId: null,
        source: "Org" as const
      } satisfies KnowledgeContextItem))
    : [];

  const orgScriptItems = organizationId && db.scriptOrg && options.mode === "reply"
    ? (await db.scriptOrg.findMany({
        where: {
          organizationId,
          enabled: true,
          category: { in: scriptCategoriesForScenario(options.scenario) },
          language: { in: languageIn }
        },
        orderBy: [{ updatedAt: "desc" }],
        take: 20
      })).map((record) => ({
        id: record.id,
        title: `Script: ${record.title}`,
        category: "faq" as KnowledgeBaseCategory,
        content: record.content,
        language: record.language as KnowledgeContextItem["language"],
        productId: null,
        source: "Org" as const
      } satisfies KnowledgeContextItem))
    : [];

  const productSpecific = personalItems.filter((item) => productId && item.productId === productId);
  const personalGeneral = personalItems.filter((item) => !productId || item.productId !== productId);
  const rankedItems = [
    ...rankKnowledgeItems(productSpecific, {
      categories,
      productId,
      targetLanguage: options.targetLanguage,
      keyword: options.keyword
    }),
    ...rankKnowledgeItems(orgItems, {
      categories,
      productId,
      targetLanguage: options.targetLanguage,
      keyword: options.keyword
    }),
    ...rankKnowledgeItems(orgScriptItems, {
      categories: ["faq"],
      productId,
      targetLanguage: options.targetLanguage,
      keyword: options.keyword
    }),
    ...rankKnowledgeItems(personalGeneral, {
      categories,
      productId,
      targetLanguage: options.targetLanguage,
      keyword: options.keyword
    })
  ].slice(0, 5);

  return {
    items: rankedItems,
    productNotFound: false
  };
}

function scriptCategoriesForScenario(scenario?: AiReplyScenario) {
  const categoryMap: Record<AiReplyScenario, string[]> = {
    price: ["price", "quote", "general"],
    moq: ["moq", "quote", "general"],
    shipping: ["shipping", "general"],
    discount: ["discount", "price", "general"],
    sample: ["sample", "general"],
    lead_time: ["shipping", "general"],
    product_proof: ["product_intro", "general"],
    follow_up: ["follow_up", "general"],
    payment: ["payment", "general"],
    order_status: ["shipping", "after_sales", "general"]
  };
  return scenario ? categoryMap[scenario] || ["general"] : ["general"];
}

export function buildKnowledgeContext(items: KnowledgeContextItem[]) {
  return {
    knowledgeContext: formatKnowledgeContext(items),
    knowledgeUsed: items.map((item) => (item.source ? `[${item.source}] ${item.title}` : item.title))
  };
}

function categoriesForMode(
  mode: KnowledgeLookupOptions["mode"],
  scenario?: AiReplyScenario,
  materialType?: string | null,
  sampleScenario?: string | null,
  customScenario?: string | null
): KnowledgeBaseCategory[] {
  if (mode === "product_intro") return categoriesForProductIntro();
  if (mode === "quote") return categoriesForQuote();
  if (mode === "material") return categoriesForMaterial(materialType);
  if (mode === "sample") return categoriesForSampleScript(sampleScenario);
  if (mode === "custom") return categoriesForCustomScript(customScenario);
  return categoriesForScenario(scenario);
}
