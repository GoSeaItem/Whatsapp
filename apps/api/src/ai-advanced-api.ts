import { Router } from "express";
import { prisma } from "./db.js";
import {
  AiAdvancedError,
  checkSalesRisk,
  generateCustomerSalesSummary,
  generateFollowUpPlan,
  generateNextAction,
  generateSalesScript
} from "./ai-advanced-service.js";

type AiAdvancedDb = typeof prisma;

export function createAiAdvancedRouter(db: AiAdvancedDb = prisma) {
  const router = Router();

  router.post("/next-action", async (req, res, next) => {
    try {
      res.json(await generateNextAction(db, req.user!, req.body));
    } catch (error) {
      handleAiAdvancedError(error, res, next);
    }
  });

  router.post("/customer-sales-summary", async (req, res, next) => {
    try {
      res.json(await generateCustomerSalesSummary(db, req.user!, req.body));
    } catch (error) {
      handleAiAdvancedError(error, res, next);
    }
  });

  router.post("/sales-script", async (req, res, next) => {
    try {
      res.json(await generateSalesScript(db, req.user!, req.body));
    } catch (error) {
      handleAiAdvancedError(error, res, next);
    }
  });

  router.post("/risk-check", async (req, res, next) => {
    try {
      res.json(await checkSalesRisk(db, req.user!, req.body));
    } catch (error) {
      handleAiAdvancedError(error, res, next);
    }
  });

  router.post("/follow-up-plan", async (req, res, next) => {
    try {
      res.json(await generateFollowUpPlan(db, req.user!, req.body));
    } catch (error) {
      handleAiAdvancedError(error, res, next);
    }
  });

  return router;
}

export const aiAdvancedRouter = createAiAdvancedRouter();

function handleAiAdvancedError(error: unknown, res: any, next: (error: unknown) => void) {
  if (error instanceof AiAdvancedError) {
    res.status(error.status).json({ message: error.message });
    return;
  }
  next(error);
}
