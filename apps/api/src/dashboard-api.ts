import { Router } from "express";
import type { TeamDashboardCustomer, TeamDashboardSummary } from "@wa-ai/shared";
import { prisma } from "./db.js";
import { calculateCustomerIntent, type IntentCustomRequest, type IntentFollowUpTask, type IntentQuote, type IntentSampleOrder } from "./customer-intent-rules.js";
import { serializeCustomer } from "./customer-utils.js";
import { canReadOrganization, canWriteOrganizationResource, getActiveOrganizationRole, organizationIdFromRequest } from "./organization-permissions.js";

type DashboardDb = Pick<typeof prisma, "customer" | "quote" | "followUpTask"> &
  Partial<Pick<typeof prisma, "sampleOrder" | "customRequest" | "organizationMember">>;

export function createDashboardRouter(db: DashboardDb = prisma) {
  const dashboardRouter = Router();

  dashboardRouter.get("/team-summary", async (req, res, next) => {
    try {
      const organizationId = organizationIdFromRequest(req);
      const role = await requireTeamDashboardAccess(db, organizationId, req.user!.id);
      if (!role) {
        res.status(403).json({ message: "owner or manager role required" });
        return;
      }

      const now = parseNow(req.query.now);
      const summary = await buildTeamDashboardSummary(db, organizationId, now);
      if (req.query.format === "csv") {
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="team-summary-${new Date().toISOString().slice(0, 10)}.csv"`);
        res.send(teamSummaryToCsv(summary));
        return;
      }
      res.json(summary);
    } catch (error) {
      next(error);
    }
  });

  dashboardRouter.get("/high-intent-customers", async (req, res, next) => {
    try {
      const organizationId = organizationIdFromRequest(req);
      if (organizationId) {
        const role = await requireTeamDashboardAccess(db, organizationId, req.user!.id);
        if (!role) {
          res.status(403).json({ message: "owner or manager role required" });
          return;
        }
        const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
        const summary = await buildTeamDashboardSummary(db, organizationId, parseNow(req.query.now), limit);
        res.json(summary.highIntentCustomers);
        return;
      }

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

async function requireTeamDashboardAccess(db: DashboardDb, organizationId: string, userId: string) {
  if (!organizationId || !db.organizationMember) return null;
  const role = await getActiveOrganizationRole(db as any, organizationId, userId);
  return canWriteOrganizationResource(role) ? role : null;
}

async function buildTeamDashboardSummary(db: DashboardDb, organizationId: string, now: Date, highIntentLimit = 10): Promise<TeamDashboardSummary> {
  const { start, end } = getDayRange(now);
  const customers = await db.customer.findMany({
    where: { organizationId },
    orderBy: { updatedAt: "desc" },
    take: 500
  });
  const customerIds = customers.map((customer) => customer.id);
  const [quotes, followUps, sampleOrders, customRequests, members] = await Promise.all([
    db.quote.findMany({ where: { customerId: { in: customerIds } } }),
    db.followUpTask.findMany({ where: { customerId: { in: customerIds } } }),
    db.sampleOrder ? db.sampleOrder.findMany({ where: { customerId: { in: customerIds } } }) : Promise.resolve([]),
    db.customRequest ? db.customRequest.findMany({ where: { customerId: { in: customerIds } } }) : Promise.resolve([]),
    db.organizationMember
      ? db.organizationMember.findMany({
          where: { organizationId, status: "active" },
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: "asc" }
        } as any)
      : Promise.resolve([])
  ]);

  const intentCustomers = customers.map((customer) => {
    const intent = calculateCustomerIntent(customer, relatedForCustomer(customer.id, quotes, followUps, sampleOrders, customRequests, now));
    return {
      customer,
      intent
    };
  });
  const pendingFollowUps = followUps.filter((task) => task.status === "pending");
  const pendingCustomerIds = new Set(pendingFollowUps.map((task) => task.customerId));
  const quotedCustomerIds = new Set(quotes.map((quote) => quote.customerId));

  return {
    organizationId,
    generatedAt: now.toISOString(),
    kpis: {
      todayNewCustomers: customers.filter((customer) => customer.createdAt >= start && customer.createdAt < end).length,
      todayFollowUpCustomers: new Set(pendingFollowUps.filter((task) => task.remindAt >= start && task.remindAt < end).map((task) => task.customerId)).size,
      overdueFollowUpCustomers: new Set(pendingFollowUps.filter((task) => task.remindAt < start).map((task) => task.customerId)).size,
      highIntentCustomers: intentCustomers.filter((item) => item.intent.intentLevel === "high").length,
      quotedNoFollowUpCustomers: customers.filter((customer) => quotedCustomerIds.has(customer.id) && !pendingCustomerIds.has(customer.id)).length
    },
    memberStats: members.map((member: any) => {
      const userId = member.userId;
      const memberCustomerIds = new Set(customers.filter((customer) => (customer.assignedTo || customer.ownerId) === userId).map((customer) => customer.id));
      return {
        userId,
        userName: member.user?.name || null,
        userEmail: member.user?.email || null,
        role: member.role,
        status: member.status,
        customerCount: memberCustomerIds.size,
        completedFollowUps: followUps.filter((task) => task.status === "completed" && task.ownerId === userId).length,
        quoteCount: quotes.filter((quote) => quote.createdBy === userId || quote.ownerId === userId).length
      };
    }),
    highIntentCustomers: intentCustomers
      .filter((item) => item.intent.intentLevel === "high")
      .sort((left, right) => right.intent.intentScore - left.intent.intentScore)
      .slice(0, highIntentLimit)
      .map(({ customer, intent }) => sanitizeTeamCustomer(customer, intent))
  };
}

function relatedForCustomer(customerId: string, quotes: any[], followUps: any[], sampleOrders: any[], customRequests: any[], now: Date) {
  return {
    quotes: quotes.filter((quote) => quote.customerId === customerId) as IntentQuote[],
    followUps: followUps.filter((task) => task.customerId === customerId) as IntentFollowUpTask[],
    sampleOrders: sampleOrders.filter((sample) => sample.customerId === customerId) as IntentSampleOrder[],
    customRequests: customRequests.filter((item) => item.customerId === customerId) as IntentCustomRequest[],
    now
  };
}

function sanitizeTeamCustomer(customer: any, intent: ReturnType<typeof calculateCustomerIntent>): TeamDashboardCustomer {
  return {
    id: customer.id,
    name: customer.name,
    tags: customer.tags || [],
    stage: customer.stage,
    assignedTo: customer.assignedTo || null,
    ownerId: customer.ownerId || null,
    intentScore: intent.intentScore,
    intentLevel: intent.intentLevel,
    recommendedAction: intent.recommendedAction
  };
}

function getDayRange(now: Date) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function parseNow(value: unknown) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? new Date(value) : new Date();
}

function teamSummaryToCsv(summary: TeamDashboardSummary) {
  const lines = [
    ["section", "metric", "value"],
    ["kpi", "todayNewCustomers", summary.kpis.todayNewCustomers],
    ["kpi", "todayFollowUpCustomers", summary.kpis.todayFollowUpCustomers],
    ["kpi", "overdueFollowUpCustomers", summary.kpis.overdueFollowUpCustomers],
    ["kpi", "highIntentCustomers", summary.kpis.highIntentCustomers],
    ["kpi", "quotedNoFollowUpCustomers", summary.kpis.quotedNoFollowUpCustomers],
    ["member", "userId", "userName", "role", "customerCount", "completedFollowUps", "quoteCount"],
    ...summary.memberStats.map((member) => ["member", member.userId, member.userName || "", member.role, member.customerCount, member.completedFollowUps, member.quoteCount]),
    ["highIntent", "customerId", "name", "stage", "intentScore", "recommendedAction"],
    ...summary.highIntentCustomers.map((customer) => ["highIntent", customer.id, customer.name, customer.stage, customer.intentScore, customer.recommendedAction])
  ];
  return lines.map((row) => row.map(csvCell).join(",")).join("\n");
}

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}
