import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createCustomersRouter } from "./customers-api.js";

type TestCustomer = {
  id: string;
  name: string;
  whatsappNumber: string | null;
  email: string | null;
  socialLinks: string[];
  country: string | null;
  language: string | null;
  tags: string[];
  stage: string;
  interestedProduct: string | null;
  latestSummary: string | null;
  nextFollowUpAt: Date | null;
  ownerId: string;
  organizationId: string | null;
  assignedTo: string | null;
  collaborators: string[];
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function createTestApp(seed: TestCustomer[] = []) {
  const customers = [...seed];
  const members = [
    { organizationId: "org-a", userId: "owner", role: "owner", status: "active" },
    { organizationId: "org-a", userId: "manager", role: "manager", status: "active" },
    { organizationId: "org-a", userId: "sales-1", role: "sales", status: "active" },
    { organizationId: "org-a", userId: "sales-2", role: "sales", status: "active" },
    { organizationId: "org-a", userId: "support", role: "support", status: "active" },
    { organizationId: "org-b", userId: "other", role: "owner", status: "active" }
  ];
  const assignmentLogs: any[] = [];
  const duplicateLogs: any[] = [];
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
          email: args.data.email ?? null,
          socialLinks: args.data.socialLinks ?? [],
          country: args.data.country ?? null,
          language: args.data.language ?? "English",
          tags: args.data.tags ?? [],
          stage: args.data.stage ?? "new lead",
          interestedProduct: args.data.interestedProduct ?? null,
          latestSummary: args.data.latestSummary ?? null,
          nextFollowUpAt: args.data.nextFollowUpAt ?? null,
          ownerId: args.data.ownerId,
          organizationId: args.data.organizationId ?? null,
          assignedTo: args.data.assignedTo ?? null,
          collaborators: args.data.collaborators ?? [],
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
      async delete(args: { where: { id: string } }) {
        const index = customers.findIndex((customer) => customer.id === args.where.id);
        if (index === -1) throw new Error("not found");
        const [deleted] = customers.splice(index, 1);
        return deleted;
      },
      async deleteMany(args: { where: Record<string, any> }) {
        const before = customers.length;
        for (let index = customers.length - 1; index >= 0; index -= 1) {
          if (matchesWhere(customers[index], args.where)) customers.splice(index, 1);
        }
        return { count: before - customers.length };
      }
    },
    organizationMember: {
      async findFirst(args: { where: Record<string, any> }) {
        return members.find((member) => matchesRecord(member, args.where)) || null;
      }
    },
    customerAssignmentLog: {
      async create(args: { data: Record<string, any> }) {
        const log = { id: `log-${nextId++}`, createdAt: new Date("2026-05-18T10:00:00.000Z"), ...args.data };
        assignmentLogs.push(log);
        return log;
      },
      async findMany(args: { where: Record<string, any> }) {
        return assignmentLogs.filter((log) => matchesRecord(log, args.where));
      }
    },
    customerDuplicateEventLog: {
      async create(args: { data: Record<string, any> }) {
        const log = { id: `duplicate-${nextId++}`, createdAt: new Date("2026-05-18T11:00:00.000Z"), ...args.data };
        duplicateLogs.push(log);
        return log;
      },
      async findMany(args: { where: Record<string, any> }) {
        return duplicateLogs.filter((log) => matchesRecord(log, args.where));
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
  return { app, customers, duplicateLogs };
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
        tags: ["new customer", "needs follow up"],
        notes: "Needs quote",
        ownerId: "attacker-owner"
      })
      .expect(201);

    expect(response.body).toMatchObject({
      name: "Mexico Buyer",
      ownerId: "sales-1",
      whatsappNumber: "+52 55 0000 0000",
      tags: ["new customer", "needs follow up"]
    });
  });

  it("lists only the current user's customers and supports tag/stage filters", async () => {
    const { app } = createTestApp([
      makeCustomer({ id: "c1", ownerId: "sales-1", name: "A", tags: ["hot"], stage: "quoted" }),
      makeCustomer({ id: "c2", ownerId: "sales-1", name: "B", tags: ["new"], stage: "new lead" }),
      makeCustomer({ id: "c3", ownerId: "sales-2", name: "C", tags: ["hot"], stage: "quoted" })
    ]);

    const response = await request(app)
      .get("/api/customers?tag=hot&stage=quoted")
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

    await request(app).delete("/api/customers/c1?confirm=true").set("x-user-id", "sales-1").expect(204);
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

  it("creates organization customers with owner, organization, assignment and duplicate protection", async () => {
    const { app } = createTestApp();

    const response = await request(app)
      .post("/api/customers")
      .set("x-user-id", "manager")
      .send({ name: "Team Buyer", organizationId: "org-a", assignedTo: "sales-1", collaborators: ["support"], whatsappNumber: "+52 100", email: "buyer@example.com", socialLinks: ["https://instagram.com/maria"] })
      .expect(201);

    expect(response.body).toMatchObject({
      ownerId: "manager",
      organizationId: "org-a",
      assignedTo: "sales-1",
      collaborators: ["support"]
    });

    await request(app)
      .post("/api/customers")
      .set("x-user-id", "manager")
      .send({ name: "Dup", organizationId: "org-a", whatsappNumber: "+52 100" })
      .expect(409);
    await request(app)
      .post("/api/customers")
      .set("x-user-id", "manager")
      .send({ name: "Dup social", organizationId: "org-a", socialLinks: ["https://instagram.com/maria"] })
      .expect(409);
    await request(app)
      .post("/api/customers")
      .set("x-user-id", "other")
      .send({ name: "Cross org allowed", organizationId: "org-b", whatsappNumber: "+52 100", socialLinks: ["https://instagram.com/maria"] })
      .expect(201);
    await request(app)
      .post("/api/customers")
      .set("x-user-id", "manager")
      .send({ name: "Bad assign", organizationId: "org-a", assignedTo: "other" })
      .expect(400);
    await request(app)
      .post("/api/customers")
      .set("x-user-id", "support")
      .send({ name: "Support create", organizationId: "org-a" })
      .expect(403);
  });

  it("checks duplicates before submit and logs duplicate handling events", async () => {
    const { app, duplicateLogs } = createTestApp([
      makeCustomer({ id: "existing", ownerId: "manager", organizationId: "org-a", assignedTo: "sales-1", name: "Existing", whatsappNumber: "+52 200", email: "dup@example.com", socialLinks: ["https://facebook.com/dup"] })
    ]);

    const check = await request(app)
      .post("/api/customers/check-duplicate")
      .set("x-user-id", "manager")
      .send({ organizationId: "org-a", socialLinks: ["https://facebook.com/dup"] })
      .expect(200);

    expect(check.body).toMatchObject({
      hasDuplicate: true,
      matches: [{ customerId: "existing", assignedTo: "sales-1", matchedFields: ["socialLinks"] }]
    });

    const create = await request(app)
      .post("/api/customers")
      .set("x-user-id", "manager")
      .send({ name: "Blocked", organizationId: "org-a", email: "dup@example.com" })
      .expect(409);

    expect(create.body).toMatchObject({ customerId: "existing", assignedTo: "sales-1" });
    expect(duplicateLogs.map((log) => log.source)).toEqual(expect.arrayContaining(["api-check", "api-create"]));
  });

  it("limits organization customer visibility and keeps collaborators read-only", async () => {
    const { app } = createTestApp([
      makeCustomer({ id: "team-owner", ownerId: "manager", organizationId: "org-a", assignedTo: "sales-1", name: "Assigned" }),
      makeCustomer({ id: "team-collab", ownerId: "manager", organizationId: "org-a", collaborators: ["support"], name: "Collaborative" }),
      makeCustomer({ id: "team-support-assigned", ownerId: "manager", organizationId: "org-a", assignedTo: "support", name: "Support assigned" }),
      makeCustomer({ id: "team-hidden", ownerId: "manager", organizationId: "org-a", assignedTo: "sales-2", name: "Hidden" }),
      makeCustomer({ id: "other-org", ownerId: "other", organizationId: "org-b", name: "Other org" })
    ]);

    expect((await request(app).get("/api/customers?organizationId=org-a").set("x-user-id", "sales-1").expect(200)).body.map((item: any) => item.id)).toEqual(["team-owner"]);
    expect((await request(app).get("/api/customers?organizationId=org-a").set("x-user-id", "support").expect(200)).body.map((item: any) => item.id)).toEqual(["team-collab", "team-support-assigned"]);
    await request(app).patch("/api/customers/team-collab").set("x-user-id", "support").send({ name: "No" }).expect(403);
    await request(app).patch("/api/customers/team-support-assigned").set("x-user-id", "support").send({ name: "No" }).expect(403);
    await request(app).patch("/api/customers/team-hidden").set("x-user-id", "manager").send({ name: "Manager update" }).expect(200);
    await request(app).get("/api/customers/other-org").set("x-user-id", "sales-1").expect(404);
  });

  it("lets owner or manager assign customers and records assignment logs", async () => {
    const { app } = createTestApp([
      makeCustomer({ id: "assign-me", ownerId: "manager", organizationId: "org-a", assignedTo: "sales-1", name: "Assign me" })
    ]);

    await request(app).post("/api/customers/assign-me/assign").set("x-user-id", "sales-1").send({ assignedTo: "sales-2" }).expect(403);
    const response = await request(app).post("/api/customers/assign-me/assign").set("x-user-id", "manager").send({ assignedTo: "sales-2", note: "handoff" }).expect(200);
    expect(response.body).toMatchObject({ id: "assign-me", assignedTo: "sales-2" });
    expect(response.body.assignmentLogs[0]).toMatchObject({ fromUserId: "sales-1", toUserId: "sales-2", operatedBy: "manager" });
  });
});

function makeCustomer(overrides: Partial<TestCustomer>): TestCustomer {
  const now = new Date("2026-05-18T08:00:00.000Z");
  return {
    id: "customer-id",
    name: "Customer",
    whatsappNumber: null,
    email: null,
    socialLinks: [],
    country: null,
    language: "English",
    tags: [],
    stage: "new lead",
    interestedProduct: null,
    latestSummary: null,
    nextFollowUpAt: null,
    ownerId: "sales-1",
    organizationId: null,
    assignedTo: null,
    collaborators: [],
    notes: null,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function matchesWhere(customer: TestCustomer, where: Record<string, any>) {
  if (where.NOT?.id && customer.id === where.NOT.id) return false;
  if (where.ownerId && customer.ownerId !== where.ownerId) return false;
  if (where.id && customer.id !== where.id) return false;
  if (where.organizationId && customer.organizationId !== where.organizationId) return false;
  if (where.stage && customer.stage !== where.stage) return false;
  if (where.tags?.has && !customer.tags.includes(where.tags.has)) return false;
  if (where.OR) {
    return where.OR.some((condition: Record<string, any>) => {
      if (condition.collaborators?.has) return customer.collaborators.includes(condition.collaborators.has);
      if (condition.socialLinks?.hasSome) return condition.socialLinks.hasSome.some((link: string) => customer.socialLinks.includes(link));
      return Object.entries(condition).some(([field, matcher]) => {
        if (matcher && typeof matcher === "object" && "contains" in matcher) return String(customer[field as keyof TestCustomer] || "").toLowerCase().includes(matcher.contains.toLowerCase());
        return customer[field as keyof TestCustomer] === matcher;
      });
    });
  }
  return true;
}

function matchesRecord(record: Record<string, any>, where: Record<string, any>) {
  return Object.entries(where).every(([key, value]) => record[key] === value);
}
