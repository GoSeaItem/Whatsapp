import { describe, expect, it } from "vitest";
import type { ProductDetail } from "@wa-ai/shared";
import { generateProductIntro, normalizeList, validateProductPayload } from "./product-utils.js";

const product: ProductDetail = {
  id: "p1",
  name: "Bluetooth Speaker",
  sku: "BT-100",
  category: "Audio",
  images: [],
  videos: [],
  colors: ["Black"],
  sizes: [],
  material: "ABS",
  moq: 100,
  suggestedPrice: "12.50",
  minPrice: "10.00",
  leadTime: "7-10 days",
  sellingPoints: ["waterproof shell", "portable design"],
  introEn: "Stored English intro",
  introEs: null,
  introPt: null,
  introAr: null,
  ownerId: "sales-1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

describe("product utils", () => {
  it("validates required fields", () => {
    expect(validateProductPayload({ name: "", sku: "" })).toEqual([
      { field: "name", message: "Product name is required" },
      { field: "sku", message: "SKU is required" }
    ]);
  });

  it("normalizes list values", () => {
    expect(normalizeList("Black, White\nBlack")).toEqual(["Black", "White"]);
  });

  it("uses stored intro when language exists", () => {
    const intro = generateProductIntro(product, { targetLanguage: "English" });
    expect(intro.source).toBe("stored");
    expect(intro.intro).toBe("Stored English intro");
    expect(intro.riskWarnings).toContain("产品介绍仅作为草稿，不会自动发送 WhatsApp 消息。");
  });

  it("generates safe intro when language intro is missing", () => {
    const intro = generateProductIntro(product, { targetLanguage: "Spanish" });
    expect(intro.source).toBe("generated");
    expect(intro.intro).toContain("Bluetooth Speaker");
    expect(intro.intro).not.toContain("lowest price");
    expect(intro.copyReminder).toContain("手动发送");
    expect(intro.riskWarnings).toContain("不得编造价格、库存、交期，也不得承诺最低价。");
  });

  it("warns when generated intro lacks MOQ, price, or lead time facts", () => {
    const intro = generateProductIntro(
      {
        ...product,
        moq: null,
        suggestedPrice: null,
        leadTime: null,
        introEn: null
      },
      { targetLanguage: "English" }
    );

    expect(intro.source).toBe("generated");
    expect(intro.riskWarnings).toEqual(
      expect.arrayContaining([
        "产品 MOQ 未填写，请业务员确认后再发送。",
        "产品建议价未填写，请业务员确认价格后再发送。",
        "产品交期未填写，请业务员确认交期后再发送。",
        "库存状态未在产品资料中维护，请业务员确认库存后再发送。"
      ])
    );
  });

  it("adds knowledge base reference when provided", () => {
    const intro = generateProductIntro(product, { targetLanguage: "English" }, [
      {
        id: "kb1",
        title: "Speaker selling points",
        category: "product_selling_points",
        language: "en",
        content: "Suitable for outdoor gifts",
        productId: product.id
      }
    ]);

    expect(intro.knowledgeUsed).toEqual(["Speaker selling points"]);
    expect(intro.intro).toContain("Reference checked");
  });
});
