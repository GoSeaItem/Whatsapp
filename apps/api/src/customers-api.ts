import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "./db.js";
import { calculateCustomerIntent, type IntentCustomer, type IntentCustomRequest, type IntentFollowUpTask, type IntentQuote, type IntentSampleOrder } from "./customer-intent-rules.js";
import {
  serializeCustomer,
  toCustomerCreateData,
  toCustomerUpdateData,
  validateCustomerPayload
} from "./customer-utils.js";

type CustomerDb = Pick<typeof prisma, "customer"> & Partial<Pick<typeof prisma, "quote" | "followUpTask" | "sampleOrder" | "customRequest">>;

export function createCustomersRouter(db: CustomerDb = prisma) {
  const customersRouter = Router();

customersRouter.get("/", async (req, res, next) => {
  try {
    const tag = cleanQuery(req.query.tag);
    const stage = cleanQuery(req.query.stage);
    const q = cleanQuery(req.query.q);
    const sort = cleanQuery(req.query.sort);
    const intentLevel = cleanQuery(req.query.intentLevel);
    const where: Prisma.CustomerWhereInput = { ownerId: req.user!.id };

    if (tag) where.tags = { has: tag };
    if (stage) where.stage = stage;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { whatsappNumber: { contains: q, mode: "insensitive" } },
        { country: { contains: q, mode: "insensitive" } },
        { interestedProduct: { contains: q, mode: "insensitive" } },
        { latestSummary: { contains: q, mode: "insensitive" } }
      ];
    }

    const customers = await db.customer.findMany({
      where,
      orderBy: [{ nextFollowUpAt: "asc" }, { updatedAt: "desc" }],
      take: 100
    });

    const related = await findRelatedIntentData(db, req.user!.id, customers.map((customer) => customer.id));
    let response = customers.map((customer) => serializeCustomerWithIntent(customer, related));
    if (intentLevel) response = response.filter((customer) => customer.intentLevel === intentLevel);
    if (sort === "intentScore") {
      response = response.sort((left, right) => (right.intentScore || 0) - (left.intentScore || 0));
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
});

customersRouter.get("/:id/intent", async (req, res, next) => {
  try {
    const customer = await db.customer.findFirst({
      where: { id: req.params.id, ownerId: req.user!.id }
    });

    if (!customer) {
      res.status(404).json({ message: "customer not found" });
      return;
    }

    const related = await findRelatedIntentData(db, req.user!.id, [customer.id]);
    res.json(calculateCustomerIntent(customer, relatedForCustomer(related, customer.id)));
  } catch (error) {
    next(error);
  }
});

customersRouter.post("/:id/recalculate-intent", async (req, res, next) => {
  try {
    const customer = await db.customer.findFirst({
      where: { id: req.params.id, ownerId: req.user!.id }
    });

    if (!customer) {
      res.status(404).json({ message: "customer not found" });
      return;
    }

    const related = await findRelatedIntentData(db, req.user!.id, [customer.id]);
    res.json(calculateCustomerIntent(customer, relatedForCustomer(related, customer.id)));
  } catch (error) {
    next(error);
  }
});

customersRouter.get("/:id", async (req, res, next) => {
  try {
    const customer = await db.customer.findFirst({
      where: { id: req.params.id, ownerId: req.user!.id }
    });

    if (!customer) {
      res.status(404).json({ message: "customer not found" });
      return;
    }

    const related = await findRelatedIntentData(db, req.user!.id, [customer.id]);
    res.json(serializeCustomerWithIntent(customer, related));
  } catch (error) {
    next(error);
  }
});

customersRouter.post("/", async (req, res, next) => {
  try {
    const errors = validateCustomerPayload(req.body);
    if (errors.length > 0) {
      res.status(400).json({ message: "表单校验失败", errors });
      return;
    }

    const customer = await db.customer.create({
      data: {
        ...toCustomerCreateData(req.body),
        ownerId: req.user!.id
      }
    });

    res.status(201).json(serializeCustomer(customer));
  } catch (error) {
    next(error);
  }
});

customersRouter.patch("/:id", async (req, res, next) => {
  try {
    const errors = validateCustomerPayload(req.body, { partial: true });
    if (errors.length > 0) {
      res.status(400).json({ message: "表单校验失败", errors });
      return;
    }

    const existing = await db.customer.findFirst({
      where: { id: req.params.id, ownerId: req.user!.id }
    });

    if (!existing) {
      res.status(404).json({ message: "customer not found" });
      return;
    }

    const customer = await db.customer.update({
      where: { id: req.params.id },
      data: toCustomerUpdateData(req.body)
    });

    res.json(serializeCustomer(customer));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      res.status(404).json({ message: "customer not found" });
      return;
    }
    next(error);
  }
});

customersRouter.delete("/:id", async (req, res, next) => {
  try {
    const result = await db.customer.deleteMany({ where: { id: req.params.id, ownerId: req.user!.id } });
    if (result.count === 0) {
      res.status(404).json({ message: "customer not found" });
      return;
    }
    res.status(204).send();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      res.status(404).json({ message: "customer not found" });
      return;
    }
    next(error);
  }
});

  return customersRouter;
}

export const customersRouter = createCustomersRouter();

function cleanQuery(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

type RelatedIntentData = {
  quotes: IntentQuote[];
  followUps: IntentFollowUpTask[];
  sampleOrders: IntentSampleOrder[];
  customRequests: IntentCustomRequest[];
};

async function findRelatedIntentData(db: CustomerDb, ownerId: string, customerIds: string[]): Promise<RelatedIntentData> {
  if (customerIds.length === 0) return { quotes: [], followUps: [], sampleOrders: [], customRequests: [] };
  const [quotes, followUps, sampleOrders, customRequests] = await Promise.all([
    db.quote
      ? db.quote.findMany({ where: { ownerId, customerId: { in: customerIds } } })
      : Promise.resolve([]),
    db.followUpTask
      ? db.followUpTask.findMany({ where: { ownerId, customerId: { in: customerIds } } })
      : Promise.resolve([]),
    db.sampleOrder
      ? db.sampleOrder.findMany({ where: { ownerId, customerId: { in: customerIds } } })
      : Promise.resolve([]),
    db.customRequest
      ? db.customRequest.findMany({ where: { ownerId, customerId: { in: customerIds } } })
      : Promise.resolve([])
  ]);
  return { quotes, followUps, sampleOrders, customRequests };
}

function relatedForCustomer(related: RelatedIntentData, customerId: string) {
  return {
    quotes: related.quotes.filter((quote) => quote.customerId === customerId),
    followUps: related.followUps.filter((task) => task.customerId === customerId),
    sampleOrders: related.sampleOrders.filter((sample) => sample.customerId === customerId),
    customRequests: related.customRequests.filter((item) => item.customerId === customerId)
  };
}

function serializeCustomerWithIntent(customer: IntentCustomer & Parameters<typeof serializeCustomer>[0], related: RelatedIntentData) {
  const intent = calculateCustomerIntent(customer, relatedForCustomer(related, customer.id));
  return {
    ...serializeCustomer(customer),
    intentScore: intent.intentScore,
    intentLevel: intent.intentLevel,
    recommendedAction: intent.recommendedAction
  };
}
