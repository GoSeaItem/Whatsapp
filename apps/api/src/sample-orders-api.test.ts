import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createSampleOrdersRouter } from "./sample-orders-api.js";

type CustomerRow = { id: string; ownerId: string; name: string };
type ProductRow = { id: string; ownerId: string; name: string };
type SampleRow = {
  id: string;
  customerId: string;
  productId: string | null;
  sampleName: string;
  sampleFee: string | null;
  shippingCost: string | null;
  currency: string;
  paymentStatus: string;
  shippingStatus: string;
  trackingNumber: string | null;
  feedbackStatus: string;
  expectedShipDate: Date | null;
  expectedDeliveryDate: Date | null;
  notes: string | null;
  ownerId: string;
  customer?: CustomerRow | null;
  product?: ProductRow | null;
  createdAt: Date;
  updatedAt: Date;
};

function createTestApp(seed: { customers?: CustomerRow[]; products?: ProductRow[]; samples?: SampleRow[] } = {}) {
  const customers = seed.customers || [{ id: "customer-1", ownerId: "sales-1", name: "Maria" }];
  const products = seed.products || [{ id: "product-1", ownerId: "sales-1", name: "Blue Dress" }];
  const samples = [...(seed.samples || [])];
  let nextId = 1;

  const db = {
    customer: { async findFirst(args: { where: Record<string, any> }) { return customers.find((item) => matchesWhere(item, args.where)) || null; } },
    product: { async findFirst(args: { where: Record<string, any> }) { return products.find((item) => matchesWhere(item, args.where)) || null; } },
    knowledgeBase: { async findMany() { return []; } },
    sampleOrder: {
      async findMany(args: { where: Record<string, any>; take?: number }) {
        return samples.filter((sample) => matchesWhere(sample, args.where)).slice(0, args.take || 200).map((sample) => withRelations(sample, customers, products));
      },
      async findFirst(args: { where: Record<string, any> }) {
        const sample = samples.find((item) => matchesWhere(item, args.where));
        return sample ? withRelations(sample, customers, products) : null;
      },
      async create(args: { data: Record<string, any> }) {
        const now = new Date("2026-05-20T00:00:00.000Z");
        const sample: SampleRow = {
          id: `sample-${nextId++}`,
          customerId: args.data.customerId,
          productId: args.data.productId ?? null,
          sampleName: args.data.sampleName,
          sampleFee: args.data.sampleFee === null ? null : String(args.data.sampleFee),
          shippingCost: args.data.shippingCost === null ? null : String(args.data.shippingCost),
          currency: args.data.currency,
          paymentStatus: args.data.paymentStatus,
          shippingStatus: args.data.shippingStatus,
          trackingNumber: args.data.trackingNumber ?? null,
          feedbackStatus: args.data.feedbackStatus,
          expectedShipDate: args.data.expectedShipDate ?? null,
          expectedDeliveryDate: args.data.expectedDeliveryDate ?? null,
          notes: args.data.notes ?? null,
          ownerId: args.data.ownerId,
          createdAt: now,
          updatedAt: now
        };
        samples.push(sample);
        return withRelations(sample, customers, products);
      },
      async update(args: { where: { id: string }; data: Record<string, any> }) {
        const index = samples.findIndex((sample) => sample.id === args.where.id);
        samples[index] = { ...samples[index], ...args.data, updatedAt: new Date("2026-05-20T01:00:00.000Z") };
        return withRelations(samples[index], customers, products);
      },
      async deleteMany(args: { where: Record<string, any> }) {
        const before = samples.length;
        for (let index = samples.length - 1; index >= 0; index -= 1) {
          if (matchesWhere(samples[index], args.where)) samples.splice(index, 1);
        }
        return { count: before - samples.length };
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
  app.use("/api/sample-orders", createSampleOrdersRouter(db as any));
  return { app, samples };
}

describe("SampleOrder API", () => {
  it("creates sample order for current user", async () => {
    const { app } = createTestApp();
    const response = await request(app).post("/api/sample-orders").set("x-user-id", "sales-1").send(validSample()).expect(201);
    expect(response.body).toMatchObject({ id: "sample-1", ownerId: "sales-1", customerId: "customer-1", productId: "product-1" });
  });

  it("lists only current user's sample orders and supports filters/search", async () => {
    const { app } = createTestApp({
      samples: [
        makeSample({ id: "s1", ownerId: "sales-1", paymentStatus: "unpaid", shippingStatus: "pending", feedbackStatus: "pending", trackingNumber: "TRK1" }),
        makeSample({ id: "s2", ownerId: "sales-1", paymentStatus: "paid", shippingStatus: "shipped", feedbackStatus: "satisfied", sampleName: "Red Dress" }),
        makeSample({ id: "s3", ownerId: "sales-2", paymentStatus: "paid", shippingStatus: "shipped", feedbackStatus: "satisfied" })
      ]
    });
    expect((await request(app).get("/api/sample-orders").set("x-user-id", "sales-1").expect(200)).body.map((item: any) => item.id)).toEqual(["s1", "s2"]);
    expect((await request(app).get("/api/sample-orders?paymentStatus=paid").set("x-user-id", "sales-1").expect(200)).body.map((item: any) => item.id)).toEqual(["s2"]);
    expect((await request(app).get("/api/sample-orders?shippingStatus=shipped").set("x-user-id", "sales-1").expect(200)).body.map((item: any) => item.id)).toEqual(["s2"]);
    expect((await request(app).get("/api/sample-orders?feedbackStatus=satisfied").set("x-user-id", "sales-1").expect(200)).body.map((item: any) => item.id)).toEqual(["s2"]);
    expect((await request(app).get("/api/sample-orders?q=TRK1").set("x-user-id", "sales-1").expect(200)).body.map((item: any) => item.id)).toEqual(["s1"]);
  });

  it("reads, updates, and deletes current user's sample order", async () => {
    const { app } = createTestApp({ samples: [makeSample({ id: "s1" })] });
    expect((await request(app).get("/api/sample-orders/s1").set("x-user-id", "sales-1").expect(200)).body.sampleName).toBe("Blue Dress Sample");
    const updated = await request(app)
      .patch("/api/sample-orders/s1")
      .set("x-user-id", "sales-1")
      .send({ sampleName: "Blue Dress Size M Sample", trackingNumber: "TRK123" })
      .expect(200);
    expect(updated.body).toMatchObject({ sampleName: "Blue Dress Size M Sample", trackingNumber: "TRK123" });
    await request(app).delete("/api/sample-orders/s1?confirm=true").set("x-user-id", "sales-1").expect(204);
    await request(app).get("/api/sample-orders/s1").set("x-user-id", "sales-1").expect(404);
  });

  it("rejects cross-user access and foreign customer/product creation", async () => {
    const { app } = createTestApp({
      customers: [{ id: "customer-2", ownerId: "sales-2", name: "Other" }, { id: "customer-1", ownerId: "sales-1", name: "Maria" }],
      products: [{ id: "product-2", ownerId: "sales-2", name: "Other Product" }, { id: "product-1", ownerId: "sales-1", name: "Blue Dress" }],
      samples: [makeSample({ id: "other-sample", ownerId: "sales-2", customerId: "customer-2", productId: "product-2" })]
    });
    await request(app).get("/api/sample-orders/other-sample").set("x-user-id", "sales-1").expect(404);
    await request(app).patch("/api/sample-orders/other-sample").set("x-user-id", "sales-1").send({ sampleName: "hack" }).expect(404);
    await request(app).patch("/api/sample-orders/other-sample/payment-status").set("x-user-id", "sales-1").send({ paymentStatus: "paid" }).expect(404);
    await request(app).delete("/api/sample-orders/other-sample").set("x-user-id", "sales-1").expect(404);
    await request(app).post("/api/sample-orders/other-sample/script").set("x-user-id", "sales-1").send({ scenario: "sample_quote" }).expect(404);
    await request(app).post("/api/sample-orders").set("x-user-id", "sales-1").send({ ...validSample(), customerId: "customer-2" }).expect(404);
    await request(app).post("/api/sample-orders").set("x-user-id", "sales-1").send({ ...validSample(), productId: "product-2" }).expect(404);
  });

  it("updates payment, shipping, and feedback statuses", async () => {
    const { app } = createTestApp({ samples: [makeSample({ id: "s1" })] });
    expect((await request(app).patch("/api/sample-orders/s1/payment-status").send({ paymentStatus: "paid" }).expect(200)).body.paymentStatus).toBe("paid");
    expect((await request(app).patch("/api/sample-orders/s1/shipping-status").send({ shippingStatus: "shipped" }).expect(200)).body.shippingStatus).toBe("shipped");
    expect((await request(app).patch("/api/sample-orders/s1/feedback-status").send({ feedbackStatus: "satisfied" }).expect(200)).body.feedbackStatus).toBe("satisfied");
    expect((await request(app).patch("/api/sample-orders/s1/payment-status").send({ paymentStatus: "paid_now" }).expect(400)).body.errors[0].field).toBe("paymentStatus");
    expect((await request(app).patch("/api/sample-orders/s1/shipping-status").send({ shippingStatus: "" }).expect(400)).body.errors[0].field).toBe("shippingStatus");
  });

  it("generates safe sample scripts", async () => {
    const { app } = createTestApp({ samples: [makeSample({ id: "s1", sampleFee: null, shippingCost: null })] });
    const quote = await request(app).post("/api/sample-orders/s1/script").send({ scenario: "sample_quote" }).expect(200);
    expect(quote.body.riskWarnings.join(" ")).toContain("\u672a\u586b\u5199\u6837\u54c1\u8d39");
    expect(quote.body.riskWarnings.join(" ")).toContain("\u6536\u6b3e\u8d26\u6237");
    expect(JSON.stringify(quote.body).toLowerCase()).not.toMatch(/click.*send|send button|automatic send|auto-send|bulk send/);
    const shipped = await request(app).post("/api/sample-orders/s1/script").send({ scenario: "sample_shipped" }).expect(200);
    expect(shipped.body.riskWarnings.join(" ")).toContain("\u7269\u6d41\u5355\u53f7");
  });
});

function validSample() {
  return { customerId: "customer-1", productId: "product-1", sampleName: "Blue Dress Sample", sampleFee: 20, shippingCost: 8, currency: "USD" };
}

function makeSample(overrides: Partial<SampleRow> = {}): SampleRow {
  const now = new Date("2026-05-20T00:00:00.000Z");
  return {
    id: "sample-id",
    customerId: "customer-1",
    productId: "product-1",
    sampleName: "Blue Dress Sample",
    sampleFee: "20",
    shippingCost: "8",
    currency: "USD",
    paymentStatus: "unpaid",
    shippingStatus: "pending",
    trackingNumber: null,
    feedbackStatus: "pending",
    expectedShipDate: null,
    expectedDeliveryDate: null,
    notes: null,
    ownerId: "sales-1",
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function withRelations(sample: SampleRow, customers: CustomerRow[], products: ProductRow[]) {
  return {
    ...sample,
    customer: customers.find((customer) => customer.id === sample.customerId) || null,
    product: products.find((product) => product.id === sample.productId) || null
  };
}

function matchesWhere<T extends Record<string, any>>(item: T, where: Record<string, any>): boolean {
  return Object.entries(where).every(([key, expected]) => {
    if (expected === undefined) return true;
    if (key === "OR" && Array.isArray(expected)) return expected.some((candidate) => matchesWhere(item, candidate));
    if (expected && typeof expected === "object" && "in" in expected) return expected.in.includes(item[key]);
    if (expected && typeof expected === "object" && "contains" in expected) return String(item[key] || "").toLowerCase().includes(String(expected.contains).toLowerCase());
    if (expected && typeof expected === "object" && "name" in expected) return String((item as any).customer?.name || "").toLowerCase().includes(String(expected.name.contains).toLowerCase());
    return item[key] === expected;
  });
}
