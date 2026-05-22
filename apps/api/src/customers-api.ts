import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "./db.js";
import { writeAuditLog } from "./audit-log-utils.js";
import { calculateCustomerIntent, type IntentCustomer, type IntentCustomRequest, type IntentFollowUpTask, type IntentQuote, type IntentSampleOrder } from "./customer-intent-rules.js";
import {
  serializeCustomer,
  toCustomerCreateData,
  toCustomerUpdateData,
  validateCustomerPayload,
  normalizeStringArray
} from "./customer-utils.js";
import {
  canReadOrganization,
  canWriteOrganizationResource,
  getActiveOrganizationRole,
  organizationIdFromRequest
} from "./organization-permissions.js";
import { recordSecurityAudit, requireConfirm } from "./permissions.js";

type CustomerDb = Pick<typeof prisma, "customer"> & Partial<Pick<typeof prisma, "quote" | "followUpTask" | "sampleOrder" | "customRequest" | "organizationMember" | "customerAssignmentLog" | "customerDuplicateEventLog" | "auditLog">>;

export function createCustomersRouter(db: CustomerDb = prisma) {
  const customersRouter = Router();

customersRouter.get("/", async (req, res, next) => {
  try {
    const tag = cleanQuery(req.query.tag);
    const stage = cleanQuery(req.query.stage);
    const q = cleanQuery(req.query.q);
    const sort = cleanQuery(req.query.sort);
    const intentLevel = cleanQuery(req.query.intentLevel);
    const organizationId = organizationIdFromRequest(req);
    const role = organizationId ? await requireCustomerOrganizationAccess(db, organizationId, req.user!.id) : null;
    if (organizationId && !role) return res.status(403).json({ message: "organization membership required" });
    const where: Prisma.CustomerWhereInput = customerListWhere(req.user!.id, organizationId, role);

    if (tag) where.tags = { has: tag };
    if (stage) where.stage = stage;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { whatsappNumber: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { country: { contains: q, mode: "insensitive" } },
        { interestedProduct: { contains: q, mode: "insensitive" } },
        { latestSummary: { contains: q, mode: "insensitive" } }
      ];
    }

    const customers = await db.customer.findMany({
      where,
      orderBy: [{ nextFollowUpAt: "asc" }, { updatedAt: "desc" }],
      take: 100
    });

    const related = await findRelatedIntentData(db, req.user!.id, customers.map((customer) => customer.id));
    let response = customers.map((customer) => serializeCustomerWithIntent(customer, related));
    if (intentLevel) response = response.filter((customer) => customer.intentLevel === intentLevel);
    if (sort === "intentScore") {
      response = response.sort((left, right) => (right.intentScore || 0) - (left.intentScore || 0));
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
});

customersRouter.get("/:id/intent", async (req, res, next) => {
  try {
    const customer = await findCustomerForCurrentUser(db, req.params.id, req.user!.id);

    if (!customer) {
      res.status(404).json({ message: "customer not found" });
      return;
    }

    const related = await findRelatedIntentData(db, req.user!.id, [customer.id]);
    res.json(calculateCustomerIntent(customer, relatedForCustomer(related, customer.id)));
  } catch (error) {
    next(error);
  }
});

customersRouter.post("/check-duplicate", async (req, res, next) => {
  try {
    const organizationId = organizationIdFromRequest(req);
    const role = organizationId ? await requireCustomerOrganizationAccess(db, organizationId, req.user!.id) : null;
    if (organizationId && !role) return res.status(403).json({ message: "organization membership required" });
    const duplicate = await findDuplicateCustomer(db, {
      organizationId,
      ownerId: req.user!.id,
      whatsappNumber: cleanQuery(req.body?.whatsappNumber),
      email: cleanQuery(req.body?.email),
      socialLinks: normalizeStringArray(req.body?.socialLinks),
      excludeId: cleanQuery(req.body?.customerId)
    });

    if (duplicate) {
      await recordDuplicateEvent(db, {
        organizationId,
        ownerId: duplicate.customer.ownerId || req.user!.id,
        attemptedBy: req.user!.id,
        matchedCustomerId: duplicate.customer.id,
        fields: duplicate.fields,
        source: "api-check",
        action: "detected"
      });
    }

    res.json({
      hasDuplicate: Boolean(duplicate),
      matches: duplicate ? [duplicateToResponse(duplicate.customer, duplicate.fields)] : []
    });
  } catch (error) {
    next(error);
  }
});

customersRouter.post("/:id/recalculate-intent", async (req, res, next) => {
  try {
    const customer = await findCustomerForCurrentUser(db, req.params.id, req.user!.id);

    if (!customer) {
      res.status(404).json({ message: "customer not found" });
      return;
    }

    const related = await findRelatedIntentData(db, req.user!.id, [customer.id]);
    res.json(calculateCustomerIntent(customer, relatedForCustomer(related, customer.id)));
  } catch (error) {
    next(error);
  }
});

customersRouter.get("/:id", async (req, res, next) => {
  try {
    const customer = await findCustomerForCurrentUser(db, req.params.id, req.user!.id);

    if (!customer) {
      res.status(404).json({ message: "customer not found" });
      return;
    }

    const related = await findRelatedIntentData(db, req.user!.id, [customer.id]);
    res.json({
      ...serializeCustomerWithIntent(customer, related),
      assignmentLogs: await findAssignmentLogs(db, customer.id, customer.organizationId || "")
    });
  } catch (error) {
    next(error);
  }
});

customersRouter.post("/", async (req, res, next) => {
  try {
    const errors = validateCustomerPayload(req.body);
    if (errors.length > 0) {
      res.status(400).json({ message: "表单校验失败", errors });
      return;
    }
    const organizationId = organizationIdFromRequest(req);
    const role = organizationId ? await requireCustomerOrganizationAccess(db, organizationId, req.user!.id) : null;
    if (organizationId && !role) return res.status(403).json({ message: "organization membership required" });
    if (organizationId && role === "support") return res.status(403).json({ message: "support role is read-only for customers" });
    const requestedAssignedTo = cleanQuery(req.body?.assignedTo);
    const assignedTo = organizationId
      ? await resolveAssignedTo(db, organizationId, req.user!.id, requestedAssignedTo, role)
      : null;
    if (assignedTo === false) return res.status(400).json({ message: "assignedTo must be an active organization member" });
    const collaborators = organizationId ? await resolveCollaborators(db, organizationId, req.body?.collaborators || []) : [];
    if (collaborators === false) return res.status(400).json({ message: "collaborators must be active organization members" });
    const duplicate = await findDuplicateCustomer(db, {
      organizationId,
      ownerId: req.user!.id,
      whatsappNumber: cleanQuery(req.body?.whatsappNumber),
      email: cleanQuery(req.body?.email),
      socialLinks: normalizeStringArray(req.body?.socialLinks)
    });
    if (duplicate) {
      await recordDuplicateEvent(db, {
        organizationId,
        ownerId: duplicate.customer.ownerId || req.user!.id,
        attemptedBy: req.user!.id,
        matchedCustomerId: duplicate.customer.id,
        fields: duplicate.fields,
        source: "api-create",
        action: "blocked"
      });
      return res.status(409).json({
        message: "duplicate customer detected",
        duplicateFields: duplicate.fields,
        customerId: duplicate.customer.id,
        ownerId: duplicate.customer.ownerId,
        assignedTo: duplicate.customer.assignedTo || null,
        duplicateCustomer: duplicateToResponse(duplicate.customer, duplicate.fields)
      });
    }

    const customer = await db.customer.create({
      data: {
        ...toCustomerCreateData(req.body),
        ownerId: req.user!.id,
        organizationId: organizationId || null,
        assignedTo: assignedTo || null,
        collaborators: collaborators || []
      }
    });
    await writeAuditLog(db, { organizationId: customer.organizationId, userId: req.user!.id, action: "create", entityType: "Customer", entityId: customer.id, before: null, after: customer });

    res.status(201).json(serializeCustomer(customer));
  } catch (error) {
    next(error);
  }
});

customersRouter.patch("/:id", async (req, res, next) => {
  try {
    const errors = validateCustomerPayload(req.body, { partial: true });
    if (errors.length > 0) {
      res.status(400).json({ message: "表单校验失败", errors });
      return;
    }

    const existing = await findCustomerForCurrentUser(db, req.params.id, req.user!.id);

    if (!existing) {
      res.status(404).json({ message: "customer not found" });
      return;
    }
    const orgRole = existing.organizationId ? await getActiveOrganizationRole(db as any, existing.organizationId, req.user!.id) : null;
    if (!canModifyCustomer(existing, req.user!.id, orgRole)) {
      res.status(403).json({ message: "customer write permission required" });
      return;
    }
    const duplicate = await findDuplicateCustomer(db, {
      organizationId: existing.organizationId || "",
      ownerId: req.user!.id,
      whatsappNumber: req.body?.whatsappNumber === undefined ? "" : cleanQuery(req.body?.whatsappNumber),
      email: req.body?.email === undefined ? "" : cleanQuery(req.body?.email),
      socialLinks: req.body?.socialLinks === undefined ? [] : normalizeStringArray(req.body?.socialLinks),
      excludeId: existing.id
    });
    if (duplicate) {
      await recordDuplicateEvent(db, {
        organizationId: existing.organizationId || "",
        ownerId: duplicate.customer.ownerId || req.user!.id,
        attemptedBy: req.user!.id,
        matchedCustomerId: duplicate.customer.id,
        fields: duplicate.fields,
        source: "api-update",
        action: "blocked"
      });
      return res.status(409).json({
        message: "duplicate customer detected",
        duplicateFields: duplicate.fields,
        customerId: duplicate.customer.id,
        ownerId: duplicate.customer.ownerId,
        assignedTo: duplicate.customer.assignedTo || null,
        duplicateCustomer: duplicateToResponse(duplicate.customer, duplicate.fields)
      });
    }
    const extraData: Record<string, unknown> = {};
    if (existing.organizationId && req.body?.collaborators !== undefined) {
      if (!canWriteOrganizationResource(orgRole)) return res.status(403).json({ message: "owner or manager role required" });
      const collaborators = await resolveCollaborators(db, existing.organizationId, req.body.collaborators);
      if (collaborators === false) return res.status(400).json({ message: "collaborators must be active organization members" });
      extraData.collaborators = collaborators;
    }

    const customer = await db.customer.update({
      where: { id: req.params.id },
      data: { ...toCustomerUpdateData(req.body), ...extraData }
    });
    await writeAuditLog(db, { organizationId: existing.organizationId, userId: req.user!.id, action: "update", entityType: "Customer", entityId: customer.id, before: existing, after: customer });

    res.json(serializeCustomer(customer));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      res.status(404).json({ message: "customer not found" });
      return;
    }
    next(error);
  }
});

customersRouter.delete("/:id", async (req, res, next) => {
  try {
    const existing = await findCustomerForCurrentUser(db, req.params.id, req.user!.id);
    if (!existing) {
      res.status(404).json({ message: "customer not found" });
      return;
    }
    const orgRole = existing.organizationId ? await getActiveOrganizationRole(db as any, existing.organizationId, req.user!.id) : null;
    if (!canModifyCustomer(existing, req.user!.id, orgRole)) {
      res.status(403).json({ message: "customer write permission required" });
      return;
    }
    const confirmError = requireConfirm(req, existing.organizationId && canWriteOrganizationResource(orgRole) ? "customer.deleteTeam" : "customer.deleteOwn");
    if (confirmError) {
      await recordSecurityAudit(db as any, req, { organizationId: existing.organizationId, action: "confirm_required", entityType: "Customer", entityId: existing.id, riskLevel: "high", metadata: { confirmRequired: true } });
      return res.status(409).json(confirmError);
    }
    await db.customer.delete({ where: { id: req.params.id } });
    await writeAuditLog(db, { organizationId: existing.organizationId, userId: req.user!.id, action: "delete", entityType: "Customer", entityId: existing.id, before: existing, after: null, riskLevel: "high", metadata: { confirmed: true } });
    res.status(204).send();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      res.status(404).json({ message: "customer not found" });
      return;
    }
    next(error);
  }
});

customersRouter.post("/:id/assign", async (req, res, next) => {
  try {
    const customer = await findCustomerForCurrentUser(db, req.params.id, req.user!.id);
    if (!customer || !customer.organizationId) {
      res.status(404).json({ message: "customer not found" });
      return;
    }
    const role = await getActiveOrganizationRole(db as any, customer.organizationId, req.user!.id);
    if (!canWriteOrganizationResource(role)) {
      res.status(403).json({ message: "owner or manager role required" });
      return;
    }
    const assignedTo = cleanQuery(req.body?.assignedTo);
    if (!assignedTo || !(await isActiveOrganizationMember(db, customer.organizationId, assignedTo))) {
      res.status(400).json({ message: "assignedTo must be an active organization member" });
      return;
    }
    const updated = await db.customer.update({
      where: { id: customer.id },
      data: { assignedTo }
    });
    await db.customerAssignmentLog?.create({
      data: {
        customerId: customer.id,
        organizationId: customer.organizationId,
        fromUserId: customer.assignedTo || null,
        toUserId: assignedTo,
        operatedBy: req.user!.id,
        note: cleanQuery(req.body?.note) || null
      }
    });
    await writeAuditLog(db, { organizationId: customer.organizationId, userId: req.user!.id, action: "update", entityType: "Customer", entityId: customer.id, before: customer, after: updated, metadata: { operation: "assign", fromUserId: customer.assignedTo || null, toUserId: assignedTo } });
    res.json({
      ...serializeCustomer(updated),
      assignmentLogs: await findAssignmentLogs(db, customer.id, customer.organizationId)
    });
  } catch (error) {
    next(error);
  }
});

  return customersRouter;
}

export const customersRouter = createCustomersRouter();

function cleanQuery(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function customerListWhere(userId: string, organizationId: string, role: string | null): Prisma.CustomerWhereInput {
  if (!organizationId) return { ownerId: userId };
  const base: Prisma.CustomerWhereInput = { organizationId };
  if (canWriteOrganizationResource(role as any)) return base;
  return {
    ...base,
    OR: [
      { ownerId: userId },
      { assignedTo: userId },
      { collaborators: { has: userId } }
    ]
  };
}

async function requireCustomerOrganizationAccess(db: CustomerDb, organizationId: string, userId: string) {
  if (!db.organizationMember) return null;
  const role = await getActiveOrganizationRole(db as any, organizationId, userId);
  return canReadOrganization(role) ? role : null;
}

async function findCustomerForCurrentUser(db: CustomerDb, id: string, userId: string) {
  const customer = await db.customer.findFirst({ where: { id } }) as any;
  if (!customer) return null;
  if (!customer.organizationId) return customer.ownerId === userId ? customer : null;
  const role = await getActiveOrganizationRole(db as any, customer.organizationId, userId);
  if (canWriteOrganizationResource(role)) return customer;
  if (customer.ownerId === userId || customer.assignedTo === userId || (customer.collaborators || []).includes(userId)) return customer;
  return null;
}

function canModifyCustomer(customer: any, userId: string, role: string | null) {
  if (!customer.organizationId) return customer.ownerId === userId;
  if (canWriteOrganizationResource(role as any)) return true;
  if (role === "sales") return customer.ownerId === userId || customer.assignedTo === userId;
  return false;
}

async function isActiveOrganizationMember(db: CustomerDb, organizationId: string, userId: string) {
  if (!db.organizationMember) return false;
  const member = await db.organizationMember.findFirst({ where: { organizationId, userId, status: "active" } });
  return Boolean(member);
}

async function resolveAssignedTo(db: CustomerDb, organizationId: string, currentUserId: string, requestedAssignedTo: string, role: string | null) {
  const assignedTo = requestedAssignedTo || currentUserId;
  if (assignedTo !== currentUserId && !canWriteOrganizationResource(role as any)) return false;
  return (await isActiveOrganizationMember(db, organizationId, assignedTo)) ? assignedTo : false;
}

async function resolveCollaborators(db: CustomerDb, organizationId: string, value: unknown) {
  const ids = Array.isArray(value) ? value.map((item) => cleanQuery(item)).filter(Boolean) : [];
  for (const id of ids) {
    if (!(await isActiveOrganizationMember(db, organizationId, id))) return false;
  }
  return Array.from(new Set(ids));
}

async function findDuplicateCustomer(
  db: CustomerDb,
  options: { organizationId?: string; ownerId: string; whatsappNumber?: string; email?: string; socialLinks?: string[]; excludeId?: string }
) {
  const fields: string[] = [];
  const OR: Prisma.CustomerWhereInput[] = [];
  if (options.whatsappNumber) {
    fields.push("whatsappNumber");
    OR.push({ whatsappNumber: options.whatsappNumber });
  }
  if (options.email) {
    fields.push("email");
    OR.push({ email: options.email });
  }
  const socialLinks = normalizeStringArray(options.socialLinks);
  if (socialLinks.length) {
    fields.push("socialLinks");
    OR.push({ socialLinks: { hasSome: socialLinks } });
  }
  if (!OR.length) return null;
  const where: Prisma.CustomerWhereInput = options.organizationId
    ? { organizationId: options.organizationId, OR }
    : { ownerId: options.ownerId, OR };
  if (options.excludeId) where.NOT = { id: options.excludeId };
  const customer = await db.customer.findFirst({ where });
  if (!customer) return null;
  const matchedFields = fields.filter((field) => {
    if (field === "whatsappNumber") return customer.whatsappNumber === options.whatsappNumber;
    if (field === "email") return customer.email === options.email;
    if (field === "socialLinks") return socialLinks.some((link) => (customer.socialLinks || []).includes(link));
    return false;
  });
  return { customer, fields: matchedFields.length ? matchedFields : fields };
}

function duplicateToResponse(customer: any, fields: string[]) {
  return {
    customerId: customer.id,
    name: customer.name,
    ownerId: customer.ownerId || null,
    assignedTo: customer.assignedTo || null,
    organizationId: customer.organizationId || null,
    matchedFields: fields
  };
}

async function recordDuplicateEvent(
  db: CustomerDb,
  data: { organizationId?: string | null; ownerId: string; attemptedBy: string; matchedCustomerId: string; fields: string[]; source: string; action: string }
) {
  await db.customerDuplicateEventLog?.create({
    data: {
      organizationId: data.organizationId || null,
      ownerId: data.ownerId,
      attemptedBy: data.attemptedBy,
      matchedCustomerId: data.matchedCustomerId,
      fields: data.fields,
      source: data.source,
      action: data.action
    }
  });
}

async function findAssignmentLogs(db: CustomerDb, customerId: string, organizationId: string) {
  if (!organizationId || !db.customerAssignmentLog) return [];
  const logs = await db.customerAssignmentLog.findMany({
    where: { customerId, organizationId },
    orderBy: { createdAt: "desc" },
    take: 50
  });
  return logs.map((log: any) => ({
    id: log.id,
    customerId: log.customerId,
    organizationId: log.organizationId,
    fromUserId: log.fromUserId,
    toUserId: log.toUserId,
    operatedBy: log.operatedBy,
    note: log.note,
    createdAt: log.createdAt instanceof Date ? log.createdAt.toISOString() : String(log.createdAt)
  }));
}

type RelatedIntentData = {
  quotes: IntentQuote[];
  followUps: IntentFollowUpTask[];
  sampleOrders: IntentSampleOrder[];
  customRequests: IntentCustomRequest[];
};

async function findRelatedIntentData(db: CustomerDb, ownerId: string, customerIds: string[]): Promise<RelatedIntentData> {
  if (customerIds.length === 0) return { quotes: [], followUps: [], sampleOrders: [], customRequests: [] };
  const [quotes, followUps, sampleOrders, customRequests] = await Promise.all([
    db.quote
      ? db.quote.findMany({ where: { ownerId, customerId: { in: customerIds } } })
      : Promise.resolve([]),
    db.followUpTask
      ? db.followUpTask.findMany({ where: { ownerId, customerId: { in: customerIds } } })
      : Promise.resolve([]),
    db.sampleOrder
      ? db.sampleOrder.findMany({ where: { ownerId, customerId: { in: customerIds } } })
      : Promise.resolve([]),
    db.customRequest
      ? db.customRequest.findMany({ where: { ownerId, customerId: { in: customerIds } } })
      : Promise.resolve([])
  ]);
  return { quotes, followUps, sampleOrders, customRequests };
}

function relatedForCustomer(related: RelatedIntentData, customerId: string) {
  return {
    quotes: related.quotes.filter((quote) => quote.customerId === customerId),
    followUps: related.followUps.filter((task) => task.customerId === customerId),
    sampleOrders: related.sampleOrders.filter((sample) => sample.customerId === customerId),
    customRequests: related.customRequests.filter((item) => item.customerId === customerId)
  };
}

function serializeCustomerWithIntent(customer: IntentCustomer & Parameters<typeof serializeCustomer>[0], related: RelatedIntentData) {
  const intent = calculateCustomerIntent(customer, relatedForCustomer(related, customer.id));
  return {
    ...serializeCustomer(customer),
    intentScore: intent.intentScore,
    intentLevel: intent.intentLevel,
    recommendedAction: intent.recommendedAction
  };
}
