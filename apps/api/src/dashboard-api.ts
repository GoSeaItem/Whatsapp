import { Router } from "express";
import { prisma } from "./db.js";
import { calculateCustomerIntent, type IntentCustomRequest, type IntentFollowUpTask, type IntentQuote, type IntentSampleOrder } from "./customer-intent-rules.js";
import { serializeCustomer } from "./customer-utils.js";

type DashboardDb = Pick<typeof prisma, "customer" | "quote" | "followUpTask"> & Partial<Pick<typeof prisma, "sampleOrder" | "customRequest">>;

export function createDashboardRouter(db: DashboardDb = prisma) {
  const dashboardRouter = Router();

  dashboardRouter.get("/high-intent-customers", async (req, res, next) => {
    try {
      const ownerId = req.user!.id;
      const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
      const customers = await db.customer.findMany({
        where: { ownerId },
        orderBy: { updatedAt: "desc" },
        take: 200
      });
      const customerIds = customers.map((customer) => customer.id);
      const [quotes, followUps, sampleOrders, customRequests] = await Promise.all([
        db.quote.findMany({ where: { ownerId, customerId: { in: customerIds } } }),
        db.followUpTask.findMany({ where: { ownerId, customerId: { in: customerIds } } }),
        db.sampleOrder ? db.sampleOrder.findMany({ where: { ownerId, customerId: { in: customerIds } } }) : Promise.resolve([]),
        db.customRequest ? db.customRequest.findMany({ where: { ownerId, customerId: { in: customerIds } } }) : Promise.resolve([])
      ]);

      const response = customers
        .map((customer) => {
          const intent = calculateCustomerIntent(customer, {
            quotes: quotes.filter((quote) => quote.customerId === customer.id) as IntentQuote[],
            followUps: followUps.filter((task) => task.customerId === customer.id) as IntentFollowUpTask[],
            sampleOrders: sampleOrders.filter((sample) => sample.customerId === customer.id) as IntentSampleOrder[],
            customRequests: customRequests.filter((item) => item.customerId === customer.id) as IntentCustomRequest[]
          });
          return {
            ...serializeCustomer(customer),
            intentScore: intent.intentScore,
            intentLevel: intent.intentLevel,
            recommendedAction: intent.recommendedAction
          };
        })
        .filter((customer) => customer.intentLevel === "high")
        .sort((left, right) => right.intentScore - left.intentScore)
        .slice(0, limit);

      res.json(response);
    } catch (error) {
      next(error);
    }
  });

  return dashboardRouter;
}

export const dashboardRouter = createDashboardRouter();
