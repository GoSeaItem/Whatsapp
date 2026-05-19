import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createCustomersRouter } from "./customers-api.js";

type TestCustomer = {
  id: string;
  name: string;
  whatsappNumber: string | null;
  country: string | null;
  language: string | null;
  tags: string[];
  stage: string;
  interestedProduct: string | null;
  latestSummary: string | null;
  nextFollowUpAt: Date | null;
  ownerId: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function createTestApp(seed: TestCustomer[] = []) {
  const customers = [...seed];
  let nextId = 1;

  const db = {
    customer: {
      async findMany(args: { where: Record<string, any> }) {
        return customers.filter((customer) => matchesWhere(customer, args.where));
      },
      async findUnique(args: { where: { id: string } }) {
        return customers.find((customer) => customer.id === args.where.id) || null;
      },
      async findFirst(args: { where: Record<string, any> }) {
        return customers.find((customer) => matchesWhere(customer, args.where)) || null;
      },
      async create(args: { data: Record<string, any> }) {
        const now = new Date("2026-05-18T08:00:00.000Z");
        const customer: TestCustomer = {
          id: `customer-${nextId++}`,
          name: args.data.name,
          whatsappNumber: args.data.whatsappNumber ?? null,
          country: args.data.country ?? null,
          language: args.data.language ?? "English",
          tags: args.data.tags ?? [],
          stage: args.data.stage ?? "新线索",
          interestedProduct: args.data.interestedProduct ?? null,
          latestSummary: args.data.latestSummary ?? null,
          nextFollowUpAt: args.data.nextFollowUpAt ?? null,
          ownerId: args.data.ownerId,
          notes: args.data.notes ?? null,
          createdAt: now,
          updatedAt: now
        };
        customers.push(customer);
        return customer;
      },
      async update(args: { where: { id: string }; data: Record<string, any> }) {
        const index = customers.findIndex((customer) => customer.id === args.where.id);
        if (index === -1) throw new Error("not found");
        customers[index] = { ...customers[index], ...args.data, updatedAt: new Date("2026-05-18T09:00:00.000Z") };
        return customers[index];
      },
      async deleteMany(args: { where: Record<string, any> }) {
        const before = customers.length;
        for (let index = customers.length - 1; index >= 0; index -= 1) {
          if (matchesWhere(customers[index], args.where)) customers.splice(index, 1);
        }
        return { count: before - customers.length };
      }
    }
  };

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const userId = req.header("x-user-id") || "user-a";
    req.user = { id: userId, email: `${userId}@example.com`, name: userId };
    next();
  });
  app.use("/api/customers", createCustomersRouter(db as any));
  return { app, customers };
}

describe("Customer CRUD API", () => {
  it("creates customers with the current user's ownerId", async () => {
    const { app } = createTestApp();

    const response = await request(app)
      .post("/api/customers")
      .set("x-user-id", "sales-1")
      .send({
        name: "Mexico Buyer",
        whatsappNumber: "+52 55 0000 0000",
        country: "Mexico",
        language: "English",
        tags: ["新客户", "需要跟进"],
        notes: "Needs quote",
        ownerId: "attacker-owner"
      })
      .expect(201);

    expect(response.body).toMatchObject({
      name: "Mexico Buyer",
      ownerId: "sales-1",
      whatsappNumber: "+52 55 0000 0000",
      tags: ["新客户", "需要跟进"]
    });
  });

  it("lists only the current user's customers and supports tag/stage filters", async () => {
    const { app } = createTestApp([
      makeCustomer({ id: "c1", ownerId: "sales-1", name: "A", tags: ["高意向"], stage: "已报价" }),
      makeCustomer({ id: "c2", ownerId: "sales-1", name: "B", tags: ["新客户"], stage: "新线索" }),
      makeCustomer({ id: "c3", ownerId: "sales-2", name: "C", tags: ["高意向"], stage: "已报价" })
    ]);

    const response = await request(app)
      .get("/api/customers?tag=高意向&stage=已报价")
      .set("x-user-id", "sales-1")
      .expect(200);

    expect(response.body.map((customer: { id: string }) => customer.id)).toEqual(["c1"]);
  });

  it("gets, updates, and deletes the current user's customer", async () => {
    const { app } = createTestApp([makeCustomer({ id: "c1", ownerId: "sales-1", name: "Before" })]);

    await request(app).get("/api/customers/c1").set("x-user-id", "sales-1").expect(200);

    const updateResponse = await request(app)
      .patch("/api/customers/c1")
      .set("x-user-id", "sales-1")
      .send({ name: "After", latestSummary: "Updated from CRM" })
      .expect(200);

    expect(updateResponse.body).toMatchObject({ id: "c1", name: "After", latestSummary: "Updated from CRM" });

    await request(app).delete("/api/customers/c1").set("x-user-id", "sales-1").expect(204);
    await request(app).get("/api/customers/c1").set("x-user-id", "sales-1").expect(404);
  });

  it("rejects cross-user detail, update, and delete access", async () => {
    const { app } = createTestApp([makeCustomer({ id: "other-customer", ownerId: "sales-2", name: "Other" })]);

    await request(app).get("/api/customers/other-customer").set("x-user-id", "sales-1").expect(404);
    await request(app)
      .patch("/api/customers/other-customer")
      .set("x-user-id", "sales-1")
      .send({ name: "Hacked" })
      .expect(404);
    await request(app).delete("/api/customers/other-customer").set("x-user-id", "sales-1").expect(404);

    const ownerResponse = await request(app).get("/api/customers/other-customer").set("x-user-id", "sales-2").expect(200);
    expect(ownerResponse.body.name).toBe("Other");
  });

  it("returns clear validation errors for invalid customer forms", async () => {
    const { app } = createTestApp();

    const response = await request(app).post("/api/customers").set("x-user-id", "sales-1").send({ name: "" }).expect(400);

    expect(response.body.errors).toContainEqual({ field: "name", message: "客户名称不能为空" });
  });
});

function makeCustomer(overrides: Partial<TestCustomer>): TestCustomer {
  const now = new Date("2026-05-18T08:00:00.000Z");
  return {
    id: "customer-id",
    name: "Customer",
    whatsappNumber: null,
    country: null,
    language: "English",
    tags: [],
    stage: "新线索",
    interestedProduct: null,
    latestSummary: null,
    nextFollowUpAt: null,
    ownerId: "sales-1",
    notes: null,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function matchesWhere(customer: TestCustomer, where: Record<string, any>) {
  if (where.ownerId && customer.ownerId !== where.ownerId) return false;
  if (where.id && customer.id !== where.id) return false;
  if (where.stage && customer.stage !== where.stage) return false;
  if (where.tags?.has && !customer.tags.includes(where.tags.has)) return false;
  if (where.OR) {
    return where.OR.some((condition: Record<string, { contains: string }>) =>
      Object.entries(condition).some(([field, matcher]) =>
        String(customer[field as keyof TestCustomer] || "").toLowerCase().includes(matcher.contains.toLowerCase())
      )
    );
  }
  return true;
}
