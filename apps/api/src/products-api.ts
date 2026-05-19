import { Router } from "express";
import { Prisma } from "@prisma/client";
import type { ProductIntroRequest } from "@wa-ai/shared";
import { prisma } from "./db.js";
import {
  generateProductIntro,
  serializeProduct,
  toProductCreateData,
  toProductUpdateData,
  validateProductPayload
} from "./product-utils.js";

type ProductDb = Pick<typeof prisma, "product">;

export function createProductsRouter(db: ProductDb = prisma) {
  const productsRouter = Router();

productsRouter.get("/", async (req, res, next) => {
  try {
    const q = cleanQuery(req.query.q);
    const category = cleanQuery(req.query.category);
    const where: Prisma.ProductWhereInput = { ownerId: req.user!.id };

    if (category) where.category = { equals: category, mode: "insensitive" };
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } }
      ];
    }

    const products = await db.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 100
    });

    res.json(products.map(serializeProduct));
  } catch (error) {
    next(error);
  }
});

productsRouter.get("/:id", async (req, res, next) => {
  try {
    const product = await db.product.findFirst({ where: { id: req.params.id, ownerId: req.user!.id } });
    if (!product) {
      res.status(404).json({ message: "product not found" });
      return;
    }
    res.json(serializeProduct(product));
  } catch (error) {
    next(error);
  }
});

productsRouter.post("/", async (req, res, next) => {
  try {
    const errors = validateProductPayload(req.body);
    if (errors.length > 0) {
      res.status(400).json({ message: "表单校验失败", errors });
      return;
    }

    const product = await db.product.create({
      data: {
        ...toProductCreateData(req.body),
        ownerId: req.user!.id
      }
    });
    res.status(201).json(serializeProduct(product));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      res.status(409).json({ message: "SKU 已存在" });
      return;
    }
    next(error);
  }
});

productsRouter.patch("/:id", async (req, res, next) => {
  try {
    const errors = validateProductPayload(req.body, { partial: true });
    if (errors.length > 0) {
      res.status(400).json({ message: "表单校验失败", errors });
      return;
    }

    const existing = await db.product.findFirst({ where: { id: req.params.id, ownerId: req.user!.id } });
    if (!existing) {
      res.status(404).json({ message: "product not found" });
      return;
    }

    const product = await db.product.update({
      where: { id: req.params.id },
      data: toProductUpdateData(req.body)
    });
    res.json(serializeProduct(product));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      res.status(404).json({ message: "product not found" });
      return;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      res.status(409).json({ message: "SKU 已存在" });
      return;
    }
    next(error);
  }
});

productsRouter.delete("/:id", async (req, res, next) => {
  try {
    const result = await db.product.deleteMany({ where: { id: req.params.id, ownerId: req.user!.id } });
    if (result.count === 0) {
      res.status(404).json({ message: "product not found" });
      return;
    }
    res.status(204).send();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      res.status(404).json({ message: "product not found" });
      return;
    }
    next(error);
  }
});

productsRouter.post("/:id/intro", async (req, res, next) => {
  try {
    const product = await db.product.findFirst({ where: { id: req.params.id, ownerId: req.user!.id } });
    if (!product) {
      res.status(404).json({ message: "product not found" });
      return;
    }
    res.json(generateProductIntro(serializeProduct(product), req.body as ProductIntroRequest));
  } catch (error) {
    next(error);
  }
});

  return productsRouter;
}

export const productsRouter = createProductsRouter();

function cleanQuery(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
