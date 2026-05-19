import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import type { SampleFeedbackStatus, SampleOrderUpsertRequest, SamplePaymentStatus, SampleScriptRequest, SampleShippingStatus } from "@wa-ai/shared";
import { prisma } from "./db.js";
import { findKnowledgeForAi } from "./knowledge-base-service.js";
import {
  generateSampleScript,
  serializeSampleOrder,
  toSampleOrderCreateData,
  toSampleOrderUpdateData,
  validateSampleOrderPayload,
  validateSampleScriptPayload
} from "./sample-order-utils.js";

type SampleOrderDb = Pick<typeof prisma, "sampleOrder" | "customer" | "product" | "knowledgeBase">;

export function createSampleOrdersRouter(db: SampleOrderDb = prisma) {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const where: Prisma.SampleOrderWhereInput = { ownerId: req.user!.id };
      const customerId = cleanQuery(req.query.customerId);
      const productId = cleanQuery(req.query.productId);
      const paymentStatus = cleanQuery(req.query.paymentStatus);
      const shippingStatus = cleanQuery(req.query.shippingStatus);
      const feedbackStatus = cleanQuery(req.query.feedbackStatus);
      const q = cleanQuery(req.query.q);
      if (customerId) where.customerId = customerId;
      if (productId) where.productId = productId;
      if (paymentStatus) where.paymentStatus = paymentStatus;
      if (shippingStatus) where.shippingStatus = shippingStatus;
      if (feedbackStatus) where.feedbackStatus = feedbackStatus;
      if (q) {
        where.OR = [
          { sampleName: { contains: q, mode: "insensitive" } },
          { trackingNumber: { contains: q, mode: "insensitive" } },
          { customer: { name: { contains: q, mode: "insensitive" } } }
        ];
      }
      const items = await db.sampleOrder.findMany({
        where,
        include: { customer: true, product: true },
        orderBy: { updatedAt: "desc" },
        take: 200
      });
      res.json(items.map(serializeSampleOrder));
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      const body = req.body as SampleOrderUpsertRequest;
      const errors = validateSampleOrderPayload(body);
      if (errors.length > 0) return res.status(400).json({ message: "validation failed", errors });
      if (!(await isOwnedCustomer(db, body.customerId, req.user!.id))) return res.status(404).json({ message: "customer not found" });
      if (body.productId && !(await isOwnedProduct(db, body.productId, req.user!.id))) return res.status(404).json({ message: "product not found" });
      const item = await db.sampleOrder.create({
        data: { ...toSampleOrderCreateData(body), ownerId: req.user!.id },
        include: { customer: true, product: true }
      });
      res.status(201).json(serializeSampleOrder(item));
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const item = await findOwnedSampleOrder(db, req.params.id, req.user!.id);
      if (!item) return res.status(404).json({ message: "sample order not found" });
      res.json(serializeSampleOrder(item));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id", async (req, res, next) => {
    try {
      const body = req.body as Partial<SampleOrderUpsertRequest>;
      const errors = validateSampleOrderPayload(body, { partial: true });
      if (errors.length > 0) return res.status(400).json({ message: "validation failed", errors });
      const existing = await findOwnedSampleOrder(db, req.params.id, req.user!.id);
      if (!existing) return res.status(404).json({ message: "sample order not found" });
      if (body.customerId && !(await isOwnedCustomer(db, body.customerId, req.user!.id))) return res.status(404).json({ message: "customer not found" });
      if (body.productId && !(await isOwnedProduct(db, body.productId, req.user!.id))) return res.status(404).json({ message: "product not found" });
      const item = await db.sampleOrder.update({
        where: { id: req.params.id },
        data: toSampleOrderUpdateData(body),
        include: { customer: true, product: true }
      });
      res.json(serializeSampleOrder(item));
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", async (req, res, next) => {
    try {
      const result = await db.sampleOrder.deleteMany({ where: { id: req.params.id, ownerId: req.user!.id } });
      if (result.count === 0) return res.status(404).json({ message: "sample order not found" });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id/payment-status", (req, res, next) => updateStatus(req, res, next, db, "paymentStatus", req.body?.paymentStatus));
  router.patch("/:id/shipping-status", (req, res, next) => updateStatus(req, res, next, db, "shippingStatus", req.body?.shippingStatus));
  router.patch("/:id/feedback-status", (req, res, next) => updateStatus(req, res, next, db, "feedbackStatus", req.body?.feedbackStatus));

  router.post("/:id/script", async (req, res, next) => {
    try {
      const item = await findOwnedSampleOrder(db, req.params.id, req.user!.id);
      if (!item) return res.status(404).json({ message: "sample order not found" });
      const body = req.body as SampleScriptRequest;
      const errors = validateSampleScriptPayload(body);
      if (errors.length > 0) return res.status(400).json({ message: "validation failed", errors });
      const serialized = serializeSampleOrder(item);
      const lookup = await findKnowledgeForAi(db, {
        ownerId: req.user!.id,
        targetLanguage: body.customerLanguage,
        productId: serialized.productId,
        mode: "sample",
        sampleScenario: body.scenario,
        keyword: [serialized.sampleName, serialized.notes, body.productContext].filter(Boolean).join(" ")
      });
      if (lookup.productNotFound) return res.status(404).json({ message: "product not found" });
      res.json(generateSampleScript(serialized, body, lookup.items));
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export const sampleOrdersRouter = createSampleOrdersRouter();

async function updateStatus(
  req: Request,
  res: Response,
  next: NextFunction,
  db: SampleOrderDb,
  field: "paymentStatus" | "shippingStatus" | "feedbackStatus",
  value: SamplePaymentStatus | SampleShippingStatus | SampleFeedbackStatus
) {
  try {
    const errors = validateSampleOrderPayload({ [field]: value } as Partial<SampleOrderUpsertRequest>, { partial: true });
    if (errors.length > 0) return res.status(400).json({ message: "validation failed", errors });
    const existing = await findOwnedSampleOrder(db, req.params.id, req.user!.id);
    if (!existing) return res.status(404).json({ message: "sample order not found" });
    const data = toSampleOrderUpdateData({ [field]: value } as Partial<SampleOrderUpsertRequest>);
    const item = await db.sampleOrder.update({ where: { id: req.params.id }, data, include: { customer: true, product: true } });
    res.json(serializeSampleOrder(item));
  } catch (error) {
    next(error);
  }
}

async function findOwnedSampleOrder(db: SampleOrderDb, id: string, ownerId: string) {
  return db.sampleOrder.findFirst({ where: { id, ownerId }, include: { customer: true, product: true } });
}

async function isOwnedCustomer(db: SampleOrderDb, customerId: string, ownerId: string) {
  return Boolean(await db.customer.findFirst({ where: { id: customerId, ownerId } }));
}

async function isOwnedProduct(db: SampleOrderDb, productId: string, ownerId: string) {
  return Boolean(await db.product.findFirst({ where: { id: productId, ownerId } }));
}

function cleanQuery(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
