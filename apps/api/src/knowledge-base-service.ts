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

type KnowledgeDb = Pick<typeof prisma, "knowledgeBase" | "product">;

export type KnowledgeLookupOptions = {
  ownerId: string;
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

  const items = records.map((record) => {
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

  return {
    items: rankKnowledgeItems(items, {
      categories,
      productId,
      targetLanguage: options.targetLanguage,
      keyword: options.keyword
    }),
    productNotFound: false
  };
}

export function buildKnowledgeContext(items: KnowledgeContextItem[]) {
  return {
    knowledgeContext: formatKnowledgeContext(items),
    knowledgeUsed: items.map((item) => item.title)
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
