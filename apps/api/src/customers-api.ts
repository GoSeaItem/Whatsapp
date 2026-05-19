import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "./db.js";
import {
  serializeCustomer,
  toCustomerCreateData,
  toCustomerUpdateData,
  validateCustomerPayload
} from "./customer-utils.js";

type CustomerDb = Pick<typeof prisma, "customer">;

export function createCustomersRouter(db: CustomerDb = prisma) {
  const customersRouter = Router();

customersRouter.get("/", async (req, res, next) => {
  try {
    const tag = cleanQuery(req.query.tag);
    const stage = cleanQuery(req.query.stage);
    const q = cleanQuery(req.query.q);
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

    res.json(customers.map(serializeCustomer));
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

    res.json(serializeCustomer(customer));
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
