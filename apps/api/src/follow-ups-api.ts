import { Router } from "express";
import type { FollowUpListQuery, FollowUpStatus, FollowUpTaskType, FollowUpUpsertRequest } from "@wa-ai/shared";
import { prisma } from "./db.js";
import {
  buildDashboard,
  FOLLOW_UP_TASK_TYPES,
  generateRecommendedScript,
  getDayRange,
  serializeFollowUp,
  toFollowUpCreateData,
  toFollowUpUpdateData,
  validateFollowUpPayload
} from "./follow-up-utils.js";

type FollowUpDb = Pick<typeof prisma, "followUpTask" | "customer">;

export function createFollowUpsRouter(db: FollowUpDb = prisma) {
  const followUpsRouter = Router();

  followUpsRouter.get("/dashboard", async (req, res, next) => {
    try {
      const now = parseNow(req.query.now);
      const { start, end } = getDayRange(now);
      const ownerId = req.user!.id;

      const [today, overdue, future, quotedWithoutFollowUp, highIntent, recentCustomers] = await Promise.all([
        db.followUpTask.findMany({
          where: { ownerId, status: "pending", remindAt: { gte: start, lt: end } },
          include: { customer: true },
          orderBy: { remindAt: "asc" },
          take: 50
        }),
        db.followUpTask.findMany({
          where: { ownerId, status: "pending", remindAt: { lt: start } },
          include: { customer: true },
          orderBy: { remindAt: "asc" },
          take: 50
        }),
        db.followUpTask.findMany({
          where: { ownerId, status: "pending", remindAt: { gte: end } },
          include: { customer: true },
          orderBy: { remindAt: "asc" },
          take: 50
        }),
        db.customer.findMany({
          where: { ownerId, stage: "已报价", followUps: { none: { status: "pending" } } },
          orderBy: { updatedAt: "desc" },
          take: 50
        }),
        db.customer.findMany({
          where: { ownerId, tags: { has: "高意向" }, followUps: { none: { status: "pending" } } },
          orderBy: { updatedAt: "desc" },
          take: 50
        }),
        db.customer.findMany({
          where: { ownerId },
          orderBy: { createdAt: "desc" },
          take: 10
        })
      ]);

      res.json(buildDashboard({ today, overdue, future, quotedWithoutFollowUp, highIntent, recentCustomers }));
    } catch (error) {
      next(error);
    }
  });

  followUpsRouter.post("/script", (req, res) => {
    const taskType = req.body?.taskType;
    if (!taskType) {
      res.status(400).json({ message: "taskType is required" });
      return;
    }
    if (!FOLLOW_UP_TASK_TYPES.includes(taskType as FollowUpTaskType)) {
      res.status(400).json({ message: "taskType is invalid" });
      return;
    }
    res.json({
      taskType,
      recommendedScript: generateRecommendedScript(taskType as FollowUpTaskType),
      riskWarnings: [
        "跟进话术仅作为草稿，不会自动发送 WhatsApp 消息。",
        "涉及价格、库存、交期、运费、付款或物流状态时，请业务员确认后再发送。",
        "系统不编造价格、库存、交期、运费、折扣、付款条件或物流状态。"
      ]
    });
  });

  followUpsRouter.get("/", async (req, res, next) => {
    try {
      const query = req.query as FollowUpListQuery;
      const where: Record<string, unknown> = { ownerId: req.user!.id };
      if (query.customerId) {
        const customer = await findOwnedCustomer(db, query.customerId, req.user!.id);
        if (!customer) {
          res.status(404).json({ message: "customer not found" });
          return;
        }
        where.customerId = query.customerId;
      }
      if (query.status) where.status = query.status;
      if (query.scope === "today") {
        const { start, end } = getDayRange(parseNow(req.query.now));
        where.remindAt = { gte: start, lt: end };
        where.status = "pending";
      }
      if (query.scope === "overdue") {
        const { start } = getDayRange(parseNow(req.query.now));
        where.remindAt = { lt: start };
        where.status = "pending";
      }
      if (query.scope === "future") {
        const { end } = getDayRange(parseNow(req.query.now));
        where.remindAt = { gte: end };
        where.status = "pending";
      }
      if (query.scope === "pending") where.status = "pending";

      const tasks = await db.followUpTask.findMany({
        where,
        include: { customer: true },
        orderBy: { remindAt: "asc" },
        take: 100
      });
      res.json(tasks.map(serializeFollowUp));
    } catch (error) {
      next(error);
    }
  });

  followUpsRouter.post("/", async (req, res, next) => {
    try {
      const body = req.body as FollowUpUpsertRequest;
      const errors = validateFollowUpPayload(body);
      if (errors.length > 0) {
        res.status(400).json({ message: "表单校验失败", errors });
        return;
      }

      const customer = await findOwnedCustomer(db, body.customerId, req.user!.id);
      if (!customer) {
        res.status(404).json({ message: "customer not found" });
        return;
      }

      const task = await db.followUpTask.create({
        data: toFollowUpCreateData(body, req.user!.id),
        include: { customer: true }
      });
      res.status(201).json(serializeFollowUp(task));
    } catch (error) {
      next(error);
    }
  });

  followUpsRouter.get("/:id", async (req, res, next) => {
    try {
      const task = await findOwnedTask(db, req.params.id, req.user!.id);
      if (!task) {
        res.status(404).json({ message: "follow-up task not found" });
        return;
      }
      res.json(serializeFollowUp(task));
    } catch (error) {
      next(error);
    }
  });

  followUpsRouter.patch("/:id", async (req, res, next) => {
    try {
      const errors = validateFollowUpPayload(req.body, { partial: true });
      if (errors.length > 0) {
        res.status(400).json({ message: "表单校验失败", errors });
        return;
      }

      const existing = await findOwnedTask(db, req.params.id, req.user!.id);
      if (!existing) {
        res.status(404).json({ message: "follow-up task not found" });
        return;
      }

      if (req.body.customerId) {
        const customer = await findOwnedCustomer(db, req.body.customerId, req.user!.id);
        if (!customer) {
          res.status(404).json({ message: "customer not found" });
          return;
        }
      }

      const task = await db.followUpTask.update({
        where: { id: req.params.id },
        data: toFollowUpUpdateData(req.body),
        include: { customer: true }
      });
      res.json(serializeFollowUp(task));
    } catch (error) {
      next(error);
    }
  });

  followUpsRouter.post("/:id/complete", async (req, res, next) => {
    try {
      const task = await updateStatus(db, req.params.id, req.user!.id, "completed");
      if (!task) {
        res.status(404).json({ message: "follow-up task not found" });
        return;
      }
      res.json(serializeFollowUp(task));
    } catch (error) {
      next(error);
    }
  });

  followUpsRouter.post("/:id/cancel", async (req, res, next) => {
    try {
      const task = await updateStatus(db, req.params.id, req.user!.id, "cancelled");
      if (!task) {
        res.status(404).json({ message: "follow-up task not found" });
        return;
      }
      res.json(serializeFollowUp(task));
    } catch (error) {
      next(error);
    }
  });

  followUpsRouter.delete("/:id", async (req, res, next) => {
    try {
      const result = await db.followUpTask.deleteMany({ where: { id: req.params.id, ownerId: req.user!.id } });
      if (result.count === 0) {
        res.status(404).json({ message: "follow-up task not found" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return followUpsRouter;
}

export const followUpsRouter = createFollowUpsRouter();

async function findOwnedCustomer(db: FollowUpDb, customerId: string, ownerId: string) {
  return db.customer.findFirst({ where: { id: customerId, ownerId } });
}

async function findOwnedTask(db: FollowUpDb, taskId: string, ownerId: string) {
  return db.followUpTask.findFirst({
    where: { id: taskId, ownerId },
    include: { customer: true }
  });
}

async function updateStatus(db: FollowUpDb, taskId: string, ownerId: string, status: FollowUpStatus) {
  const existing = await findOwnedTask(db, taskId, ownerId);
  if (!existing) return null;
  return db.followUpTask.update({
    where: { id: taskId },
    data: { status, completedAt: status === "completed" ? new Date() : null },
    include: { customer: true }
  });
}

function parseNow(value: unknown) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? new Date(value) : new Date();
}
