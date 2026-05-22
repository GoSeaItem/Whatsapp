import { Router } from "express";
import type { QuoteGenerateRequest, QuoteSaveRequest } from "@wa-ai/shared";
import { prisma } from "./db.js";
import { writeAuditLog } from "./audit-log-utils.js";
import { findKnowledgeForAi } from "./knowledge-base-service.js";
import { canReadOrganization, getActiveOrganizationRole } from "./organization-permissions.js";
import { serializeProduct } from "./product-utils.js";
import {
  buildQuoteCreateData,
  buildQuoteResponse,
  serializeQuote,
  validateQuotePayload
} from "./quote-utils.js";
import { requireConfirm } from "./permissions.js";

type QuoteDb = Pick<typeof prisma, "quote" | "customer" | "product" | "knowledgeBase" | "organizationMember" | "organizationProduct"> &
  Partial<Pick<typeof prisma, "knowledgeBaseOrg" | "scriptOrg" | "auditLog">>;

export function createQuotesRouter(db: QuoteDb = prisma) {
  const quotesRouter = Router();

  quotesRouter.post("/generate", async (req, res, next) => {
    try {
      const body = req.body as QuoteGenerateRequest;
      const errors = validateQuotePayload(body);
      if (errors.length > 0) {
        res.status(400).json({ message: "表单校验失败", errors });
        return;
      }

      const productResult = await findAccessibleProduct(db, body.productId, req.user!.id, body.organizationId);
      if (productResult.forbidden) {
        res.status(403).json({ message: "organization membership required" });
        return;
      }
      if (!productResult.product) {
        res.status(404).json({ message: "product not found" });
        return;
      }

      const knowledge = body.useKnowledgeBase === false ? { items: [] } : await findKnowledgeForAi(db, {
        ownerId: req.user!.id,
        organizationId: body.organizationId,
        targetLanguage: body.targetLanguage,
        productId: body.productId,
        mode: "quote"
      });
      res.json(buildQuoteResponse({ ...body, createdBy: req.user!.id }, productResult.product, knowledge.items));
    } catch (error) {
      next(error);
    }
  });

  quotesRouter.post("/", async (req, res, next) => {
    try {
      const body = req.body as QuoteSaveRequest;
      const errors = validateQuotePayload(body, { requireCustomer: true });
      if (errors.length > 0) {
        res.status(400).json({ message: "表单校验失败", errors });
        return;
      }

      const [productResult, customer] = await Promise.all([
        findAccessibleProduct(db, body.productId, req.user!.id, body.organizationId),
        findOwnedCustomer(db, body.customerId, req.user!.id)
      ]);
      if (productResult.forbidden) {
        res.status(403).json({ message: "organization membership required" });
        return;
      }
      if (!productResult.product) {
        res.status(404).json({ message: "product not found" });
        return;
      }
      if (!customer) {
        res.status(404).json({ message: "customer not found" });
        return;
      }

      const knowledge = body.useKnowledgeBase === false ? { items: [] } : await findKnowledgeForAi(db, {
        ownerId: req.user!.id,
        organizationId: body.organizationId,
        targetLanguage: body.targetLanguage,
        productId: body.productId,
        mode: "quote"
      });
      const response = buildQuoteResponse({ ...body, createdBy: req.user!.id }, productResult.product, knowledge.items);
      const quote = await db.quote.create({
        data: {
          ...buildQuoteCreateData(response),
          ownerId: req.user!.id,
          createdBy: req.user!.id
        }
      });
      await writeAuditLog(db, { organizationId: (customer as any).organizationId, userId: req.user!.id, action: "create", entityType: "Quote", entityId: quote.id, before: null, after: quote });
      res.status(201).json({
        ...serializeQuote(quote),
        riskWarnings: response.riskWarnings,
        followUpPrompt: response.followUpPrompt
      });
    } catch (error) {
      next(error);
    }
  });

  quotesRouter.get("/", async (req, res, next) => {
    try {
      const customerId = cleanQuery(req.query.customerId);
      if (customerId) {
        const customer = await findOwnedCustomer(db, customerId, req.user!.id);
        if (!customer) {
          res.status(404).json({ message: "customer not found" });
          return;
        }
      }

      const quotes = await db.quote.findMany({
        where: {
          ownerId: req.user!.id,
          createdBy: req.user!.id,
          ...(customerId ? { customerId } : {})
        },
        orderBy: { createdAt: "desc" },
        take: 100
      });
      res.json(quotes.map(serializeQuote));
    } catch (error) {
      next(error);
    }
  });

  quotesRouter.get("/customer/:customerId", async (req, res, next) => {
    try {
      const customer = await findOwnedCustomer(db, req.params.customerId, req.user!.id);
      if (!customer) {
        res.status(404).json({ message: "customer not found" });
        return;
      }

      const quotes = await db.quote.findMany({
        where: { customerId: req.params.customerId, ownerId: req.user!.id, createdBy: req.user!.id },
        orderBy: { createdAt: "desc" },
        take: 50
      });
      res.json(quotes.map(serializeQuote));
    } catch (error) {
      next(error);
    }
  });

  quotesRouter.get("/:id", async (req, res, next) => {
    try {
      const quote = await findOwnedQuote(db, req.params.id, req.user!.id);
      if (!quote) {
        res.status(404).json({ message: "quote not found" });
        return;
      }
      res.json(serializeQuote(quote));
    } catch (error) {
      next(error);
    }
  });

  quotesRouter.patch("/:id", async (req, res, next) => {
    try {
      const errors = validateQuotePayload(req.body, { partial: true });
      if (errors.length > 0) {
        res.status(400).json({ message: "表单校验失败", errors });
        return;
      }

      const existing = await findOwnedQuote(db, req.params.id, req.user!.id);
      if (!existing) {
        res.status(404).json({ message: "quote not found" });
        return;
      }

      const nextCustomerId = req.body.customerId || existing.customerId;
      const nextProductId = req.body.productId || existing.productId;
      const organizationId = req.body.organizationId;
      const [customer, productResult] = await Promise.all([
        findOwnedCustomer(db, nextCustomerId, req.user!.id),
        findAccessibleProduct(db, nextProductId, req.user!.id, organizationId)
      ]);
      if (!customer) {
        res.status(404).json({ message: "customer not found" });
        return;
      }
      if (productResult.forbidden) {
        res.status(403).json({ message: "organization membership required" });
        return;
      }
      if (!productResult.product) {
        res.status(404).json({ message: "product not found" });
        return;
      }

      const merged: QuoteSaveRequest = {
        customerId: nextCustomerId,
        productId: nextProductId,
        quantity: req.body.quantity ?? existing.quantity,
        unitPrice: req.body.unitPrice ?? existing.unitPrice.toFixed(2),
        currency: req.body.currency ?? existing.currency,
        shippingCost:
          req.body.shippingCost !== undefined ? req.body.shippingCost : existing.shippingCost?.toFixed(2) ?? null,
        moq: req.body.moq !== undefined ? req.body.moq : existing.moq,
        leadTime: req.body.leadTime !== undefined ? req.body.leadTime : existing.leadTime,
        includeShipping: req.body.includeShipping !== undefined ? req.body.includeShipping : existing.includeShipping,
        targetLanguage: req.body.targetLanguage ?? "English",
        tiers: req.body.tiers,
        createdBy: req.user!.id,
        stockKnown: req.body.stockKnown,
        promiseStock: req.body.promiseStock,
        attachmentSelected: req.body.attachmentSelected,
        organizationId,
        quoteText: req.body.quoteText !== undefined ? req.body.quoteText : existing.quoteText
      };
      const knowledge = merged.useKnowledgeBase === false ? { items: [] } : await findKnowledgeForAi(db, {
        ownerId: req.user!.id,
        organizationId,
        targetLanguage: merged.targetLanguage,
        productId: nextProductId,
        mode: "quote"
      });
      const response = buildQuoteResponse(merged, productResult.product, knowledge.items);
      const quote = await db.quote.update({
        where: { id: req.params.id },
        data: {
          ...buildQuoteCreateData(response),
          ownerId: req.user!.id,
          createdBy: req.user!.id
        }
      });
      await writeAuditLog(db, { organizationId: (customer as any).organizationId, userId: req.user!.id, action: "update", entityType: "Quote", entityId: quote.id, before: existing, after: quote });
      res.json({
        ...serializeQuote(quote),
        riskWarnings: response.riskWarnings,
        followUpPrompt: response.followUpPrompt
      });
    } catch (error) {
      next(error);
    }
  });

  quotesRouter.delete("/:id", async (req, res, next) => {
    try {
      const existing = await findOwnedQuote(db, req.params.id, req.user!.id);
      if (!existing) {
        res.status(404).json({ message: "quote not found" });
        return;
      }
      const customer = await findOwnedCustomer(db, existing.customerId, req.user!.id);
      const confirmError = requireConfirm(req, "quote.deleteOwn");
      if (confirmError) return res.status(409).json(confirmError);
      const result = await db.quote.deleteMany({
        where: { id: req.params.id, ownerId: req.user!.id, createdBy: req.user!.id }
      });
      if (result.count === 0) {
        res.status(404).json({ message: "quote not found" });
        return;
      }
      await writeAuditLog(db, { organizationId: (customer as any)?.organizationId, userId: req.user!.id, action: "delete", entityType: "Quote", entityId: existing.id, before: existing, after: null, riskLevel: "high", metadata: { confirmed: true } });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return quotesRouter;
}

export const quotesRouter = createQuotesRouter();

async function findOwnedProduct(db: QuoteDb, productId: string, ownerId: string) {
  const product = await db.product.findFirst({ where: { id: productId, ownerId } });
  return product ? serializeProduct(product) : null;
}

async function findAccessibleProduct(db: QuoteDb, productId: string, ownerId: string, organizationId?: string | null) {
  const cleanOrganizationId = typeof organizationId === "string" ? organizationId.trim() : "";
  if (!cleanOrganizationId) {
    return { product: await findOwnedProduct(db, productId, ownerId), forbidden: false };
  }

  const role = await getActiveOrganizationRole(db, cleanOrganizationId, ownerId);
  if (!canReadOrganization(role)) return { product: null, forbidden: true };

  const link = await db.organizationProduct.findFirst({
    where: { organizationId: cleanOrganizationId, productId },
    include: { product: true }
  });
  return { product: link?.product ? serializeProduct(link.product) : null, forbidden: false };
}

async function findOwnedCustomer(db: QuoteDb, customerId: string, ownerId: string) {
  return db.customer.findFirst({ where: { id: customerId, ownerId } });
}

async function findOwnedQuote(db: QuoteDb, quoteId: string, ownerId: string) {
  return db.quote.findFirst({ where: { id: quoteId, ownerId, createdBy: ownerId } });
}

function cleanQuery(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
