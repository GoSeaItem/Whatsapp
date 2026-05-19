import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createFollowUpsRouter } from "./follow-ups-api.js";

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

type TestTask = {
  id: string;
  customerId: string;
  taskType: string;
  remindAt: Date;
  recommendedScript: string;
  status: string;
  ownerId: string;
  createdAt: Date;
  completedAt: Date | null;
};

function createTestApp(seed: { customers?: TestCustomer[]; tasks?: TestTask[] } = {}) {
  const customers = [...(seed.customers || [])];
  const tasks = [...(seed.tasks || [])];
  let nextTaskId = 1;

  const db = {
    customer: {
      async findFirst(args: { where: Record<string, any> }) {
        return customers.find((customer) => matchesCustomer(customer, tasks, args.where)) || null;
      },
      async findMany(args: { where: Record<string, any>; orderBy?: Record<string, string>; take?: number }) {
        return customers
          .filter((customer) => matchesCustomer(customer, tasks, args.where))
          .sort((left, right) => sortCustomers(left, right, args.orderBy))
          .slice(0, args.take || 100);
      }
    },
    followUpTask: {
      async findMany(args: { where: Record<string, any>; include?: { customer: boolean }; orderBy?: Record<string, string>; take?: number }) {
        return tasks
          .filter((task) => matchesTask(task, args.where))
          .sort((left, right) => left.remindAt.getTime() - right.remindAt.getTime())
          .slice(0, args.take || 100)
          .map((task) => withCustomer(task, customers));
      },
      async findFirst(args: { where: Record<string, any>; include?: { customer: boolean } }) {
        const task = tasks.find((item) => matchesTask(item, args.where));
        return task ? withCustomer(task, customers) : null;
      },
      async create(args: { data: Record<string, any>; include?: { customer: boolean } }) {
        const task: TestTask = {
          id: `task-${nextTaskId++}`,
          customerId: args.data.customerId,
          taskType: args.data.taskType,
          remindAt: args.data.remindAt,
          recommendedScript: args.data.recommendedScript,
          status: args.data.status,
          ownerId: args.data.ownerId,
          createdAt: new Date("2026-05-19T08:00:00.000Z"),
          completedAt: args.data.completedAt ?? null
        };
        tasks.push(task);
        return withCustomer(task, customers);
      },
      async update(args: { where: { id: string }; data: Record<string, any>; include?: { customer: boolean } }) {
        const index = tasks.findIndex((task) => task.id === args.where.id);
        if (index === -1) throw new Error("not found");
        tasks[index] = { ...tasks[index], ...args.data };
        return withCustomer(tasks[index], customers);
      },
      async deleteMany(args: { where: Record<string, any> }) {
        const before = tasks.length;
        for (let index = tasks.length - 1; index >= 0; index -= 1) {
          if (matchesTask(tasks[index], args.where)) tasks.splice(index, 1);
        }
        return { count: before - tasks.length };
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
  app.use("/api/follow-ups", createFollowUpsRouter(db as any));
  return { app, tasks };
}

describe("FollowUpTask CRUD API", () => {
  it("creates follow-up tasks for owned customers", async () => {
    const { app } = createTestApp(baseSeed());

    const response = await request(app).post("/api/follow-ups").set("x-user-id", "sales-1").send(validTask()).expect(201);

    expect(response.body).toMatchObject({
      id: "task-1",
      customerId: "customer-1",
      customerName: "Buyer A",
      taskType: "报价后跟进",
      status: "pending",
      ownerId: "sales-1"
    });
    expect(response.body.recommendedScript).toContain("quotation");
    expect(response.body.recommendedScript).not.toMatch(/automatic send|auto-send|sent to WhatsApp/i);
  });

  it("rejects create when customerId belongs to another user", async () => {
    const { app } = createTestApp(baseSeed());

    await request(app)
      .post("/api/follow-ups")
      .set("x-user-id", "sales-1")
      .send({ ...validTask(), customerId: "customer-2" })
      .expect(404);
  });

  it("lists only current user's tasks", async () => {
    const { app } = createTestApp({
      ...baseSeed(),
      tasks: [
        makeTask({ id: "task-1", ownerId: "sales-1", customerId: "customer-1" }),
        makeTask({ id: "task-2", ownerId: "sales-2", customerId: "customer-2" })
      ]
    });

    const response = await request(app).get("/api/follow-ups").set("x-user-id", "sales-1").expect(200);
    expect(response.body.map((task: { id: string }) => task.id)).toEqual(["task-1"]);
  });

  it("rejects cross-user detail, update, and delete access", async () => {
    const { app } = createTestApp({ ...baseSeed(), tasks: [makeTask({ id: "other-task", ownerId: "sales-2", customerId: "customer-2" })] });

    await request(app).get("/api/follow-ups/other-task").set("x-user-id", "sales-1").expect(404);
    await request(app).patch("/api/follow-ups/other-task").set("x-user-id", "sales-1").send({ taskType: "催付款" }).expect(404);
    await request(app).delete("/api/follow-ups/other-task").set("x-user-id", "sales-1").expect(404);
  });

  it("marks tasks completed and cancelled", async () => {
    const { app } = createTestApp({ ...baseSeed(), tasks: [makeTask({ id: "task-1" }), makeTask({ id: "task-2" })] });

    const completed = await request(app).post("/api/follow-ups/task-1/complete").set("x-user-id", "sales-1").expect(200);
    expect(completed.body.status).toBe("completed");
    expect(completed.body.completedAt).toBeTruthy();

    const cancelled = await request(app).post("/api/follow-ups/task-2/cancel").set("x-user-id", "sales-1").expect(200);
    expect(cancelled.body.status).toBe("cancelled");
  });

  it("returns today and overdue follow-ups correctly", async () => {
    const { app } = createTestApp({
      ...baseSeed(),
      tasks: [
        makeTask({ id: "today", remindAt: new Date("2026-05-19T10:00:00.000Z") }),
        makeTask({ id: "overdue", remindAt: new Date("2026-05-18T10:00:00.000Z") }),
        makeTask({ id: "future", remindAt: new Date("2026-05-20T10:00:00.000Z") })
      ]
    });

    const today = await request(app).get("/api/follow-ups?scope=today&now=2026-05-19T12:00:00.000Z").set("x-user-id", "sales-1").expect(200);
    expect(today.body.map((task: { id: string }) => task.id)).toEqual(["today"]);

    const overdue = await request(app).get("/api/follow-ups?scope=overdue&now=2026-05-19T12:00:00.000Z").set("x-user-id", "sales-1").expect(200);
    expect(overdue.body.map((task: { id: string }) => task.id)).toEqual(["overdue"]);

    const future = await request(app).get("/api/follow-ups?scope=future&now=2026-05-19T12:00:00.000Z").set("x-user-id", "sales-1").expect(200);
    expect(future.body.map((task: { id: string }) => task.id)).toEqual(["future"]);
  });

  it("supports quote follow-up creation after a quote is saved", async () => {
    const { app } = createTestApp(baseSeed());

    const response = await request(app)
      .post("/api/follow-ups")
      .set("x-user-id", "sales-1")
      .send({ ...validTask(), taskType: "报价后跟进", remindAt: "2026-05-20T08:00:00.000Z" })
      .expect(201);

    expect(response.body.taskType).toBe("报价后跟进");
    expect(response.body.recommendedScript).toContain("review the quotation");
    expect(response.body.recommendedScript).toContain("keep stock");
  });

  it("returns dashboard data isolated by current user", async () => {
    const { app } = createTestApp({
      customers: [
        makeCustomer({ id: "customer-1", ownerId: "sales-1", name: "Buyer A", stage: "已报价" }),
        makeCustomer({ id: "customer-3", ownerId: "sales-1", name: "Hot Buyer", tags: ["高意向"] }),
        makeCustomer({ id: "customer-2", ownerId: "sales-2", name: "Other Buyer", stage: "已报价", tags: ["高意向"] })
      ],
      tasks: [
        makeTask({ id: "today", ownerId: "sales-1", customerId: "customer-1", remindAt: new Date("2026-05-19T10:00:00.000Z") }),
        makeTask({ id: "overdue", ownerId: "sales-1", customerId: "customer-1", remindAt: new Date("2026-05-18T10:00:00.000Z") }),
        makeTask({ id: "other", ownerId: "sales-2", customerId: "customer-2", remindAt: new Date("2026-05-19T10:00:00.000Z") })
      ]
    });

    const response = await request(app).get("/api/follow-ups/dashboard?now=2026-05-19T12:00:00.000Z").set("x-user-id", "sales-1").expect(200);

    expect(response.body.today.map((task: { id: string }) => task.id)).toEqual(["today"]);
    expect(response.body.overdue.map((task: { id: string }) => task.id)).toEqual(["overdue"]);
    expect(response.body.quotedWithoutFollowUp.map((customer: { id: string }) => customer.id)).not.toContain("customer-2");
    expect(response.body.highIntent.map((customer: { id: string }) => customer.id)).toEqual(["customer-3"]);
    expect(response.body.recentCustomers.map((customer: { id: string }) => customer.id)).not.toContain("customer-2");
  });

  it("passes the Maria quote follow-up acceptance flow and blocks user B", async () => {
    const { app } = createTestApp({
      customers: [
        makeCustomer({
          id: "maria",
          ownerId: "user-a",
          name: "Maria",
          whatsappNumber: "+52 55 1000 2000",
          country: "Mexico",
          language: "English",
          tags: ["已报价"],
          stage: "已报价",
          interestedProduct: "Blue Dress"
        }),
        makeCustomer({ id: "user-b-customer", ownerId: "user-b", name: "User B Customer" })
      ]
    });

    const created = await request(app)
      .post("/api/follow-ups")
      .set("x-user-id", "user-a")
      .send({
        customerId: "maria",
        taskType: "报价后跟进",
        remindAt: "2026-05-20T10:00:00.000Z"
      })
      .expect(201);

    expect(created.body).toMatchObject({
      id: "task-1",
      customerId: "maria",
      customerName: "Maria",
      taskType: "报价后跟进",
      status: "pending",
      ownerId: "user-a"
    });
    expect(created.body.recommendedScript).toContain("review the quotation");
    expect(created.body.recommendedScript).toContain("keep stock");
    expect(created.body.recommendedScript).toContain("adjust the quantity");

    const beforeDue = await request(app)
      .get("/api/follow-ups/dashboard?now=2026-05-19T12:00:00.000Z")
      .set("x-user-id", "user-a")
      .expect(200);
    expect(beforeDue.body.today.map((task: { customerName: string }) => task.customerName)).not.toContain("Maria");
    expect(beforeDue.body.future.map((task: { customerName: string }) => task.customerName)).toContain("Maria");

    const dueDay = await request(app)
      .get("/api/follow-ups/dashboard?now=2026-05-20T12:00:00.000Z")
      .set("x-user-id", "user-a")
      .expect(200);
    expect(dueDay.body.today.map((task: { customerName: string }) => task.customerName)).toContain("Maria");

    const mariaTasks = await request(app).get("/api/follow-ups?customerId=maria").set("x-user-id", "user-a").expect(200);
    expect(mariaTasks.body).toHaveLength(1);
    expect(mariaTasks.body[0].recommendedScript).toContain("review the quotation");

    await request(app).get("/api/follow-ups").set("x-user-id", "user-b").expect(200).expect([]);
    await request(app).get("/api/follow-ups/task-1").set("x-user-id", "user-b").expect(404);
    await request(app).patch("/api/follow-ups/task-1").set("x-user-id", "user-b").send({ taskType: "催付款" }).expect(404);
    await request(app).delete("/api/follow-ups/task-1").set("x-user-id", "user-b").expect(404);

    const completed = await request(app).post("/api/follow-ups/task-1/complete").set("x-user-id", "user-a").expect(200);
    expect(completed.body.status).toBe("completed");

    const afterComplete = await request(app)
      .get("/api/follow-ups/dashboard?now=2026-05-20T12:00:00.000Z")
      .set("x-user-id", "user-a")
      .expect(200);
    expect(afterComplete.body.today.map((task: { customerName: string }) => task.customerName)).not.toContain("Maria");
    expect(afterComplete.body.future.map((task: { customerName: string }) => task.customerName)).not.toContain("Maria");
  });
});

function baseSeed() {
  return {
    customers: [makeCustomer({ id: "customer-1", ownerId: "sales-1" }), makeCustomer({ id: "customer-2", ownerId: "sales-2", name: "Buyer B" })]
  };
}

function validTask() {
  return {
    customerId: "customer-1",
    taskType: "报价后跟进",
    remindAt: "2026-05-20T08:00:00.000Z"
  };
}

function makeCustomer(overrides: Partial<TestCustomer>): TestCustomer {
  const now = new Date("2026-05-19T08:00:00.000Z");
  return {
    id: "customer-1",
    name: "Buyer A",
    whatsappNumber: "+521234567",
    country: "Mexico",
    language: "English",
    tags: ["新客户"],
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

function makeTask(overrides: Partial<TestTask>): TestTask {
  return {
    id: "task-1",
    customerId: "customer-1",
    taskType: "普通提醒",
    remindAt: new Date("2026-05-20T08:00:00.000Z"),
    recommendedScript: "Draft only. Please confirm details before sending.",
    status: "pending",
    ownerId: "sales-1",
    createdAt: new Date("2026-05-19T08:00:00.000Z"),
    completedAt: null,
    ...overrides
  };
}

function withCustomer(task: TestTask, customers: TestCustomer[]) {
  return { ...task, customer: customers.find((customer) => customer.id === task.customerId)! };
}

function matchesTask(task: TestTask, where: Record<string, any>) {
  if (where.id && task.id !== where.id) return false;
  if (where.ownerId && task.ownerId !== where.ownerId) return false;
  if (where.customerId && task.customerId !== where.customerId) return false;
  if (where.status && task.status !== where.status) return false;
  if (where.remindAt?.gte && task.remindAt < where.remindAt.gte) return false;
  if (where.remindAt?.lt && task.remindAt >= where.remindAt.lt) return false;
  return true;
}

function matchesCustomer(customer: TestCustomer, tasks: TestTask[], where: Record<string, any>) {
  if (where.id && customer.id !== where.id) return false;
  if (where.ownerId && customer.ownerId !== where.ownerId) return false;
  if (where.stage && customer.stage !== where.stage) return false;
  if (where.tags?.has && !customer.tags.includes(where.tags.has)) return false;
  if (where.followUps?.none) {
    const hasMatchingTask = tasks.some((task) => task.customerId === customer.id && task.status === where.followUps.none.status);
    if (hasMatchingTask) return false;
  }
  return true;
}

function sortCustomers(left: TestCustomer, right: TestCustomer, orderBy?: Record<string, string>) {
  if (orderBy?.createdAt === "desc") return right.createdAt.getTime() - left.createdAt.getTime();
  return right.updatedAt.getTime() - left.updatedAt.getTime();
}
