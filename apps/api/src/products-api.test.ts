import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createProductsRouter } from "./products-api.js";

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

function createTestApp(seed: TestProduct[] = []) {
  const products = [...seed];
  let nextId = 1;

  const db = {
    product: {
      async findMany(args: { where: Record<string, any> }) {
        return products.filter((product) => matchesWhere(product, args.where));
      },
      async findFirst(args: { where: Record<string, any> }) {
        return products.find((product) => matchesWhere(product, args.where)) || null;
      },
      async create(args: { data: Record<string, any> }) {
        const now = new Date("2026-05-18T08:00:00.000Z");
        const product: TestProduct = {
          id: `product-${nextId++}`,
          name: args.data.name,
          sku: args.data.sku,
          category: args.data.category ?? null,
          images: args.data.images ?? [],
          videos: args.data.videos ?? [],
          colors: args.data.colors ?? [],
          sizes: args.data.sizes ?? [],
          material: args.data.material ?? null,
          moq: args.data.moq ?? null,
          suggestedPrice: args.data.suggestedPrice ?? null,
          minPrice: args.data.minPrice ?? null,
          leadTime: args.data.leadTime ?? null,
          sellingPoints: args.data.sellingPoints ?? [],
          introEn: args.data.introEn ?? null,
          introEs: args.data.introEs ?? null,
          introPt: args.data.introPt ?? null,
          introAr: args.data.introAr ?? null,
          ownerId: args.data.ownerId,
          createdAt: now,
          updatedAt: now
        };
        products.push(product);
        return product;
      },
      async update(args: { where: { id: string }; data: Record<string, any> }) {
        const index = products.findIndex((product) => product.id === args.where.id);
        if (index === -1) throw new Error("not found");
        products[index] = { ...products[index], ...args.data, updatedAt: new Date("2026-05-18T09:00:00.000Z") };
        return products[index];
      },
      async deleteMany(args: { where: Record<string, any> }) {
        const before = products.length;
        for (let index = products.length - 1; index >= 0; index -= 1) {
          if (matchesWhere(products[index], args.where)) products.splice(index, 1);
        }
        return { count: before - products.length };
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
  app.use("/api/products", createProductsRouter(db as any));
  return { app, products };
}

describe("Product CRUD API", () => {
  it("creates products with the current user's ownerId", async () => {
    const { app } = createTestApp();

    const response = await request(app)
      .post("/api/products")
      .set("x-user-id", "sales-1")
      .send({
        name: "Bluetooth Speaker",
        sku: "BT-100",
        category: "Audio",
        colors: ["Black"],
        moq: 100,
        suggestedPrice: 12.5,
        sellingPoints: ["portable design"],
        introEn: "Stored English intro"
      })
      .expect(201);

    expect(response.body).toMatchObject({
      name: "Bluetooth Speaker",
      sku: "BT-100",
      ownerId: "sales-1"
    });
  });

  it("lists only current user's products and supports name, SKU, and category search", async () => {
    const { app } = createTestApp([
      makeProduct({ id: "p1", ownerId: "sales-1", name: "Bluetooth Speaker", sku: "BT-100", category: "Audio" }),
      makeProduct({ id: "p2", ownerId: "sales-1", name: "Desk Lamp", sku: "DL-200", category: "Lighting" }),
      makeProduct({ id: "p3", ownerId: "sales-2", name: "Bluetooth Speaker", sku: "BT-999", category: "Audio" })
    ]);

    const byName = await request(app).get("/api/products?q=Bluetooth").set("x-user-id", "sales-1").expect(200);
    expect(byName.body.map((product: { id: string }) => product.id)).toEqual(["p1"]);

    const bySku = await request(app).get("/api/products?q=DL-200").set("x-user-id", "sales-1").expect(200);
    expect(bySku.body.map((product: { id: string }) => product.id)).toEqual(["p2"]);

    const byCategory = await request(app).get("/api/products?category=Audio").set("x-user-id", "sales-1").expect(200);
    expect(byCategory.body.map((product: { id: string }) => product.id)).toEqual(["p1"]);
  });

  it("gets, updates, and deletes the current user's product", async () => {
    const { app } = createTestApp([makeProduct({ id: "p1", ownerId: "sales-1", name: "Before" })]);

    await request(app).get("/api/products/p1").set("x-user-id", "sales-1").expect(200);

    const updateResponse = await request(app)
      .patch("/api/products/p1")
      .set("x-user-id", "sales-1")
      .send({ name: "After", category: "Updated" })
      .expect(200);
    expect(updateResponse.body).toMatchObject({ id: "p1", name: "After", category: "Updated" });

    await request(app).delete("/api/products/p1").set("x-user-id", "sales-1").expect(204);
    await request(app).get("/api/products/p1").set("x-user-id", "sales-1").expect(404);
  });

  it("rejects cross-user detail, update, delete, and intro generation access", async () => {
    const { app } = createTestApp([makeProduct({ id: "other-product", ownerId: "sales-2", name: "Other" })]);

    await request(app).get("/api/products/other-product").set("x-user-id", "sales-1").expect(404);
    await request(app).patch("/api/products/other-product").set("x-user-id", "sales-1").send({ name: "Hacked" }).expect(404);
    await request(app).delete("/api/products/other-product").set("x-user-id", "sales-1").expect(404);
    await request(app).post("/api/products/other-product/intro").set("x-user-id", "sales-1").send({ targetLanguage: "English" }).expect(404);

    const ownerResponse = await request(app).get("/api/products/other-product").set("x-user-id", "sales-2").expect(200);
    expect(ownerResponse.body.name).toBe("Other");
  });

  it("generates intro from stored language intro or generated fallback", async () => {
    const { app } = createTestApp([
      makeProduct({
        id: "p1",
        ownerId: "sales-1",
        introEn: "Stored English intro",
        introEs: null,
        sellingPoints: ["waterproof shell", "portable design"]
      })
    ]);

    const stored = await request(app)
      .post("/api/products/p1/intro")
      .set("x-user-id", "sales-1")
      .send({ targetLanguage: "English" })
      .expect(200);
    expect(stored.body).toMatchObject({ source: "stored", intro: "Stored English intro" });

    const generated = await request(app)
      .post("/api/products/p1/intro")
      .set("x-user-id", "sales-1")
      .send({ targetLanguage: "Spanish" })
      .expect(200);
    expect(generated.body.source).toBe("generated");
    expect(generated.body.intro).toContain("waterproof shell");
    expect(generated.body.riskWarnings).toContain("不得编造价格、库存、交期，也不得承诺最低价。");
  });

  it("returns clear validation errors for invalid product forms", async () => {
    const { app } = createTestApp();

    const response = await request(app).post("/api/products").set("x-user-id", "sales-1").send({ name: "", sku: "" }).expect(400);

    expect(response.body.errors).toContainEqual({ field: "name", message: "产品名称不能为空" });
    expect(response.body.errors).toContainEqual({ field: "sku", message: "SKU 不能为空" });
  });
});

function makeProduct(overrides: Partial<TestProduct>): TestProduct {
  const now = new Date("2026-05-18T08:00:00.000Z");
  return {
    id: "product-id",
    name: "Product",
    sku: "SKU-1",
    category: null,
    images: [],
    videos: [],
    colors: [],
    sizes: [],
    material: null,
    moq: 100,
    suggestedPrice: 12.5,
    minPrice: 10,
    leadTime: "7-10 days",
    sellingPoints: [],
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

function matchesWhere(product: TestProduct, where: Record<string, any>) {
  if (where.ownerId && product.ownerId !== where.ownerId) return false;
  if (where.id && product.id !== where.id) return false;
  if (where.category?.equals && product.category?.toLowerCase() !== where.category.equals.toLowerCase()) return false;
  if (where.OR) {
    return where.OR.some((condition: Record<string, { contains: string }>) =>
      Object.entries(condition).some(([field, matcher]) =>
        String(product[field as keyof TestProduct] || "").toLowerCase().includes(matcher.contains.toLowerCase())
      )
    );
  }
  return true;
}
