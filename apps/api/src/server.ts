import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { PRODUCT_BOUNDARIES, type AiReplyRequest, type GenerateDraftRequest } from "@wa-ai/shared";
import { generateAiReply } from "./ai-reply.js";
import { generateDraft } from "./ai-draft.js";
import { authRouter } from "./auth-api.js";
import { requireAuth } from "./auth.js";
import { customersRouter } from "./customers-api.js";
import { prisma } from "./db.js";
import { followUpsRouter } from "./follow-ups-api.js";
import { productsRouter } from "./products-api.js";
import { quotesRouter } from "./quotes-api.js";

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
app.use("/api/follow-ups", requireAuth, followUpsRouter);

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

app.post("/api/ai/reply", (req, res, next) => {
  try {
    const body = req.body as AiReplyRequest;
    if (!body.customerMessage?.trim()) {
      res.status(400).json({ message: "customerMessage is required" });
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
