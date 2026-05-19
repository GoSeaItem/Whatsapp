import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { PRODUCT_BOUNDARIES, type AiReplyRequest, type GenerateDraftRequest } from "@wa-ai/shared";
import { generateAiReply } from "./ai-reply.js";
import { generateDraft } from "./ai-draft.js";
import { authRouter } from "./auth-api.js";
import { optionalAuth, requireAuth } from "./auth.js";
import { customersRouter } from "./customers-api.js";
import { customRequestsRouter } from "./custom-requests-api.js";
import { dashboardRouter } from "./dashboard-api.js";
import { prisma } from "./db.js";
import { followUpsRouter } from "./follow-ups-api.js";
import { exportRouter, importRouter } from "./import-export-api.js";
import { knowledgeBaseRouter } from "./knowledge-base-api.js";
import { materialsRouter } from "./materials-api.js";
import { buildKnowledgeContext, findKnowledgeForAi } from "./knowledge-base-service.js";
import { productsRouter } from "./products-api.js";
import { quotesRouter } from "./quotes-api.js";
import { sampleOrdersRouter } from "./sample-orders-api.js";

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
app.use("/api/customers", requireAuth, customersRouter);
app.use("/api/products", requireAuth, productsRouter);
app.use("/api/quotes", requireAuth, quotesRouter);
app.use("/api/sample-orders", requireAuth, sampleOrdersRouter);
app.use("/api/custom-requests", requireAuth, customRequestsRouter);
app.use("/api/follow-ups", requireAuth, followUpsRouter);
app.use("/api/dashboard", requireAuth, dashboardRouter);
app.use("/api/knowledge-base", requireAuth, knowledgeBaseRouter);
app.use("/api/materials", requireAuth, materialsRouter);
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
      const lookup = await findKnowledgeForAi(prisma, {
        ownerId: req.user.id,
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
      res.json(generateAiReply({ ...body, ...knowledge }));
      return;
    }

    res.json(generateAiReply(body));
  } catch (error) {
    next(error);
  }
});

app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ message: "Internal server error" });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`API ready on port ${port}`);
  });
}
