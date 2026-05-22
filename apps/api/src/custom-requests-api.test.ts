import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createCustomRequestsRouter } from "./custom-requests-api.js";

type CustomerRow = { id: string; ownerId: string; name: string };
type ProductRow = { id: string; ownerId: string; name: string };
type CustomRow = {
  id: string;
  customerId: string;
  productId: string | null;
  requestType: string;
  logoRequired: boolean;
  packagingRequired: boolean;
  colorRequirement: string | null;
  sizeRequirement: string | null;
  materialRequirement: string | null;
  quantity: number | null;
  moq: number | null;
  sampleFee: string | null;
  sampleLeadTime: string | null;
  bulkLeadTime: string | null;
  files: string[];
  status: string;
  notes: string | null;
  ownerId: string;
  customer?: CustomerRow | null;
  product?: ProductRow | null;
  createdAt: Date;
  updatedAt: Date;
};

function createTestApp(seed: { customers?: CustomerRow[]; products?: ProductRow[]; customs?: CustomRow[] } = {}) {
  const customers = seed.customers || [{ id: "customer-1", ownerId: "sales-1", name: "Maria" }];
  const products = seed.products || [{ id: "product-1", ownerId: "sales-1", name: "Blue Dress" }];
  const customs = [...(seed.customs || [])];
  let nextId = 1;
  const db = {
    customer: { async findFirst(args: { where: Record<string, any> }) { return customers.find((item) => matchesWhere(item, args.where)) || null; } },
    product: { async findFirst(args: { where: Record<string, any> }) { return products.find((item) => matchesWhere(item, args.where)) || null; } },
    knowledgeBase: { async findMany() { return []; } },
    customRequest: {
      async findMany(args: { where: Record<string, any>; take?: number }) {
        return customs.filter((item) => matchesWhere(item, args.where)).slice(0, args.take || 200).map((item) => withRelations(item, customers, products));
      },
      async findFirst(args: { where: Record<string, any> }) {
        const item = customs.find((candidate) => matchesWhere(candidate, args.where));
        return item ? withRelations(item, customers, products) : null;
      },
      async create(args: { data: Record<string, any> }) {
        const now = new Date("2026-05-20T00:00:00.000Z");
        const item: CustomRow = {
          id: `custom-${nextId++}`,
          customerId: args.data.customerId,
          productId: args.data.productId ?? null,
          requestType: args.data.requestType,
          logoRequired: args.data.logoRequired,
          packagingRequired: args.data.packagingRequired,
          colorRequirement: args.data.colorRequirement ?? null,
          sizeRequirement: args.data.sizeRequirement ?? null,
          materialRequirement: args.data.materialRequirement ?? null,
          quantity: args.data.quantity ?? null,
          moq: args.data.moq ?? null,
          sampleFee: args.data.sampleFee === null ? null : String(args.data.sampleFee),
          sampleLeadTime: args.data.sampleLeadTime ?? null,
          bulkLeadTime: args.data.bulkLeadTime ?? null,
          files: args.data.files || [],
          status: args.data.status,
          notes: args.data.notes ?? null,
          ownerId: args.data.ownerId,
          createdAt: now,
          updatedAt: now
        };
        customs.push(item);
        return withRelations(item, customers, products);
      },
      async update(args: { where: { id: string }; data: Record<string, any> }) {
        const index = customs.findIndex((item) => item.id === args.where.id);
        customs[index] = { ...customs[index], ...args.data, updatedAt: new Date("2026-05-20T01:00:00.000Z") };
        return withRelations(customs[index], customers, products);
      },
      async deleteMany(args: { where: Record<string, any> }) {
        const before = customs.length;
        for (let index = customs.length - 1; index >= 0; index -= 1) {
          if (matchesWhere(customs[index], args.where)) customs.splice(index, 1);
        }
        return { count: before - customs.length };
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
  app.use("/api/custom-requests", createCustomRequestsRouter(db as any));
  return { app };
}

describe("CustomRequest API", () => {
  it("creates custom request for current user", async () => {
    const { app } = createTestApp();
    const response = await request(app).post("/api/custom-requests").send(validCustom()).expect(201);
    expect(response.body).toMatchObject({ id: "custom-1", ownerId: "sales-1", customerId: "customer-1", productId: "product-1", requestType: "logo" });
  });

  it("lists only current user's custom requests and supports filters/search", async () => {
    const { app } = createTestApp({
      customs: [
        makeCustom({ id: "c1", ownerId: "sales-1", requestType: "logo", status: "draft", files: ["https://example.com/logo.ai"] }),
        makeCustom({ id: "c2", ownerId: "sales-1", requestType: "packaging", status: "sample_making", notes: "box artwork", files: ["https://example.com/box.pdf"] }),
        makeCustom({ id: "c3", ownerId: "sales-2", requestType: "logo", status: "draft" })
      ]
    });
    expect((await request(app).get("/api/custom-requests").expect(200)).body.map((item: any) => item.id)).toEqual(["c1", "c2"]);
    expect((await request(app).get("/api/custom-requests?customerId=customer-1").expect(200)).body.map((item: any) => item.id)).toEqual(["c1", "c2"]);
    expect((await request(app).get("/api/custom-requests?productId=product-1").expect(200)).body.map((item: any) => item.id)).toEqual(["c1", "c2"]);
    expect((await request(app).get("/api/custom-requests?requestType=packaging").expect(200)).body.map((item: any) => item.id)).toEqual(["c2"]);
    expect((await request(app).get("/api/custom-requests?status=sample_making").expect(200)).body.map((item: any) => item.id)).toEqual(["c2"]);
    expect((await request(app).get("/api/custom-requests?q=box").expect(200)).body.map((item: any) => item.id)).toEqual(["c2"]);
    expect((await request(app).get("/api/custom-requests?q=https://example.com/logo.ai").expect(200)).body.map((item: any) => item.id)).toEqual(["c1"]);
  });

  it("reads, updates, deletes, and updates status for current user's custom request", async () => {
    const { app } = createTestApp({ customs: [makeCustom({ id: "c1" })] });
    expect((await request(app).get("/api/custom-requests/c1").expect(200)).body.requestType).toBe("logo");
    expect((await request(app).patch("/api/custom-requests/c1").send({ notes: "confirmed logo", quantity: 500 }).expect(200)).body.quantity).toBe(500);
    expect((await request(app).patch("/api/custom-requests/c1/status").send({ status: "waiting_customer_confirm" }).expect(200)).body.status).toBe("waiting_customer_confirm");
    expect((await request(app).patch("/api/custom-requests/c1/status").send({ status: "" }).expect(400)).body.errors[0].field).toBe("status");
    expect((await request(app).patch("/api/custom-requests/c1/status").send({}).expect(400)).body.errors[0].field).toBe("status");
    await request(app).delete("/api/custom-requests/c1?confirm=true").expect(204);
    await request(app).get("/api/custom-requests/c1").expect(404);
  });

  it("rejects cross-user access and foreign customer/product creation", async () => {
    const { app } = createTestApp({
      customers: [{ id: "customer-1", ownerId: "sales-1", name: "Maria" }, { id: "customer-2", ownerId: "sales-2", name: "Other" }],
      products: [{ id: "product-1", ownerId: "sales-1", name: "Blue Dress" }, { id: "product-2", ownerId: "sales-2", name: "Other Product" }],
      customs: [makeCustom({ id: "other-custom", ownerId: "sales-2", customerId: "customer-2", productId: "product-2" })]
    });
    await request(app).get("/api/custom-requests/other-custom").expect(404);
    await request(app).patch("/api/custom-requests/other-custom").send({ notes: "hack" }).expect(404);
    await request(app).patch("/api/custom-requests/other-custom/status").send({ status: "closed" }).expect(404);
    await request(app).delete("/api/custom-requests/other-custom").expect(404);
    await request(app).post("/api/custom-requests/other-custom/script").send({ scenario: "custom_confirm" }).expect(404);
    await request(app).post("/api/custom-requests").send({ ...validCustom(), customerId: "customer-2" }).expect(404);
    await request(app).post("/api/custom-requests").send({ ...validCustom(), productId: "product-2" }).expect(404);
  });

  it("generates safe custom scripts with risk warnings", async () => {
    const { app } = createTestApp({ customs: [makeCustom({ id: "c1", moq: null, sampleFee: null, sampleLeadTime: null, bulkLeadTime: null, files: [] })] });
    const confirm = await request(app).post("/api/custom-requests/c1/script").send({ scenario: "custom_confirm" }).expect(200);
    expect(confirm.body.scriptText).toContain("custom type");
    expect(confirm.body.riskWarnings.join(" ")).toContain("Missing logo");
    expect(confirm.body.riskWarnings.join(" ")).toContain("Missing MOQ");
    expect(confirm.body.riskWarnings.join(" ")).toContain("Missing sample fee");
    expect(confirm.body.riskWarnings.join(" ")).toContain("Missing sample lead time");
    expect(confirm.body.riskWarnings.join(" ")).toContain("Missing bulk lead time");
    expect(JSON.stringify(confirm.body).toLowerCase()).not.toMatch(/click.*send|send button|automatic send|auto-send|bulk send/);
    expect((await request(app).post("/api/custom-requests/c1/script").send({ scenario: "custom_request_files" }).expect(200)).body.scriptText).toContain("clear logo files");
    expect((await request(app).post("/api/custom-requests/c1/script").send({ scenario: "custom_sample_fee" }).expect(200)).body.riskWarnings.join(" ")).toContain("must not invent");
  });
});

function validCustom() {
  return {
    customerId: "customer-1",
    productId: "product-1",
    requestType: "logo",
    logoRequired: true,
    packagingRequired: false,
    quantity: 300,
    moq: 300,
    sampleFee: 30,
    sampleLeadTime: "7 days",
    bulkLeadTime: "25 days",
    files: ["https://example.com/logo.ai"]
  };
}

function makeCustom(overrides: Partial<CustomRow> = {}): CustomRow {
  const now = new Date("2026-05-20T00:00:00.000Z");
  return {
    id: "custom-id",
    customerId: "customer-1",
    productId: "product-1",
    requestType: "logo",
    logoRequired: true,
    packagingRequired: false,
    colorRequirement: "blue",
    sizeRequirement: null,
    materialRequirement: null,
    quantity: 300,
    moq: 300,
    sampleFee: "30",
    sampleLeadTime: "7 days",
    bulkLeadTime: "25 days",
    files: ["https://example.com/logo.ai"],
    status: "draft",
    notes: null,
    ownerId: "sales-1",
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function withRelations(item: CustomRow, customers: CustomerRow[], products: ProductRow[]) {
  return {
    ...item,
    customer: customers.find((customer) => customer.id === item.customerId) || null,
    product: products.find((product) => product.id === item.productId) || null
  };
}

function matchesWhere<T extends Record<string, any>>(item: T, where: Record<string, any>): boolean {
  return Object.entries(where).every(([key, expected]) => {
    if (expected === undefined) return true;
    if (key === "OR" && Array.isArray(expected)) return expected.some((candidate) => matchesWhere(item, candidate));
    if (expected && typeof expected === "object" && "in" in expected) return expected.in.includes(item[key]);
    if (expected && typeof expected === "object" && "contains" in expected) return String(item[key] || "").toLowerCase().includes(String(expected.contains).toLowerCase());
    if (expected && typeof expected === "object" && "has" in expected) return Array.isArray(item[key]) && item[key].includes(expected.has);
    if (expected && typeof expected === "object" && "name" in expected) {
      return String((item as any).customer?.name || (item as any).product?.name || "").toLowerCase().includes(String(expected.name.contains).toLowerCase());
    }
    return item[key] === expected;
  });
}
