import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { generateAiReply } from "./ai-reply.js";
import { createKnowledgeBaseRouter } from "./knowledge-base-api.js";
import { buildKnowledgeContext, findKnowledgeForAi } from "./knowledge-base-service.js";

type ProductRow = { id: string; ownerId: string; name: string };
type KnowledgeRow = {
  id: string;
  title: string;
  category: string;
  content: string;
  language: string;
  productId: string | null;
  enabled: boolean;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
};

function createTestApp(seed: { products?: ProductRow[]; knowledge?: KnowledgeRow[] } = {}) {
  const products = seed.products || [{ id: "product-1", ownerId: "sales-1", name: "Blue Dress" }];
  const knowledge = [...(seed.knowledge || [])];
  let nextId = 1;

  const db = {
    product: {
      async findFirst(args: { where: Record<string, any> }) {
        return products.find((product) => matchesWhere(product, args.where)) || null;
      }
    },
    knowledgeBase: {
      async findMany(args: { where: Record<string, any>; take?: number }) {
        return knowledge.filter((item) => matchesWhere(item, args.where)).slice(0, args.take || 200);
      },
      async findFirst(args: { where: Record<string, any> }) {
        return knowledge.find((item) => matchesWhere(item, args.where)) || null;
      },
      async create(args: { data: Record<string, any> }) {
        const now = new Date("2026-05-20T00:00:00.000Z");
        const item: KnowledgeRow = {
          id: `kb-${nextId++}`,
          title: args.data.title,
          category: args.data.category,
          content: args.data.content,
          language: args.data.language,
          productId: args.data.productId ?? null,
          enabled: args.data.enabled,
          ownerId: args.data.ownerId,
          createdAt: now,
          updatedAt: now
        };
        knowledge.push(item);
        return item;
      },
      async update(args: { where: { id: string }; data: Record<string, any> }) {
        const index = knowledge.findIndex((item) => item.id === args.where.id);
        knowledge[index] = { ...knowledge[index], ...args.data, updatedAt: new Date("2026-05-20T01:00:00.000Z") };
        return knowledge[index];
      },
      async deleteMany(args: { where: Record<string, any> }) {
        const before = knowledge.length;
        for (let index = knowledge.length - 1; index >= 0; index -= 1) {
          if (matchesWhere(knowledge[index], args.where)) knowledge.splice(index, 1);
        }
        return { count: before - knowledge.length };
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
  app.use("/api/knowledge-base", createKnowledgeBaseRouter(db as any));
  return { app, db, knowledge };
}

describe("KnowledgeBase CRUD API", () => {
  it("creates knowledge for the current user", async () => {
    const { app } = createTestApp();

    const response = await request(app).post("/api/knowledge-base").set("x-user-id", "sales-1").send(validKnowledge()).expect(201);

    expect(response.body).toMatchObject({ id: "kb-1", ownerId: "sales-1", title: "Company intro", enabled: true });
  });

  it("lists only current user's knowledge and supports filters/search", async () => {
    const { app } = createTestApp({
      knowledge: [
        makeKnowledge({ id: "kb-1", ownerId: "sales-1", category: "logistics", language: "en", title: "Mexico shipping", content: "Ship to Mexico after confirming city." }),
        makeKnowledge({ id: "kb-2", ownerId: "sales-1", category: "payment_methods", language: "en", title: "PayPal", content: "PayPal account must be confirmed by salesperson." }),
        makeKnowledge({ id: "kb-product", ownerId: "sales-1", category: "product_selling_points", language: "en", productId: "product-1", title: "Blue Dress points" }),
        makeKnowledge({ id: "kb-3", ownerId: "sales-2", category: "logistics", language: "en", title: "Other logistics" })
      ]
    });

    expect((await request(app).get("/api/knowledge-base").set("x-user-id", "sales-1").expect(200)).body.map((item: any) => item.id)).toEqual(["kb-1", "kb-2", "kb-product"]);
    expect((await request(app).get("/api/knowledge-base?category=logistics").set("x-user-id", "sales-1").expect(200)).body.map((item: any) => item.id)).toEqual(["kb-1"]);
    expect((await request(app).get("/api/knowledge-base?language=en").set("x-user-id", "sales-1").expect(200)).body.map((item: any) => item.id)).toEqual(["kb-1", "kb-2", "kb-product"]);
    expect((await request(app).get("/api/knowledge-base?productId=product-1").set("x-user-id", "sales-1").expect(200)).body.map((item: any) => item.id)).toEqual(["kb-product"]);
    expect((await request(app).get("/api/knowledge-base?q=paypal").set("x-user-id", "sales-1").expect(200)).body.map((item: any) => item.id)).toEqual(["kb-2"]);
  });

  it("rejects cross-user detail, update, and delete access", async () => {
    const { app } = createTestApp({ knowledge: [makeKnowledge({ id: "kb-other", ownerId: "sales-2" })] });

    await request(app).get("/api/knowledge-base/kb-other").set("x-user-id", "sales-1").expect(404);
    await request(app).patch("/api/knowledge-base/kb-other").set("x-user-id", "sales-1").send({ title: "bad" }).expect(404);
    await request(app).delete("/api/knowledge-base/kb-other").set("x-user-id", "sales-1").expect(404);
  });

  it("rejects productId that belongs to another user", async () => {
    const { app } = createTestApp({ products: [{ id: "product-2", ownerId: "sales-2", name: "Other" }] });
    await request(app).post("/api/knowledge-base").set("x-user-id", "sales-1").send({ ...validKnowledge(), productId: "product-2" }).expect(404);
  });

  it("enables and disables knowledge", async () => {
    const { app } = createTestApp({ knowledge: [makeKnowledge({ id: "kb-1", enabled: true })] });
    expect((await request(app).post("/api/knowledge-base/kb-1/disable").set("x-user-id", "sales-1").expect(200)).body.enabled).toBe(false);
    expect((await request(app).post("/api/knowledge-base/kb-1/enable").set("x-user-id", "sales-1").expect(200)).body.enabled).toBe(true);
  });

  it("does not use disabled or unrelated product knowledge for AI and returns knowledgeUsed when enabled", async () => {
    const { db } = createTestApp({
      knowledge: [
        makeKnowledge({ id: "kb-1", title: "Mexico logistics", category: "logistics", language: "en", enabled: true }),
        makeKnowledge({ id: "kb-disabled", title: "Disabled policy", category: "logistics", language: "en", enabled: false }),
        makeKnowledge({ id: "kb-other-product", title: "Other product policy", category: "logistics", language: "en", productId: "product-1", enabled: true })
      ]
    });

    const lookup = await findKnowledgeForAi(db as any, { ownerId: "sales-1", targetLanguage: "English", scenario: "shipping", mode: "reply", keyword: "Can you ship to Mexico?" });
    const knowledge = buildKnowledgeContext(lookup.items);
    const reply = generateAiReply({ customerMessage: "Can you ship to Mexico?", targetLanguage: "English", scenario: "shipping", ...knowledge });

    expect(reply.knowledgeUsed).toEqual(["Mexico logistics"]);
    expect(reply.riskWarnings.join(" ")).not.toContain("未找到相关知识库内容");
  });

  it("warns when no knowledge is matched and when forbidden expressions are present", async () => {
    const noKnowledge = generateAiReply({ customerMessage: "Can you ship to Mexico?", targetLanguage: "English", scenario: "shipping" });
    expect(noKnowledge.knowledgeUsed).toEqual([]);
    expect(noKnowledge.riskWarnings).toContain("未找到相关知识库内容，请业务员确认公司政策、价格、库存、交期和售后规则。");

    const forbiddenKnowledge = buildKnowledgeContext([
      {
        id: "kb-forbidden",
        title: "Forbidden words",
        category: "forbidden_expressions",
        content: "lowest price\nalways in stock",
        language: "en",
        productId: null
      }
    ]);
    const forbidden = generateAiReply({
      customerMessage: "Can you give lowest price?",
      targetLanguage: "English",
      scenario: "discount",
      ...forbiddenKnowledge
    });
    expect(forbidden.riskWarnings.join(" ")).toContain("禁用表达");
  });
});

function validKnowledge() {
  return { title: "Company intro", category: "company_intro", content: "We are a cross-border supplier.", language: "en", enabled: true };
}

function makeKnowledge(overrides: Partial<KnowledgeRow> = {}): KnowledgeRow {
  return {
    id: "kb-1",
    title: "Company intro",
    category: "company_intro",
    content: "We are a cross-border supplier.",
    language: "en",
    productId: null,
    enabled: true,
    ownerId: "sales-1",
    createdAt: new Date("2026-05-20T00:00:00.000Z"),
    updatedAt: new Date("2026-05-20T00:00:00.000Z"),
    ...overrides
  };
}

function matchesWhere<T extends Record<string, any>>(item: T, where: Record<string, any>): boolean {
  return Object.entries(where).every(([key, expected]) => {
    if (expected === undefined) return true;
    if (key === "OR" && Array.isArray(expected)) return expected.some((candidate) => matchesWhere(item, candidate));
    if (expected && typeof expected === "object" && "in" in expected) return expected.in.includes(item[key]);
    if (expected && typeof expected === "object" && "contains" in expected) return String(item[key] || "").toLowerCase().includes(String(expected.contains).toLowerCase());
    return item[key] === expected;
  });
}
