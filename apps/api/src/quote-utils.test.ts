import { describe, expect, it } from "vitest";
import type { ProductDetail } from "@wa-ai/shared";
import { buildQuoteResponse, validateQuotePayload } from "./quote-utils.js";

const product: ProductDetail = {
  id: "p1",
  name: "Bluetooth Speaker",
  sku: "BT-100",
  category: "Audio",
  images: [],
  videos: [],
  colors: [],
  sizes: [],
  material: null,
  moq: 100,
  suggestedPrice: "12.50",
  minPrice: "10.00",
  leadTime: null,
  sellingPoints: ["waterproof shell"],
  introEn: null,
  introEs: null,
  introPt: null,
  introAr: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

describe("quote utils", () => {
  it("validates required fields", () => {
    const errors = validateQuotePayload({ productId: "", quantity: 0, unitPrice: 0, currency: "" });
    expect(errors.map((error) => error.field)).toEqual(["productId", "quantity", "unitPrice", "currency"]);
  });

  it("generates tier quote and required risk warnings", () => {
    const quote = buildQuoteResponse(
      {
        productId: "p1",
        quantity: 50,
        unitPrice: 9,
        currency: "USD",
        tiers: [
          { quantity: 50, unitPrice: 9 },
          { quantity: 100, unitPrice: 8.5 },
          { quantity: 300, unitPrice: 8 }
        ],
        promiseStock: true,
        stockKnown: false
      },
      product
    );

    expect(quote.quoteText).toContain("Tier price");
    expect(quote.quoteText).toContain("300 pcs");
    expect(quote.quoteText).toContain("draft quotation");
    expect(quote.riskWarnings).toContain("AI/系统仅生成草稿，请业务员确认价格、库存、交期、运费后再发送。");
    expect(quote.riskWarnings).toContain("报价话术是草稿，不会自动发送 WhatsApp 消息。");
    expect(quote.riskWarnings).toContain("当前报价低于最低价，请确认");
    expect(quote.riskWarnings).toContain("未填写运费，请确认客户国家、城市和物流方式");
    expect(quote.riskWarnings).toContain("库存未建模，请业务员确认库存后再承诺");
    expect(quote.riskWarnings).toContain("未填写交期，请确认后再发送");
    expect(quote.riskWarnings).toContain("不允许系统编造库存、运费、交期、折扣或付款条件。");
    expect(quote.riskWarnings.join(" ")).toContain("库存未知");
  });

  it("warns when quote text mentions attached without an attachment", () => {
    const quote = buildQuoteResponse(
      {
        productId: "p1",
        quantity: 100,
        unitPrice: 12,
        currency: "USD",
        shippingCost: 20,
        leadTime: "7-10 days",
        stockKnown: true,
        quoteText: "Please check the attached quotation."
      },
      product
    );

    expect(quote.riskWarnings.join(" ")).toContain("attached");
    expect(quote.riskWarnings.join(" ")).toContain("未选择附件");
  });
});
