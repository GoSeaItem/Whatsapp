import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import type { CustomRequestStatus, CustomRequestUpsertRequest, CustomScriptRequest } from "@wa-ai/shared";
import { prisma } from "./db.js";
import { findKnowledgeForAi } from "./knowledge-base-service.js";
import {
  generateCustomScript,
  serializeCustomRequest,
  toCustomRequestCreateData,
  toCustomRequestUpdateData,
  validateCustomRequestPayload,
  validateCustomScriptPayload
} from "./custom-request-utils.js";
import { requireConfirm } from "./permissions.js";

type CustomRequestDb = Pick<typeof prisma, "customRequest" | "customer" | "product" | "knowledgeBase">;

export function createCustomRequestsRouter(db: CustomRequestDb = prisma) {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const where: Prisma.CustomRequestWhereInput = { ownerId: req.user!.id };
      const customerId = cleanQuery(req.query.customerId);
      const productId = cleanQuery(req.query.productId);
      const requestType = cleanQuery(req.query.requestType);
      const status = cleanQuery(req.query.status);
      const q = cleanQuery(req.query.q);
      if (customerId) where.customerId = customerId;
      if (productId) where.productId = productId;
      if (requestType) where.requestType = requestType;
      if (status) where.status = status;
      if (q) {
        where.OR = [
          { notes: { contains: q, mode: "insensitive" } },
          { colorRequirement: { contains: q, mode: "insensitive" } },
          { sizeRequirement: { contains: q, mode: "insensitive" } },
          { materialRequirement: { contains: q, mode: "insensitive" } },
          { files: { has: q } },
          { customer: { name: { contains: q, mode: "insensitive" } } },
          { product: { name: { contains: q, mode: "insensitive" } } }
        ];
      }
      const items = await db.customRequest.findMany({
        where,
        include: { customer: true, product: true },
        orderBy: { updatedAt: "desc" },
        take: 200
      });
      res.json(items.map(serializeCustomRequest));
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      const body = req.body as CustomRequestUpsertRequest;
      const errors = validateCustomRequestPayload(body);
      if (errors.length > 0) return res.status(400).json({ message: "validation failed", errors });
      if (!(await isOwnedCustomer(db, body.customerId, req.user!.id))) return res.status(404).json({ message: "customer not found" });
      if (body.productId && !(await isOwnedProduct(db, body.productId, req.user!.id))) return res.status(404).json({ message: "product not found" });
      const item = await db.customRequest.create({
        data: { ...toCustomRequestCreateData(body), ownerId: req.user!.id },
        include: { customer: true, product: true }
      });
      res.status(201).json(serializeCustomRequest(item));
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const item = await findOwnedCustomRequest(db, req.params.id, req.user!.id);
      if (!item) return res.status(404).json({ message: "custom request not found" });
      res.json(serializeCustomRequest(item));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id", async (req, res, next) => {
    try {
      const body = req.body as Partial<CustomRequestUpsertRequest>;
      const errors = validateCustomRequestPayload(body, { partial: true });
      if (errors.length > 0) return res.status(400).json({ message: "validation failed", errors });
      const existing = await findOwnedCustomRequest(db, req.params.id, req.user!.id);
      if (!existing) return res.status(404).json({ message: "custom request not found" });
      if (body.customerId && !(await isOwnedCustomer(db, body.customerId, req.user!.id))) return res.status(404).json({ message: "customer not found" });
      if (body.productId && !(await isOwnedProduct(db, body.productId, req.user!.id))) return res.status(404).json({ message: "product not found" });
      const item = await db.customRequest.update({
        where: { id: req.params.id },
        data: toCustomRequestUpdateData(body),
        include: { customer: true, product: true }
      });
      res.json(serializeCustomRequest(item));
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", async (req, res, next) => {
    try {
      const existing = await findOwnedCustomRequest(db, req.params.id, req.user!.id);
      if (!existing) return res.status(404).json({ message: "custom request not found" });
      const confirmError = requireConfirm(req, "customRequest.updateOwn");
      if (confirmError) return res.status(409).json(confirmError);
      const result = await db.customRequest.deleteMany({ where: { id: req.params.id, ownerId: req.user!.id } });
      if (result.count === 0) return res.status(404).json({ message: "custom request not found" });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id/status", (req, res, next) => updateStatus(req, res, next, db, req.body?.status));

  router.post("/:id/script", async (req, res, next) => {
    try {
      const item = await findOwnedCustomRequest(db, req.params.id, req.user!.id);
      if (!item) return res.status(404).json({ message: "custom request not found" });
      const body = req.body as CustomScriptRequest;
      const errors = validateCustomScriptPayload(body);
      if (errors.length > 0) return res.status(400).json({ message: "validation failed", errors });
      const serialized = serializeCustomRequest(item);
      const lookup = await findKnowledgeForAi(db, {
        ownerId: req.user!.id,
        targetLanguage: body.customerLanguage,
        productId: serialized.productId,
        mode: "custom",
        customScenario: body.scenario,
        keyword: [serialized.requestType, serialized.notes, serialized.files.join(" "), body.productContext].filter(Boolean).join(" ")
      });
      if (lookup.productNotFound) return res.status(404).json({ message: "product not found" });
      res.json(generateCustomScript(serialized, body, lookup.items));
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export const customRequestsRouter = createCustomRequestsRouter();

async function updateStatus(req: Request, res: Response, next: NextFunction, db: CustomRequestDb, status: unknown) {
  try {
    if (typeof status !== "string" || !status.trim()) {
      return res.status(400).json({ message: "validation failed", errors: [{ field: "status", message: "status is invalid" }] });
    }
    const errors = validateCustomRequestPayload({ status: status as CustomRequestStatus } as Partial<CustomRequestUpsertRequest>, { partial: true });
    if (errors.length > 0) return res.status(400).json({ message: "validation failed", errors });
    const existing = await findOwnedCustomRequest(db, req.params.id, req.user!.id);
    if (!existing) return res.status(404).json({ message: "custom request not found" });
    const item = await db.customRequest.update({
      where: { id: req.params.id },
      data: { status },
      include: { customer: true, product: true }
    });
    res.json(serializeCustomRequest(item));
  } catch (error) {
    next(error);
  }
}

async function findOwnedCustomRequest(db: CustomRequestDb, id: string, ownerId: string) {
  return db.customRequest.findFirst({ where: { id, ownerId }, include: { customer: true, product: true } });
}

async function isOwnedCustomer(db: CustomRequestDb, customerId: string, ownerId: string) {
  return Boolean(await db.customer.findFirst({ where: { id: customerId, ownerId } }));
}

async function isOwnedProduct(db: CustomRequestDb, productId: string, ownerId: string) {
  return Boolean(await db.product.findFirst({ where: { id: productId, ownerId } }));
}

function cleanQuery(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
