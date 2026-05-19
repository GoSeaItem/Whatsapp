import { Router } from "express";
import { Prisma } from "@prisma/client";
import type { MaterialIntroRequest } from "@wa-ai/shared";
import { prisma } from "./db.js";
import { findKnowledgeForAi } from "./knowledge-base-service.js";
import {
  generateMaterialIntro,
  serializeMaterial,
  toMaterialCreateData,
  toMaterialUpdateData,
  validateMaterialPayload
} from "./material-utils.js";

type MaterialDb = Pick<typeof prisma, "material" | "product" | "knowledgeBase">;

export function createMaterialsRouter(db: MaterialDb = prisma) {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const type = cleanQuery(req.query.type);
      const language = cleanQuery(req.query.language);
      const productId = cleanQuery(req.query.productId);
      const tag = cleanQuery(req.query.tag);
      const q = cleanQuery(req.query.q);
      const where: Prisma.MaterialWhereInput = { ownerId: req.user!.id };

      if (type) where.type = type;
      if (language) where.language = language;
      if (productId) where.productId = productId;
      if (tag) where.tags = { has: tag };
      if (q) {
        where.OR = [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { tags: { has: q } }
        ];
      }

      const materials = await db.material.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: 200
      });
      res.json(materials.map(serializeMaterial));
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const material = await db.material.findFirst({ where: { id: req.params.id, ownerId: req.user!.id } });
      if (!material) {
        res.status(404).json({ message: "material not found" });
        return;
      }
      res.json(serializeMaterial(material));
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      const errors = validateMaterialPayload(req.body);
      if (errors.length > 0) {
        res.status(400).json({ message: "validation failed", errors });
        return;
      }

      const data = toMaterialCreateData(req.body);
      if (data.productId && !(await isOwnedProduct(db, data.productId, req.user!.id))) {
        res.status(404).json({ message: "product not found" });
        return;
      }

      const material = await db.material.create({
        data: {
          ...data,
          ownerId: req.user!.id
        }
      });
      res.status(201).json(serializeMaterial(material));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id", async (req, res, next) => {
    try {
      const errors = validateMaterialPayload(req.body, { partial: true });
      if (errors.length > 0) {
        res.status(400).json({ message: "validation failed", errors });
        return;
      }

      const existing = await db.material.findFirst({ where: { id: req.params.id, ownerId: req.user!.id } });
      if (!existing) {
        res.status(404).json({ message: "material not found" });
        return;
      }

      const data = toMaterialUpdateData(req.body);
      if (typeof data.productId === "string" && !(await isOwnedProduct(db, data.productId, req.user!.id))) {
        res.status(404).json({ message: "product not found" });
        return;
      }

      const material = await db.material.update({
        where: { id: req.params.id },
        data
      });
      res.json(serializeMaterial(material));
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", async (req, res, next) => {
    try {
      const result = await db.material.deleteMany({ where: { id: req.params.id, ownerId: req.user!.id } });
      if (result.count === 0) {
        res.status(404).json({ message: "material not found" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/intro", async (req, res, next) => {
    try {
      const material = await db.material.findFirst({ where: { id: req.params.id, ownerId: req.user!.id } });
      if (!material) {
        res.status(404).json({ message: "material not found" });
        return;
      }
      const serialized = serializeMaterial(material);
      const body = req.body as MaterialIntroRequest;
      const lookup = body.useKnowledgeBase === false
        ? { items: [], productNotFound: false }
        : await findKnowledgeForAi(db, {
            ownerId: req.user!.id,
            targetLanguage: body.customerLanguage || serialized.language,
            productId: serialized.productId,
            mode: "material",
            materialType: serialized.type,
            keyword: [serialized.title, serialized.description, body.scenario].filter(Boolean).join(" ")
          });
      if (lookup.productNotFound) {
        res.status(404).json({ message: "product not found" });
        return;
      }
      res.json(generateMaterialIntro(serialized, body, lookup.items));
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export const materialsRouter = createMaterialsRouter();

async function isOwnedProduct(db: MaterialDb, productId: string, ownerId: string) {
  return Boolean(await db.product.findFirst({ where: { id: productId, ownerId } }));
}

function cleanQuery(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
