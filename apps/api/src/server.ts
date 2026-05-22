import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { PRODUCT_BOUNDARIES, type AiReplyRequest, type GenerateDraftRequest } from "@wa-ai/shared";
import { generateAiReply } from "./ai-reply.js";
import { generateDraft } from "./ai-draft.js";
import { aiAdvancedRouter } from "./ai-advanced-api.js";
import { securityRouter } from "./security-api.js";
import { authRouter } from "./auth-api.js";
import { optionalAuth, requireAuth } from "./auth.js";
import { auditLogsRouter } from "./audit-logs-api.js";
import { afterSalesAiRouter, afterSalesRouter } from "./after-sales-api.js";
import { customersRouter } from "./customers-api.js";
import { customRequestsRouter } from "./custom-requests-api.js";
import { dashboardRouter } from "./dashboard-api.js";
import { prisma } from "./db.js";
import { followUpsRouter } from "./follow-ups-api.js";
import { exportRouter, importRouter } from "./import-export-api.js";
import { enterpriseRouter } from "./enterprise-api.js";
import { knowledgeBaseRouter } from "./knowledge-base-api.js";
import { materialsRouter } from "./materials-api.js";
import { organizationsRouter } from "./organizations-api.js";
import { orderAiRouter, orderFulfillmentAlertsRouter, ordersRouter } from "./orders-api.js";
import { canReadOrganization, getActiveOrganizationRole, requireOrganizationResourcePermission } from "./organization-permissions.js";
import { knowledgeBaseOrgRouter, scriptOrgRouter } from "./org-content-api.js";
import { organizationMaterialsRouter, organizationProductsRouter } from "./org-resource-api.js";
import { profitRouter } from "./profit-api.js";
import { buildKnowledgeContext, findKnowledgeForAi } from "./knowledge-base-service.js";
import { productsRouter } from "./products-api.js";
import { predictionsRouter, reorderAiRouter, reorderRemindersRouter } from "./predictions-api.js";
import { createReorderOperationsAiRouter, createReorderOperationsRouter } from "./reorder-operations-api.js";
import { quotesRouter } from "./quotes-api.js";
import { reportsRouter } from "./reports-api.js";
import { rolesRouter } from "./roles-api.js";
import { sampleOrdersRouter } from "./sample-orders-api.js";
import { createScriptAbAiRouter, createScriptAbRouter } from "./script-ab-api.js";
import {
  brandKnowledgeBasesRouter,
  brandMaterialsRouter,
  brandProductsRouter,
  brandRulesRouter,
  brandScriptsRouter,
  brandsRouter,
  resolveBrandContext
} from "./brands-api.js";
import {
  purchaseNotesRouter,
  supplierAiRouter,
  supplierContactsRouter,
  supplierLinksRouter,
  supplierQuotesRouter,
  supplierRisksRouter,
  suppliersRouter
} from "./suppliers-api.js";

export const app = express();
const port = Number(process.env.PORT || 4000);

function csv(value?: string) {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function isAllowedCorsOrigin(origin: string | undefined, env: NodeJS.ProcessEnv = process.env) {
  if (!origin) return true;

  const allowedOrigins = new Set([
    env.WEB_ORIGIN || "http://localhost:5173",
    env.API_ORIGIN,
    env.CHROME_EXTENSION_ORIGIN,
    ...csv(env.CORS_ORIGINS)
  ].filter(Boolean));
  if (allowedOrigins.has(origin)) return true;

  return env.NODE_ENV !== "production" && origin.startsWith("chrome-extension://");
}

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedCorsOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));

const healthHandler: express.RequestHandler = (_req, res) => {
  res.json({
    ok: true,
    service: "whatsapp-ai-sales-assistant-api",
    boundaries: PRODUCT_BOUNDARIES
  });
};

app.get("/health", healthHandler);
app.get("/api/health", healthHandler);

app.use("/api/auth", authRouter);
const organizationResourcePermission = requireOrganizationResourcePermission(prisma);
app.use("/api/customers", requireAuth, customersRouter);
app.use("/api/products/org", requireAuth, organizationProductsRouter);
app.use("/api/products", requireAuth, organizationResourcePermission, productsRouter);
app.use("/api/quotes", requireAuth, quotesRouter);
app.use("/api/sample-orders", requireAuth, sampleOrdersRouter);
app.use("/api/custom-requests", requireAuth, customRequestsRouter);
app.use("/api/follow-ups", requireAuth, followUpsRouter);
app.use("/api/dashboard", requireAuth, dashboardRouter);
app.use("/api/reports", requireAuth, reportsRouter);
app.use("/api/knowledge-base/org", requireAuth, knowledgeBaseOrgRouter);
app.use("/api/knowledge-base", requireAuth, organizationResourcePermission, knowledgeBaseRouter);
app.use("/api/scripts/org", requireAuth, scriptOrgRouter);
app.use("/api/materials/org", requireAuth, organizationMaterialsRouter);
app.use("/api/materials", requireAuth, organizationResourcePermission, materialsRouter);
app.use("/api/organizations", requireAuth, organizationsRouter);
app.use("/api/roles", requireAuth, rolesRouter);
app.use("/api/audit-logs", requireAuth, auditLogsRouter);
app.use("/api/security", requireAuth, securityRouter);
app.use("/api/enterprise", requireAuth, enterpriseRouter);
app.use("/api/predictions", requireAuth, predictionsRouter);
app.use("/api/reorder-reminders", requireAuth, reorderRemindersRouter);
app.use("/api/reorder", requireAuth, createReorderOperationsRouter());
app.use("/api/after-sales", requireAuth, afterSalesRouter);
app.use("/api/suppliers", requireAuth, suppliersRouter);
app.use("/api/supplier-contacts", requireAuth, supplierContactsRouter);
app.use("/api/supplier-quotes", requireAuth, supplierQuotesRouter);
app.use("/api/purchase-notes", requireAuth, purchaseNotesRouter);
app.use("/api/supplier-risks", requireAuth, supplierRisksRouter);
app.use("/api/supplier-links", requireAuth, supplierLinksRouter);
app.use("/api/brands", requireAuth, brandsRouter);
app.use("/api/brand-products", requireAuth, brandProductsRouter);
app.use("/api/brand-materials", requireAuth, brandMaterialsRouter);
app.use("/api/brand-knowledge-bases", requireAuth, brandKnowledgeBasesRouter);
app.use("/api/brand-scripts", requireAuth, brandScriptsRouter);
app.use("/api/brand-rules", requireAuth, brandRulesRouter);
app.use("/api/orders/:id/cost", requireAuth);
app.use("/api/profit", requireAuth);
app.use("/api/ai/profit-review", requireAuth);
app.use("/api", profitRouter);
app.use("/api/orders", requireAuth, ordersRouter);
app.use("/api/order-fulfillment-alerts", requireAuth, orderFulfillmentAlertsRouter);
app.use("/api/export", requireAuth, exportRouter);
app.use("/api/import", requireAuth, importRouter);

app.post("/api/ai/draft", async (req, res, next) => {
  try {
    const body = req.body as GenerateDraftRequest;
    const draft = generateDraft(body);

    if (body.sourceText?.trim()) {
      await prisma.messageDraft
        .create({
          data: {
            customerId: body.customerId || null,
            ownerId: req.user?.id || null,
            sourceText: body.sourceText,
            draftText: draft.draft,
            intent: body.intent,
            languageFrom: body.languageFrom || null,
            languageTo: body.languageTo || null
          }
        })
        .catch(() => undefined);
    }

    res.json(draft);
  } catch (error) {
    next(error);
  }
});

app.post("/api/ai/reply", optionalAuth, async (req, res, next) => {
  try {
    const body = req.body as AiReplyRequest;
    if (!body.customerMessage?.trim()) {
      res.status(400).json({ message: "customerMessage is required" });
      return;
    }

    if (req.user && body.useKnowledgeBase !== false) {
      const brandId = typeof (body as any).brandId === "string" ? (body as any).brandId.trim() : "";
      const brandContext = brandId
        ? await resolveBrandContext(prisma as any, req.user.id, {
            brandId,
            customerId: typeof (body as any).customerId === "string" ? (body as any).customerId : null,
            productId: body.productId,
            scenario: body.scenario
          })
        : null;
      const organizationId = typeof body.organizationId === "string"
        ? body.organizationId.trim()
        : brandContext?.brand?.organizationId || "";
      if (organizationId) {
        const role = await getActiveOrganizationRole(prisma, organizationId, req.user.id);
        if (!canReadOrganization(role)) {
          res.status(403).json({ message: "organization membership required" });
          return;
        }
      }
      const lookup = await findKnowledgeForAi(prisma, {
        ownerId: req.user.id,
        organizationId,
        targetLanguage: body.targetLanguage,
        productId: body.productId,
        scenario: body.scenario,
        mode: "reply",
        keyword: body.customerMessage
      });
      if (lookup.productNotFound) {
        res.status(404).json({ message: "product not found" });
        return;
      }
      const knowledge = buildKnowledgeContext(lookup.items);
      const mergedKnowledge = brandContext
        ? {
            knowledgeContext: [brandContext.knowledgeContext, knowledge.knowledgeContext].filter(Boolean).join("\n"),
            knowledgeUsed: [...(brandContext.knowledgeUsed || []), ...knowledge.knowledgeUsed]
          }
        : knowledge;
      const result = generateAiReply({ ...body, ...mergedKnowledge });
      res.json({
        ...result,
        brandUsed: brandContext?.brandUsed || null,
        brandRulesUsed: brandContext?.brandRulesUsed || [],
        riskWarnings: Array.from(new Set([...(result.riskWarnings || []), ...(brandContext?.riskWarnings || [])]))
      });
      return;
    }

    res.json(generateAiReply(body));
  } catch (error) {
    next(error);
  }
});

app.use("/api", requireAuth, createScriptAbRouter());
app.use("/api/ai", requireAuth, reorderAiRouter);
app.use("/api/ai", requireAuth, createReorderOperationsAiRouter());
app.use("/api/ai", requireAuth, orderAiRouter);
app.use("/api/ai", requireAuth, afterSalesAiRouter);
app.use("/api/ai", requireAuth, createScriptAbAiRouter());
app.use("/api/ai", requireAuth, supplierAiRouter);
app.use("/api/ai", requireAuth, aiAdvancedRouter);

app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  const status = Number((error as any).status) || 500;
  res.status(status).json({ message: status === 500 ? "Internal server error" : error.message });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`API ready on port ${port}`);
  });
}
