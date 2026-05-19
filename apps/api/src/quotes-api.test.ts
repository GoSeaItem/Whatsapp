import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createQuotesRouter } from "./quotes-api.js";

type TestCustomer = {
  id: string;
  ownerId: string;
  name: string;
};

type TestProduct = {
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
  suggestedPrice: number | null;
  minPrice: number | null;
  leadTime: string | null;
  sellingPoints: string[];
  introEn: string | null;
  introEs: string | null;
  introPt: string | null;
  introAr: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
};

type TestQuote = {
  id: string;
  customerId: string;
  productId: string;
  ownerId: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  shippingCost: number | null;
  moq: number | null;
  leadTime: string | null;
  includeShipping: boolean;
  quoteText: string;
  createdBy: string | null;
  createdAt: Date;
};

function createTestApp(seed: { customers?: TestCustomer[]; products?: TestProduct[]; quotes?: TestQuote[] } = {}) {
  const customers = [...(seed.customers || [])];
  const products = [...(seed.products || [])];
  const quotes = [...(seed.quotes || [])];
  let nextQuoteId = 1;

  const db = {
    customer: {
      async findFirst(args: { where: Record<string, any> }) {
        return customers.find((customer) => matchesWhere(customer, args.where)) || null;
      }
    },
    product: {
      async findFirst(args: { where: Record<string, any> }) {
        return products.find((product) => matchesWhere(product, args.where)) || null;
      }
    },
    quote: {
      async findMany(args: { where: Record<string, any> }) {
        return quotes
          .filter((quote) => matchesWhere(quote, args.where))
          .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
      },
      async findFirst(args: { where: Record<string, any> }) {
        return quotes.find((quote) => matchesWhere(quote, args.where)) || null;
      },
      async create(args: { data: Record<string, any> }) {
        const quote: TestQuote = {
          id: `quote-${nextQuoteId++}`,
          customerId: args.data.customerId,
          productId: args.data.productId,
          ownerId: args.data.ownerId,
          quantity: args.data.quantity,
          unitPrice: Number(args.data.unitPrice),
          currency: args.data.currency,
          shippingCost: args.data.shippingCost === null ? null : Number(args.data.shippingCost),
          moq: args.data.moq ?? null,
          leadTime: args.data.leadTime ?? null,
          includeShipping: args.data.includeShipping,
          quoteText: args.data.quoteText,
          createdBy: args.data.createdBy,
          createdAt: new Date("2026-05-18T08:00:00.000Z")
        };
        quotes.push(quote);
        return quote;
      },
      async update(args: { where: { id: string }; data: Record<string, any> }) {
        const index = quotes.findIndex((quote) => quote.id === args.where.id);
        if (index === -1) throw new Error("not found");
        quotes[index] = {
          ...quotes[index],
          customerId: args.data.customerId,
          productId: args.data.productId,
          ownerId: args.data.ownerId,
          quantity: args.data.quantity,
          unitPrice: Number(args.data.unitPrice),
          currency: args.data.currency,
          shippingCost: args.data.shippingCost === null ? null : Number(args.data.shippingCost),
          moq: args.data.moq ?? null,
          leadTime: args.data.leadTime ?? null,
          includeShipping: args.data.includeShipping,
          quoteText: args.data.quoteText,
          createdBy: args.data.createdBy
        };
        return quotes[index];
      },
      async deleteMany(args: { where: Record<string, any> }) {
        const before = quotes.length;
        for (let index = quotes.length - 1; index >= 0; index -= 1) {
          if (matchesWhere(quotes[index], args.where)) quotes.splice(index, 1);
        }
        return { count: before - quotes.length };
      }
    }
  };

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const userId = req.header("x-user-id") || "sales-1";
    req.user = { id: userId, email: `${userId}@example.com`, name: userId };
    next();
  });
  app.use("/api/quotes", createQuotesRouter(db as any));
  return { app, quotes };
}

describe("Quote CRUD API", () => {
  it("creates quotes for owned customer and product", async () => {
    const { app } = createTestApp(baseSeed());

    const response = await request(app).post("/api/quotes").set("x-user-id", "sales-1").send(validQuote()).expect(201);

    expect(response.body).toMatchObject({
      id: "quote-1",
      customerId: "customer-1",
      productId: "product-1",
      createdBy: "sales-1"
    });
    expect(response.body.quoteText).toContain("Bluetooth Speaker");
    expect(response.body.riskWarnings).toContain("报价话术是草稿，不会自动发送 WhatsApp 消息。");
  });

  it("lists only the current user's quotes", async () => {
    const { app } = createTestApp({
      ...baseSeed(),
      quotes: [
        makeQuote({ id: "quote-1", ownerId: "sales-1", createdBy: "sales-1" }),
        makeQuote({ id: "quote-2", ownerId: "sales-2", createdBy: "sales-2", customerId: "customer-2", productId: "product-2" })
      ]
    });

    const response = await request(app).get("/api/quotes").set("x-user-id", "sales-1").expect(200);
    expect(response.body.map((quote: { id: string }) => quote.id)).toEqual(["quote-1"]);
  });

  it("rejects cross-user detail, update, and delete access", async () => {
    const { app } = createTestApp({
      ...baseSeed(),
      quotes: [makeQuote({ id: "quote-other", ownerId: "sales-2", createdBy: "sales-2", customerId: "customer-2", productId: "product-2" })]
    });

    await request(app).get("/api/quotes/quote-other").set("x-user-id", "sales-1").expect(404);
    await request(app).patch("/api/quotes/quote-other").set("x-user-id", "sales-1").send({ unitPrice: 8 }).expect(404);
    await request(app).delete("/api/quotes/quote-other").set("x-user-id", "sales-1").expect(404);
  });

  it("updates and deletes the current user's quote", async () => {
    const { app } = createTestApp({ ...baseSeed(), quotes: [makeQuote({ id: "quote-1" })] });

    const update = await request(app)
      .patch("/api/quotes/quote-1")
      .set("x-user-id", "sales-1")
      .send({ unitPrice: 9, shippingCost: null, leadTime: "" })
      .expect(200);
    expect(update.body.unitPrice).toBe("9.00");
    expect(update.body.riskWarnings).toContain("当前报价低于最低价，请确认");

    await request(app).delete("/api/quotes/quote-1").set("x-user-id", "sales-1").expect(204);
    await request(app).get("/api/quotes/quote-1").set("x-user-id", "sales-1").expect(404);
  });

  it("rejects create when customerId belongs to another user", async () => {
    const { app } = createTestApp(baseSeed());

    await request(app)
      .post("/api/quotes")
      .set("x-user-id", "sales-1")
      .send({ ...validQuote(), customerId: "customer-2" })
      .expect(404);
  });

  it("rejects create when productId belongs to another user", async () => {
    const { app } = createTestApp(baseSeed());

    await request(app)
      .post("/api/quotes")
      .set("x-user-id", "sales-1")
      .send({ ...validQuote(), productId: "product-2" })
      .expect(404);
  });

  it("returns required risk warnings for low price, missing shipping, and missing lead time", async () => {
    const { app } = createTestApp(baseSeed());

    const response = await request(app)
      .post("/api/quotes/generate")
      .set("x-user-id", "sales-1")
      .send({ ...validQuote(), customerId: null, unitPrice: 8, shippingCost: null, leadTime: null })
      .expect(200);

    expect(response.body.riskWarnings).toContain("当前报价低于最低价，请确认");
    expect(response.body.riskWarnings).toContain("未填写运费，请确认客户国家、城市和物流方式");
    expect(response.body.riskWarnings).toContain("未填写交期，请确认后再发送");
    expect(response.body.riskWarnings).toContain("库存未建模，请业务员确认库存后再承诺");
    expect(response.body.riskWarnings).toContain("不允许系统编造库存、运费、交期、折扣或付款条件。");
  });

  it("generates draft text without any WhatsApp auto-send behavior", async () => {
    const { app } = createTestApp(baseSeed());

    const response = await request(app)
      .post("/api/quotes/generate")
      .set("x-user-id", "sales-1")
      .send(validQuote())
      .expect(200);

    const payloadText = JSON.stringify(response.body).toLowerCase();
    expect(response.body.createdBy).toBe("sales-1");
    expect(payloadText).toContain("draft");
    expect(payloadText).not.toMatch(/click.*send|send button|automatic send|auto-send|bulk send/);
  });
});

function baseSeed() {
  return {
    customers: [
      { id: "customer-1", ownerId: "sales-1", name: "A Buyer" },
      { id: "customer-2", ownerId: "sales-2", name: "Other Buyer" }
    ],
    products: [
      makeProduct({ id: "product-1", ownerId: "sales-1", leadTime: null }),
      makeProduct({ id: "product-2", ownerId: "sales-2", leadTime: null })
    ]
  };
}

function validQuote() {
  return {
    customerId: "customer-1",
    productId: "product-1",
    quantity: 100,
    unitPrice: 12.5,
    currency: "USD",
    shippingCost: 30,
    moq: 100,
    leadTime: "7-10 days",
    includeShipping: false,
    targetLanguage: "English",
    tiers: [
      { quantity: 50, unitPrice: 13 },
      { quantity: 100, unitPrice: 12.5 },
      { quantity: 300, unitPrice: 11.2 }
    ],
    stockKnown: false,
    promiseStock: false,
    attachmentSelected: false
  };
}

function makeProduct(overrides: Partial<TestProduct>): TestProduct {
  const now = new Date("2026-05-18T08:00:00.000Z");
  return {
    id: "product-1",
    name: "Bluetooth Speaker",
    sku: "BT-100",
    category: "Audio",
    images: [],
    videos: [],
    colors: [],
    sizes: [],
    material: null,
    moq: 100,
    suggestedPrice: 12.5,
    minPrice: 10,
    leadTime: "7-10 days",
    sellingPoints: ["portable"],
    introEn: null,
    introEs: null,
    introPt: null,
    introAr: null,
    ownerId: "sales-1",
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function makeQuote(overrides: Partial<TestQuote>): TestQuote {
  return {
    id: "quote-1",
    customerId: "customer-1",
    productId: "product-1",
    ownerId: "sales-1",
    quantity: 100,
    unitPrice: 12.5,
    currency: "USD",
    shippingCost: 30,
    moq: 100,
    leadTime: "7-10 days",
    includeShipping: false,
    quoteText: "Draft quote",
    createdBy: "sales-1",
    createdAt: new Date("2026-05-18T08:00:00.000Z"),
    ...overrides
  };
}

function matchesWhere(record: Record<string, any>, where: Record<string, any>) {
  return Object.entries(where).every(([key, value]) => {
    if (value === undefined) return true;
    return record[key] === value;
  });
}
