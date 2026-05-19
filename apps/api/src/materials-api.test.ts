import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createMaterialsRouter } from "./materials-api.js";

type ProductRow = {
  id: string;
  ownerId: string;
  name: string;
};

type MaterialRow = {
  id: string;
  title: string;
  type: string;
  url: string;
  description: string | null;
  language: string;
  productId: string | null;
  tags: string[];
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
};

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

function createTestApp(seed: { products?: ProductRow[]; materials?: MaterialRow[]; knowledge?: KnowledgeRow[] } = {}) {
  const products = seed.products || [{ id: "product-1", ownerId: "sales-1", name: "Blue Dress" }];
  const materials = [...(seed.materials || [])];
  const knowledge = [...(seed.knowledge || [])];
  let nextId = 1;

  const db = {
    product: {
      async findFirst(args: { where: Record<string, any> }) {
        return products.find((product) => matchesWhere(product, args.where)) || null;
      }
    },
    material: {
      async findMany(args: { where: Record<string, any>; take?: number }) {
        return materials.filter((material) => matchesWhere(material, args.where)).slice(0, args.take || 200);
      },
      async findFirst(args: { where: Record<string, any> }) {
        return materials.find((material) => matchesWhere(material, args.where)) || null;
      },
      async create(args: { data: Record<string, any> }) {
        const now = new Date("2026-05-20T02:00:00.000Z");
        const material: MaterialRow = {
          id: `material-${nextId++}`,
          title: args.data.title,
          type: args.data.type,
          url: args.data.url,
          description: args.data.description ?? null,
          language: args.data.language,
          productId: args.data.productId ?? null,
          tags: args.data.tags ?? [],
          ownerId: args.data.ownerId,
          createdAt: now,
          updatedAt: now
        };
        materials.push(material);
        return material;
      },
      async update(args: { where: { id: string }; data: Record<string, any> }) {
        const index = materials.findIndex((material) => material.id === args.where.id);
        materials[index] = { ...materials[index], ...args.data, updatedAt: new Date("2026-05-20T03:00:00.000Z") };
        return materials[index];
      },
      async deleteMany(args: { where: Record<string, any> }) {
        const before = materials.length;
        for (let index = materials.length - 1; index >= 0; index -= 1) {
          if (matchesWhere(materials[index], args.where)) materials.splice(index, 1);
        }
        return { count: before - materials.length };
      }
    },
    knowledgeBase: {
      async findMany(args: { where: Record<string, any>; take?: number }) {
        return knowledge.filter((item) => matchesWhere(item, args.where)).slice(0, args.take || 50);
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
  app.use("/api/materials", createMaterialsRouter(db as any));
  return { app, materials };
}

describe("Material CRUD API", () => {
  it("creates materials with current user's ownerId", async () => {
    const { app } = createTestApp();

    const response = await request(app)
      .post("/api/materials")
      .set("x-user-id", "sales-1")
      .send(validMaterial())
      .expect(201);

    expect(response.body).toMatchObject({
      id: "material-1",
      title: "Blue Dress real picture",
      type: "image",
      ownerId: "sales-1",
      productId: "product-1"
    });
  });

  it("lists only current user's materials and supports type, language, product, keyword, and tag filters", async () => {
    const { app } = createTestApp({
      materials: [
        makeMaterial({ id: "m1", ownerId: "sales-1", type: "image", language: "en", productId: "product-1", title: "Blue Dress photo", tags: ["real", "summer"] }),
        makeMaterial({ id: "m2", ownerId: "sales-1", type: "catalog", language: "es", productId: null, title: "Summer catalog", description: "Wholesale catalog", tags: ["catalog"] }),
        makeMaterial({ id: "m3", ownerId: "sales-2", type: "image", language: "en", productId: "product-2", title: "Other photo", tags: ["real"] })
      ]
    });

    expect((await request(app).get("/api/materials").set("x-user-id", "sales-1").expect(200)).body.map((item: any) => item.id)).toEqual(["m1", "m2"]);
    expect((await request(app).get("/api/materials?type=image").set("x-user-id", "sales-1").expect(200)).body.map((item: any) => item.id)).toEqual(["m1"]);
    expect((await request(app).get("/api/materials?language=es").set("x-user-id", "sales-1").expect(200)).body.map((item: any) => item.id)).toEqual(["m2"]);
    expect((await request(app).get("/api/materials?productId=product-1").set("x-user-id", "sales-1").expect(200)).body.map((item: any) => item.id)).toEqual(["m1"]);
    expect((await request(app).get("/api/materials?q=wholesale").set("x-user-id", "sales-1").expect(200)).body.map((item: any) => item.id)).toEqual(["m2"]);
    expect((await request(app).get("/api/materials?tag=summer").set("x-user-id", "sales-1").expect(200)).body.map((item: any) => item.id)).toEqual(["m1"]);
  });

  it("gets, updates, and deletes the current user's material", async () => {
    const { app } = createTestApp({ materials: [makeMaterial({ id: "m1", ownerId: "sales-1", title: "Before" })] });

    await request(app).get("/api/materials/m1").set("x-user-id", "sales-1").expect(200);

    const updated = await request(app)
      .patch("/api/materials/m1")
      .set("x-user-id", "sales-1")
      .send({ title: "After", type: "buyer_show", tags: ["buyer"] })
      .expect(200);
    expect(updated.body).toMatchObject({ id: "m1", title: "After", type: "buyer_show", tags: ["buyer"] });

    await request(app).delete("/api/materials/m1").set("x-user-id", "sales-1").expect(204);
    await request(app).get("/api/materials/m1").set("x-user-id", "sales-1").expect(404);
  });

  it("rejects cross-user detail, update, delete, and intro generation access", async () => {
    const { app } = createTestApp({ materials: [makeMaterial({ id: "other-material", ownerId: "sales-2", title: "Other" })] });

    await request(app).get("/api/materials/other-material").set("x-user-id", "sales-1").expect(404);
    await request(app).patch("/api/materials/other-material").set("x-user-id", "sales-1").send({ title: "Hacked" }).expect(404);
    await request(app).delete("/api/materials/other-material").set("x-user-id", "sales-1").expect(404);
    await request(app).post("/api/materials/other-material/intro").set("x-user-id", "sales-1").send({ customerLanguage: "English" }).expect(404);
  });

  it("rejects productId that belongs to another user", async () => {
    const { app } = createTestApp({ products: [{ id: "product-2", ownerId: "sales-2", name: "Other Product" }] });

    await request(app).post("/api/materials").set("x-user-id", "sales-1").send({ ...validMaterial(), productId: "product-2" }).expect(404);
  });

  it("generates material intro with knowledgeUsed and safety warnings", async () => {
    const { app } = createTestApp({
      materials: [makeMaterial({ id: "shipping-proof", type: "shipping_proof", title: "Mexico shipment screenshot", productId: null })],
      knowledge: [
        makeKnowledge({ id: "kb-logistics", title: "Mexico logistics policy", category: "logistics", content: "Confirm city before estimating delivery.", language: "en" }),
        makeKnowledge({ id: "kb-disabled", title: "Disabled logistics", category: "logistics", enabled: false })
      ]
    });

    const response = await request(app)
      .post("/api/materials/shipping-proof/intro")
      .set("x-user-id", "sales-1")
      .send({ customerLanguage: "English" })
      .expect(200);

    expect(response.body.introText).toContain("does not guarantee a specific delivery time");
    expect(response.body.knowledgeUsed).toEqual(["Mexico logistics policy"]);
    expect(response.body.riskWarnings.join(" ")).toContain("确认物流方式");
    expect(JSON.stringify(response.body).toLowerCase()).not.toMatch(/click.*send|send button|automatic send|auto-send|bulk send/);
  });

  it("returns payment account warnings and no-knowledge warning when no knowledge is matched", async () => {
    const { app } = createTestApp({
      materials: [makeMaterial({ id: "payment-proof", type: "payment_proof", title: "PayPal payment note", productId: null })]
    });

    const response = await request(app)
      .post("/api/materials/payment-proof/intro")
      .set("x-user-id", "sales-1")
      .send({ customerLanguage: "English" })
      .expect(200);

    expect(response.body.knowledgeUsed).toEqual([]);
    expect(response.body.riskWarnings).toContain("未找到相关知识库内容，请业务员确认公司政策、价格、库存、交期和售后规则。");
    expect(response.body.riskWarnings.join(" ")).toContain("确认收款账户");
  });
});

function validMaterial() {
  return {
    title: "Blue Dress real picture",
    type: "image",
    url: "https://example.com/blue-dress.jpg",
    description: "Real product photo",
    language: "en",
    productId: "product-1",
    tags: ["real", "summer"]
  };
}

function makeMaterial(overrides: Partial<MaterialRow> = {}): MaterialRow {
  return {
    id: "m1",
    title: "Blue Dress real picture",
    type: "image",
    url: "https://example.com/material.jpg",
    description: "Real product photo",
    language: "en",
    productId: "product-1",
    tags: ["real"],
    ownerId: "sales-1",
    createdAt: new Date("2026-05-20T02:00:00.000Z"),
    updatedAt: new Date("2026-05-20T02:00:00.000Z"),
    ...overrides
  };
}

function makeKnowledge(overrides: Partial<KnowledgeRow> = {}): KnowledgeRow {
  return {
    id: "kb-1",
    title: "Company material policy",
    category: "product_selling_points",
    content: "Use material only as draft context.",
    language: "en",
    productId: null,
    enabled: true,
    ownerId: "sales-1",
    createdAt: new Date("2026-05-20T02:00:00.000Z"),
    updatedAt: new Date("2026-05-20T02:00:00.000Z"),
    ...overrides
  };
}

function matchesWhere<T extends Record<string, any>>(item: T, where: Record<string, any>): boolean {
  return Object.entries(where).every(([key, expected]) => {
    if (expected === undefined) return true;
    if (key === "OR" && Array.isArray(expected)) return expected.some((candidate) => matchesWhere(item, candidate));
    if (expected && typeof expected === "object" && "in" in expected) return expected.in.includes(item[key]);
    if (expected && typeof expected === "object" && "contains" in expected) return String(item[key] || "").toLowerCase().includes(String(expected.contains).toLowerCase());
    if (expected && typeof expected === "object" && "has" in expected) return Array.isArray(item[key]) && item[key].includes(expected.has);
    return item[key] === expected;
  });
}
