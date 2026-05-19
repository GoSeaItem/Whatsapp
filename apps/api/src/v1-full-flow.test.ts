import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { DEFAULT_CUSTOMER_STAGES, DEFAULT_CUSTOMER_TAGS, type AiReplyRequest } from "@wa-ai/shared";
import { createRequireAuth, hashPassword } from "./auth.js";
import { createAuthRouter } from "./auth-api.js";
import { generateAiReply } from "./ai-reply.js";
import { createCustomersRouter } from "./customers-api.js";
import { createProductsRouter } from "./products-api.js";
import { createQuotesRouter } from "./quotes-api.js";
import { createFollowUpsRouter } from "./follow-ups-api.js";
import { FOLLOW_UP_TASK_TYPES } from "./follow-up-utils.js";

type UserRow = { id: string; email: string; name: string; passwordHash: string };
type SessionRow = { id: string; userId: string; tokenHash: string; expiresAt: Date };
type CustomerRow = {
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
type ProductRow = {
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
type QuoteRow = {
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
type FollowUpRow = {
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

describe("V1 full chain acceptance flow", () => {
  it("runs login, draft generation, customer, product, quote, follow-up, dashboard, completion, and user isolation", async () => {
    const { app } = createV1TestApp();
    const userA = request.agent(app);
    const userB = request.agent(app);

    await userA.post("/api/auth/login").send({ email: "a@example.com", password: "TestPassword123!" }).expect(200);
    const me = await userA.get("/api/auth/me").expect(200);
    expect(me.body.user).toMatchObject({ id: "user-a", email: "a@example.com", name: "User A" });

    const aiReply = await userA
      .post("/api/ai/reply")
      .send({ customerMessage: "How much for 100 pcs?", targetLanguage: "English" } satisfies AiReplyRequest)
      .expect(200);
    expect(aiReply.body).toHaveProperty("translationZh");
    expect(aiReply.body).toHaveProperty("shortReply");
    expect(aiReply.body.riskWarnings.join("\n")).toContain("WhatsApp");

    const customer = await userA
      .post("/api/customers")
      .send({
        name: "Maria",
        whatsappNumber: "+52 55 1000 2000",
        country: "Mexico",
        language: "English",
        tags: [DEFAULT_CUSTOMER_TAGS[1], DEFAULT_CUSTOMER_TAGS[2]],
        stage: DEFAULT_CUSTOMER_STAGES[3],
        interestedProduct: "Blue Dress",
        notes: "Asked for a quote on Blue Dress"
      })
      .expect(201);
    expect(customer.body).toMatchObject({ name: "Maria", ownerId: "user-a", stage: DEFAULT_CUSTOMER_STAGES[3] });

    const updatedCustomer = await userA
      .patch(`/api/customers/${customer.body.id}`)
      .send({ tags: [DEFAULT_CUSTOMER_TAGS[1], DEFAULT_CUSTOMER_TAGS[8]], stage: DEFAULT_CUSTOMER_STAGES[3] })
      .expect(200);
    expect(updatedCustomer.body.tags).toEqual([DEFAULT_CUSTOMER_TAGS[1], DEFAULT_CUSTOMER_TAGS[8]]);

    const product = await userA
      .post("/api/products")
      .send({
        name: "Blue Dress",
        sku: "BD-100",
        category: "Women Fashion",
        colors: ["Blue"],
        sizes: ["S", "M", "L"],
        moq: 100,
        suggestedPrice: 12.5,
        minPrice: 10.5,
        leadTime: "7-10 days",
        sellingPoints: ["soft fabric", "summer style", "retail-ready packaging"],
        introEn: "Blue Dress is a soft summer dress for retail orders. Please confirm stock before sending."
      })
      .expect(201);
    expect(product.body).toMatchObject({ name: "Blue Dress", ownerId: "user-a" });

    const intro = await userA.post(`/api/products/${product.body.id}/intro`).send({ targetLanguage: "English" }).expect(200);
    expect(intro.body.intro).toContain("Blue Dress");
    expect(intro.body.riskWarnings.join("\n")).toMatch(/库存|stock/i);

    const quote = await userA
      .post("/api/quotes")
      .send({
        customerId: customer.body.id,
        productId: product.body.id,
        quantity: 100,
        unitPrice: 12.5,
        currency: "USD",
        shippingCost: 35,
        moq: 100,
        leadTime: "7-10 days",
        includeShipping: false,
        targetLanguage: "English",
        tiers: [
          { quantity: 50, unitPrice: 13.5 },
          { quantity: 100, unitPrice: 12.5 },
          { quantity: 300, unitPrice: 11.2 }
        ],
        stockKnown: false,
        promiseStock: false,
        attachmentSelected: false
      })
      .expect(201);
    expect(quote.body).toMatchObject({ customerId: customer.body.id, productId: product.body.id, createdBy: "user-a" });
    expect(quote.body.riskWarnings.join("\n")).toMatch(/库存|stock|草稿|draft/i);

    const quoteHistory = await userA.get(`/api/quotes/customer/${customer.body.id}`).expect(200);
    expect(quoteHistory.body.map((item: { id: string }) => item.id)).toEqual([quote.body.id]);

    const followUp = await userA
      .post("/api/follow-ups")
      .send({
        customerId: customer.body.id,
        taskType: FOLLOW_UP_TASK_TYPES[0],
        remindAt: "2026-05-20T10:00:00.000Z"
      })
      .expect(201);
    expect(followUp.body).toMatchObject({ customerName: "Maria", taskType: FOLLOW_UP_TASK_TYPES[0], ownerId: "user-a" });
    expect(followUp.body.recommendedScript).toContain("review the quotation");

    const beforeDue = await userA.get("/api/follow-ups/dashboard?now=2026-05-19T12:00:00.000Z").expect(200);
    expect(beforeDue.body.future.map((task: { customerName: string }) => task.customerName)).toContain("Maria");
    expect(beforeDue.body.today.map((task: { customerName: string }) => task.customerName)).not.toContain("Maria");

    const dueDay = await userA.get("/api/follow-ups/dashboard?now=2026-05-20T12:00:00.000Z").expect(200);
    expect(dueDay.body.today.map((task: { customerName: string }) => task.customerName)).toContain("Maria");

    const mariaTasks = await userA.get(`/api/follow-ups?customerId=${customer.body.id}`).expect(200);
    expect(mariaTasks.body[0].recommendedScript).toContain("keep stock");

    await userB.post("/api/auth/login").send({ email: "b@example.com", password: "TestPassword123!" }).expect(200);
    await userB.get("/api/customers").expect(200, []);
    await userB.get("/api/products").expect(200, []);
    await userB.get("/api/quotes").expect(200, []);
    await userB.get("/api/follow-ups").expect(200, []);
    await userB.get(`/api/customers/${customer.body.id}`).expect(404);
    await userB.get(`/api/products/${product.body.id}`).expect(404);
    await userB.get(`/api/quotes/${quote.body.id}`).expect(404);
    await userB.get(`/api/follow-ups/${followUp.body.id}`).expect(404);
    await userB.patch(`/api/follow-ups/${followUp.body.id}`).send({ taskType: FOLLOW_UP_TASK_TYPES[1] }).expect(404);
    await userB.delete(`/api/follow-ups/${followUp.body.id}`).expect(404);

    const completed = await userA.post(`/api/follow-ups/${followUp.body.id}/complete`).expect(200);
    expect(completed.body.status).toBe("completed");

    const afterComplete = await userA.get("/api/follow-ups/dashboard?now=2026-05-20T12:00:00.000Z").expect(200);
    expect(afterComplete.body.today.map((task: { customerName: string }) => task.customerName)).not.toContain("Maria");
  });
});

function createV1TestApp() {
  const now = new Date("2026-05-19T08:00:00.000Z");
  const users: UserRow[] = [
    { id: "user-a", email: "a@example.com", name: "User A", passwordHash: hashPassword("TestPassword123!") },
    { id: "user-b", email: "b@example.com", name: "User B", passwordHash: hashPassword("TestPassword123!") }
  ];
  const sessions: SessionRow[] = [];
  const customers: CustomerRow[] = [];
  const products: ProductRow[] = [];
  const quotes: QuoteRow[] = [];
  const followUps: FollowUpRow[] = [];
  let customerSeq = 1;
  let productSeq = 1;
  let quoteSeq = 1;
  let followUpSeq = 1;
  let sessionSeq = 1;

  const db = {
    user: {
      async create(args: { data: Record<string, any>; select?: Record<string, boolean> }) {
        const user = { id: `user-${users.length + 1}`, email: args.data.email, name: args.data.name, passwordHash: args.data.passwordHash };
        users.push(user);
        return selectUser(user, args.select);
      },
      async findUnique(args: { where: { email?: string; id?: string }; select?: Record<string, boolean> }) {
        const user = users.find((item) => item.email === args.where.email || item.id === args.where.id);
        return user ? selectUser(user, args.select) : null;
      }
    },
    authSession: {
      async create(args: { data: Record<string, any> }) {
        const session = {
          id: `session-${sessionSeq++}`,
          userId: args.data.userId,
          tokenHash: args.data.tokenHash,
          expiresAt: args.data.expiresAt
        };
        sessions.push(session);
        return session;
      },
      async findUnique(args: { where: { tokenHash: string }; include?: { user: boolean } }) {
        const session = sessions.find((item) => item.tokenHash === args.where.tokenHash);
        if (!session) return null;
        const user = users.find((item) => item.id === session.userId)!;
        return { ...session, user: { id: user.id, email: user.email, name: user.name } };
      },
      async deleteMany(args: { where: { tokenHash: string } }) {
        const before = sessions.length;
        for (let index = sessions.length - 1; index >= 0; index -= 1) {
          if (sessions[index].tokenHash === args.where.tokenHash) sessions.splice(index, 1);
        }
        return { count: before - sessions.length };
      }
    },
    customer: {
      async findMany(args: { where: Record<string, any>; orderBy?: any; take?: number }) {
        return customers.filter((item) => matchesCustomer(item, followUps, args.where)).slice(0, args.take || 100);
      },
      async findFirst(args: { where: Record<string, any> }) {
        return customers.find((item) => matchesCustomer(item, followUps, args.where)) || null;
      },
      async create(args: { data: Record<string, any> }) {
        const customer: CustomerRow = {
          id: `customer-${customerSeq++}`,
          name: args.data.name,
          whatsappNumber: args.data.whatsappNumber ?? null,
          country: args.data.country ?? null,
          language: args.data.language ?? "English",
          tags: args.data.tags ?? [],
          stage: args.data.stage ?? DEFAULT_CUSTOMER_STAGES[0],
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
        const index = customers.findIndex((item) => item.id === args.where.id);
        customers[index] = { ...customers[index], ...args.data, updatedAt: now };
        return customers[index];
      },
      async deleteMany(args: { where: Record<string, any> }) {
        return deleteMany(customers, (item) => matchesCustomer(item, followUps, args.where));
      }
    },
    product: {
      async findMany(args: { where: Record<string, any>; take?: number }) {
        return products.filter((item) => matchesProduct(item, args.where)).slice(0, args.take || 100);
      },
      async findFirst(args: { where: Record<string, any> }) {
        return products.find((item) => matchesProduct(item, args.where)) || null;
      },
      async create(args: { data: Record<string, any> }) {
        const product: ProductRow = {
          id: `product-${productSeq++}`,
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
        const index = products.findIndex((item) => item.id === args.where.id);
        products[index] = { ...products[index], ...args.data, updatedAt: now };
        return products[index];
      },
      async deleteMany(args: { where: Record<string, any> }) {
        return deleteMany(products, (item) => matchesProduct(item, args.where));
      }
    },
    quote: {
      async findMany(args: { where: Record<string, any> }) {
        return quotes.filter((item) => matchesQuote(item, args.where)).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      },
      async findFirst(args: { where: Record<string, any> }) {
        return quotes.find((item) => matchesQuote(item, args.where)) || null;
      },
      async create(args: { data: Record<string, any> }) {
        const quote: QuoteRow = {
          id: `quote-${quoteSeq++}`,
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
          createdAt: now
        };
        quotes.push(quote);
        return quote;
      },
      async update(args: { where: { id: string }; data: Record<string, any> }) {
        const index = quotes.findIndex((item) => item.id === args.where.id);
        quotes[index] = { ...quotes[index], ...args.data };
        return quotes[index];
      },
      async deleteMany(args: { where: Record<string, any> }) {
        return deleteMany(quotes, (item) => matchesQuote(item, args.where));
      }
    },
    followUpTask: {
      async findMany(args: { where: Record<string, any>; take?: number }) {
        return followUps
          .filter((item) => matchesFollowUp(item, args.where))
          .sort((a, b) => a.remindAt.getTime() - b.remindAt.getTime())
          .slice(0, args.take || 100)
          .map((item) => withCustomer(item, customers));
      },
      async findFirst(args: { where: Record<string, any> }) {
        const task = followUps.find((item) => matchesFollowUp(item, args.where));
        return task ? withCustomer(task, customers) : null;
      },
      async create(args: { data: Record<string, any> }) {
        const task: FollowUpRow = {
          id: `task-${followUpSeq++}`,
          customerId: args.data.customerId,
          taskType: args.data.taskType,
          remindAt: args.data.remindAt,
          recommendedScript: args.data.recommendedScript,
          status: args.data.status,
          ownerId: args.data.ownerId,
          createdAt: now,
          completedAt: args.data.completedAt ?? null
        };
        followUps.push(task);
        return withCustomer(task, customers);
      },
      async update(args: { where: { id: string }; data: Record<string, any> }) {
        const index = followUps.findIndex((item) => item.id === args.where.id);
        followUps[index] = { ...followUps[index], ...args.data };
        return withCustomer(followUps[index], customers);
      },
      async deleteMany(args: { where: Record<string, any> }) {
        return deleteMany(followUps, (item) => matchesFollowUp(item, args.where));
      }
    }
  };

  const app = express();
  app.use(express.json());
  const requireAuth = createRequireAuth(db as any);
  app.use("/api/auth", createAuthRouter(db as any));
  app.post("/api/ai/reply", (req, res) => res.json(generateAiReply(req.body)));
  app.use("/api/customers", requireAuth, createCustomersRouter(db as any));
  app.use("/api/products", requireAuth, createProductsRouter(db as any));
  app.use("/api/quotes", requireAuth, createQuotesRouter(db as any));
  app.use("/api/follow-ups", requireAuth, createFollowUpsRouter(db as any));
  return { app };
}

function selectUser(user: UserRow, select?: Record<string, boolean>) {
  if (!select) return user;
  return Object.fromEntries(Object.entries(user).filter(([key]) => select[key]));
}

function deleteMany<T>(items: T[], predicate: (item: T) => boolean) {
  const before = items.length;
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (predicate(items[index])) items.splice(index, 1);
  }
  return { count: before - items.length };
}

function withCustomer(task: FollowUpRow, customers: CustomerRow[]) {
  return { ...task, customer: customers.find((item) => item.id === task.customerId)! };
}

function matchesCustomer(customer: CustomerRow, tasks: FollowUpRow[], where: Record<string, any>) {
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

function matchesProduct(product: ProductRow, where: Record<string, any>) {
  if (where.id && product.id !== where.id) return false;
  if (where.ownerId && product.ownerId !== where.ownerId) return false;
  if (where.category?.equals && product.category?.toLowerCase() !== where.category.equals.toLowerCase()) return false;
  return true;
}

function matchesQuote(quote: QuoteRow, where: Record<string, any>) {
  if (where.id && quote.id !== where.id) return false;
  if (where.ownerId && quote.ownerId !== where.ownerId) return false;
  if (where.createdBy && quote.createdBy !== where.createdBy) return false;
  if (where.customerId && quote.customerId !== where.customerId) return false;
  return true;
}

function matchesFollowUp(task: FollowUpRow, where: Record<string, any>) {
  if (where.id && task.id !== where.id) return false;
  if (where.ownerId && task.ownerId !== where.ownerId) return false;
  if (where.customerId && task.customerId !== where.customerId) return false;
  if (where.status && task.status !== where.status) return false;
  if (where.remindAt?.gte && task.remindAt < where.remindAt.gte) return false;
  if (where.remindAt?.lt && task.remindAt >= where.remindAt.lt) return false;
  return true;
}

