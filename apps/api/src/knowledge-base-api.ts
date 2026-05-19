import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "./db.js";
import {
  serializeKnowledgeBase,
  toKnowledgeBaseCreateData,
  toKnowledgeBaseUpdateData,
  validateKnowledgeBasePayload
} from "./knowledge-base-utils.js";

type KnowledgeBaseDb = Pick<typeof prisma, "knowledgeBase" | "product">;

export function createKnowledgeBaseRouter(db: KnowledgeBaseDb = prisma) {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const category = cleanQuery(req.query.category);
      const language = cleanQuery(req.query.language);
      const productId = cleanQuery(req.query.productId);
      const q = cleanQuery(req.query.q);
      const where: Prisma.KnowledgeBaseWhereInput = { ownerId: req.user!.id };

      if (category) where.category = category;
      if (language) where.language = language;
      if (productId) where.productId = productId;
      if (q) {
        where.OR = [
          { title: { contains: q, mode: "insensitive" } },
          { content: { contains: q, mode: "insensitive" } }
        ];
      }

      const items = await db.knowledgeBase.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: 200
      });
      res.json(items.map(serializeKnowledgeBase));
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const item = await db.knowledgeBase.findFirst({ where: { id: req.params.id, ownerId: req.user!.id } });
      if (!item) {
        res.status(404).json({ message: "knowledge not found" });
        return;
      }
      res.json(serializeKnowledgeBase(item));
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      const errors = validateKnowledgeBasePayload(req.body);
      if (errors.length > 0) {
        res.status(400).json({ message: "validation failed", errors });
        return;
      }

      const data = toKnowledgeBaseCreateData(req.body);
      if (data.productId && !(await isOwnedProduct(db, data.productId, req.user!.id))) {
        res.status(404).json({ message: "product not found" });
        return;
      }

      const item = await db.knowledgeBase.create({
        data: {
          ...data,
          ownerId: req.user!.id
        }
      });
      res.status(201).json(serializeKnowledgeBase(item));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id", async (req, res, next) => {
    try {
      const errors = validateKnowledgeBasePayload(req.body, { partial: true });
      if (errors.length > 0) {
        res.status(400).json({ message: "validation failed", errors });
        return;
      }

      const existing = await db.knowledgeBase.findFirst({ where: { id: req.params.id, ownerId: req.user!.id } });
      if (!existing) {
        res.status(404).json({ message: "knowledge not found" });
        return;
      }

      const data = toKnowledgeBaseUpdateData(req.body);
      if (typeof data.productId === "string" && !(await isOwnedProduct(db, data.productId, req.user!.id))) {
        res.status(404).json({ message: "product not found" });
        return;
      }

      const item = await db.knowledgeBase.update({
        where: { id: req.params.id },
        data
      });
      res.json(serializeKnowledgeBase(item));
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/enable", async (req, res, next) => {
    try {
      const item = await updateEnabled(db, req.params.id, req.user!.id, true);
      if (!item) {
        res.status(404).json({ message: "knowledge not found" });
        return;
      }
      res.json(serializeKnowledgeBase(item));
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/disable", async (req, res, next) => {
    try {
      const item = await updateEnabled(db, req.params.id, req.user!.id, false);
      if (!item) {
        res.status(404).json({ message: "knowledge not found" });
        return;
      }
      res.json(serializeKnowledgeBase(item));
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", async (req, res, next) => {
    try {
      const result = await db.knowledgeBase.deleteMany({ where: { id: req.params.id, ownerId: req.user!.id } });
      if (result.count === 0) {
        res.status(404).json({ message: "knowledge not found" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export const knowledgeBaseRouter = createKnowledgeBaseRouter();

async function isOwnedProduct(db: KnowledgeBaseDb, productId: string, ownerId: string) {
  return Boolean(await db.product.findFirst({ where: { id: productId, ownerId } }));
}

async function updateEnabled(db: KnowledgeBaseDb, id: string, ownerId: string, enabled: boolean) {
  const existing = await db.knowledgeBase.findFirst({ where: { id, ownerId } });
  if (!existing) return null;
  return db.knowledgeBase.update({ where: { id }, data: { enabled } });
}

function cleanQuery(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
