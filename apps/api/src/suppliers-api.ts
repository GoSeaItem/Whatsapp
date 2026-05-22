import { Router } from "express";
import { prisma } from "./db.js";
import { writeAuditLog } from "./audit-log-utils.js";
import { canReadOrganization, canWriteOrganizationResource, getActiveOrganizationRole, organizationIdFromRequest } from "./organization-permissions.js";
import { hasPermission, requireConfirm } from "./permissions.js";
import { calculateOrderProfit, toOrderCostData } from "./profit-utils.js";
import { resolveBrandContext } from "./brands-api.js";
import {
  clean,
  decimalString,
  generateSupplierScript,
  nullableString,
  serializePurchaseNote,
  serializeSupplier,
  serializeSupplierContact,
  serializeSupplierLink,
  serializeSupplierQuote,
  serializeSupplierRisk,
  toPurchaseNoteData,
  toSupplierContactData,
  toSupplierData,
  toSupplierQuoteData,
  toSupplierRiskData,
  validatePurchaseNotePayload,
  validateSupplierContactPayload,
  validateSupplierLinkPayload,
  validateSupplierPayload,
  validateSupplierQuotePayload,
  validateSupplierRiskPayload,
  validateSupplierScriptScenario
} from "./supplier-utils.js";

type SupplierDb = typeof prisma;

export function createSuppliersRouter(db: SupplierDb = prisma) {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const { organizationId, role } = await supplierListContext(db, req);
      const where: any = {
        ...supplierScope(req.user!.id, organizationId, role),
        ...filterField(req.query.status, "status"),
        ...filterField(req.query.riskLevel, "riskLevel"),
        ...filterField(req.query.country, "country"),
        ...filterField(req.query.city, "city")
      };
      const tag = clean(req.query.tag);
      if (tag) where.tags = { has: tag };
      const keyword = clean(req.query.keyword);
      if (keyword) {
        where.OR = [
          { name: { contains: keyword, mode: "insensitive" } },
          { contactName: { contains: keyword, mode: "insensitive" } },
          { phone: { contains: keyword, mode: "insensitive" } },
          { email: { contains: keyword, mode: "insensitive" } },
          { whatsapp: { contains: keyword, mode: "insensitive" } },
          { wechat: { contains: keyword, mode: "insensitive" } },
          { notes: { contains: keyword, mode: "insensitive" } }
        ];
      }
      const page = Math.max(Number(req.query.page) || 1, 1);
      const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 50, 1), 100);
      const rows = await (db as any).supplier.findMany({ where, orderBy: [{ updatedAt: "desc" }], skip: (page - 1) * pageSize, take: pageSize });
      const redactSensitive = organizationId ? !hasPermission(role as any, "supplier.viewSensitiveContact") : false;
      res.json(rows.map((row: any) => serializeSupplier(row, { redactSensitive })));
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      const errors = validateSupplierPayload(req.body);
      if (errors.length) return res.status(400).json({ message: "validation failed", errors });
      const organizationId = nullableString(req.body.organizationId);
      const role = organizationId ? await getActiveOrganizationRole(db as any, organizationId, req.user!.id) : null;
      if (organizationId && !hasPermission(role as any, "supplier.create")) return res.status(403).json({ message: "supplier create permission required" });
      await assertSupplierDuplicateFree(db, organizationId, req.body);
      const row = await (db as any).supplier.create({ data: toSupplierData({ ...req.body, organizationId }, req.user!.id) });
      await audit(db, req.user!.id, row.organizationId, "create", "Supplier", row.id, null, row, { operation: "supplier_create" });
      res.status(201).json(serializeSupplier(row));
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const found = await findAccessibleSupplier(db, req.user!.id, req.params.id, "view");
      if (!found) return res.status(404).json({ message: "supplier not found" });
      const [contacts, quotes, risks, purchaseNotes, links] = await Promise.all([
        (db as any).supplierContact.findMany({ where: { supplierId: found.id }, orderBy: { updatedAt: "desc" } }),
        (db as any).supplierQuote.findMany({ where: { supplierId: found.id }, orderBy: { updatedAt: "desc" } }),
        (db as any).supplierRisk.findMany({ where: { supplierId: found.id }, orderBy: { updatedAt: "desc" } }),
        (db as any).purchaseNote.findMany({ where: { supplierId: found.id }, orderBy: { updatedAt: "desc" } }),
        (db as any).supplierLink.findMany({ where: { supplierId: found.id }, orderBy: { createdAt: "desc" } })
      ]);
      const role = found.organizationId ? await getActiveOrganizationRole(db as any, found.organizationId, req.user!.id) : null;
      const redactSensitive = found.organizationId ? !hasPermission(role as any, "supplier.viewSensitiveContact") : false;
      res.json({
        ...serializeSupplier(found, { redactSensitive }),
        contacts: contacts.map((row: any) => serializeSupplierContact(row, { redactSensitive })),
        quotes: quotes.map(serializeSupplierQuote),
        risks: risks.map(serializeSupplierRisk),
        purchaseNotes: purchaseNotes.map(serializePurchaseNote),
        links: links.map(serializeSupplierLink)
      });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id", async (req, res, next) => {
    try {
      const errors = validateSupplierPayload(req.body, { partial: true });
      if (errors.length) return res.status(400).json({ message: "validation failed", errors });
      const existing = await findAccessibleSupplier(db, req.user!.id, req.params.id, "update");
      if (!existing) return res.status(404).json({ message: "supplier not found" });
      if ((req.body.status === "blocked" && existing.status !== "blocked") || (req.body.riskLevel === "high" && existing.riskLevel !== "high")) {
        const confirmError = requireConfirm(req, "supplier.update");
        if (confirmError) return res.status(409).json(confirmError);
      }
      const updated = await (db as any).supplier.update({ where: { id: existing.id }, data: toSupplierData(req.body, req.user!.id, existing) });
      await audit(db, req.user!.id, updated.organizationId, "update", "Supplier", updated.id, existing, updated, { operation: "supplier_update" }, riskForSupplierChange(existing, updated));
      res.json(serializeSupplier(updated));
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", async (req, res, next) => {
    try {
      const existing = await findAccessibleSupplier(db, req.user!.id, req.params.id, "delete");
      if (!existing) return res.status(404).json({ message: "supplier not found" });
      const confirmError = requireConfirm(req, "supplier.delete");
      if (confirmError) return res.status(409).json(confirmError);
      const updated = await (db as any).supplier.update({ where: { id: existing.id }, data: { status: "inactive" } });
      await audit(db, req.user!.id, updated.organizationId, "delete", "Supplier", updated.id, existing, updated, { operation: "supplier_deactivate", confirmed: true }, "high");
      res.json(serializeSupplier(updated));
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id/contacts", async (req, res, next) => {
    try {
      const supplier = await findAccessibleSupplier(db, req.user!.id, req.params.id, "view");
      if (!supplier) return res.status(404).json({ message: "supplier not found" });
      const role = supplier.organizationId ? await getActiveOrganizationRole(db as any, supplier.organizationId, req.user!.id) : null;
      const redactSensitive = supplier.organizationId ? !hasPermission(role as any, "supplier.viewSensitiveContact") : false;
      const rows = await (db as any).supplierContact.findMany({ where: { supplierId: supplier.id }, orderBy: { updatedAt: "desc" } });
      res.json(rows.map((row: any) => serializeSupplierContact(row, { redactSensitive })));
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/contacts", async (req, res, next) => {
    try {
      const errors = validateSupplierContactPayload(req.body);
      if (errors.length) return res.status(400).json({ message: "validation failed", errors });
      const supplier = await findAccessibleSupplier(db, req.user!.id, req.params.id, "update");
      if (!supplier) return res.status(404).json({ message: "supplier not found" });
      const row = await (db as any).supplierContact.create({ data: toSupplierContactData(req.body, supplier, req.user!.id) });
      await audit(db, req.user!.id, supplier.organizationId, "create", "SupplierContact", row.id, null, row, { operation: "supplier_contact_create", supplierId: supplier.id });
      res.status(201).json(serializeSupplierContact(row));
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/link", async (req, res, next) => {
    try {
      const supplier = await findAccessibleSupplier(db, req.user!.id, req.params.id, "update");
      if (!supplier) return res.status(404).json({ message: "supplier not found" });
      const errors = validateSupplierLinkPayload(req.body);
      if (errors.length) return res.status(400).json({ message: "validation failed", errors });
      await assertAccessibleEntity(db, req.user!.id, supplier.organizationId, clean(req.body.entityType), clean(req.body.entityId));
      const row = await (db as any).supplierLink.create({
        data: { organizationId: supplier.organizationId || null, supplierId: supplier.id, entityType: clean(req.body.entityType), entityId: clean(req.body.entityId), relationType: clean(req.body.relationType), createdBy: req.user!.id }
      });
      await audit(db, req.user!.id, supplier.organizationId, "create", "SupplierLink", row.id, null, row, { operation: "supplier_link_create", supplierId: supplier.id }, "medium");
      res.status(201).json(serializeSupplierLink(row));
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export function createSupplierContactsRouter(db: SupplierDb = prisma) {
  const router = Router();
  router.patch("/:id", async (req, res, next) => {
    try {
      const errors = validateSupplierContactPayload(req.body, { partial: true });
      if (errors.length) return res.status(400).json({ message: "validation failed", errors });
      const existing = await findAccessibleContact(db, req.user!.id, req.params.id, "update");
      if (!existing) return res.status(404).json({ message: "supplier contact not found" });
      const updated = await (db as any).supplierContact.update({ where: { id: existing.id }, data: toSupplierContactData(req.body, existing.supplier, req.user!.id, existing) });
      await audit(db, req.user!.id, updated.organizationId, "update", "SupplierContact", updated.id, existing, updated, { operation: "supplier_contact_update", supplierId: updated.supplierId });
      res.json(serializeSupplierContact(updated));
    } catch (error) {
      next(error);
    }
  });
  router.delete("/:id", async (req, res, next) => {
    try {
      const existing = await findAccessibleContact(db, req.user!.id, req.params.id, "update");
      if (!existing) return res.status(404).json({ message: "supplier contact not found" });
      const confirmError = requireConfirm(req, "supplier.update");
      if (confirmError) return res.status(409).json(confirmError);
      await (db as any).supplierContact.delete({ where: { id: existing.id } });
      await audit(db, req.user!.id, existing.organizationId, "delete", "SupplierContact", existing.id, existing, null, { operation: "supplier_contact_delete", confirmed: true }, "medium");
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });
  return router;
}

export function createSupplierQuotesRouter(db: SupplierDb = prisma) {
  const router = Router();
  router.get("/", async (req, res, next) => {
    try {
      const supplierId = clean(req.query.supplierId);
      const supplier = supplierId ? await findAccessibleSupplier(db, req.user!.id, supplierId, "view") : null;
      if (supplierId && !supplier) return res.status(404).json({ message: "supplier not found" });
      const where: any = supplier ? { supplierId: supplier.id } : await quoteListScope(db, req);
      Object.assign(where, filterField(req.query.productId, "productId"), filterField(req.query.status, "status"), filterField(req.query.sku, "sku"));
      if (clean(req.query.validOnly)) where.OR = [{ validUntil: null }, { validUntil: { gte: new Date() } }];
      const rows = await (db as any).supplierQuote.findMany({ where, orderBy: { updatedAt: "desc" }, take: 100 });
      res.json(rows.map(serializeSupplierQuote));
    } catch (error) {
      next(error);
    }
  });
  router.post("/", async (req, res, next) => {
    try {
      const errors = validateSupplierQuotePayload(req.body);
      if (errors.length) return res.status(400).json({ message: "validation failed", errors });
      const supplier = await findAccessibleSupplier(db, req.user!.id, clean(req.body.supplierId), "update");
      if (!supplier) return res.status(404).json({ message: "supplier not found" });
      if (clean(req.body.productId)) await assertAccessibleEntity(db, req.user!.id, supplier.organizationId, "product", clean(req.body.productId));
      const row = await (db as any).supplierQuote.create({ data: toSupplierQuoteData(req.body, supplier, req.user!.id) });
      await audit(db, req.user!.id, supplier.organizationId, "create", "SupplierQuote", row.id, null, row, { operation: "supplier_quote_create", supplierId: supplier.id });
      res.status(201).json(serializeSupplierQuote(row));
    } catch (error) {
      next(error);
    }
  });
  router.patch("/:id", async (req, res, next) => {
    try {
      const errors = validateSupplierQuotePayload(req.body, { partial: true });
      if (errors.length) return res.status(400).json({ message: "validation failed", errors });
      const existing = await findAccessibleQuote(db, req.user!.id, req.params.id, "update");
      if (!existing) return res.status(404).json({ message: "supplier quote not found" });
      if (clean(req.body.productId)) await assertAccessibleEntity(db, req.user!.id, existing.organizationId, "product", clean(req.body.productId));
      const updated = await (db as any).supplierQuote.update({ where: { id: existing.id }, data: toSupplierQuoteData(req.body, existing.supplier, req.user!.id, existing) });
      await audit(db, req.user!.id, updated.organizationId, "update", "SupplierQuote", updated.id, existing, updated, { operation: "supplier_quote_update" });
      res.json(serializeSupplierQuote(updated));
    } catch (error) {
      next(error);
    }
  });
  router.delete("/:id", async (req, res, next) => {
    try {
      const existing = await findAccessibleQuote(db, req.user!.id, req.params.id, "update");
      if (!existing) return res.status(404).json({ message: "supplier quote not found" });
      const confirmError = requireConfirm(req, "supplierQuote.delete");
      if (confirmError) return res.status(409).json(confirmError);
      const updated = await (db as any).supplierQuote.update({ where: { id: existing.id }, data: { status: "archived" } });
      await audit(db, req.user!.id, updated.organizationId, "delete", "SupplierQuote", updated.id, existing, updated, { operation: "supplier_quote_archive", confirmed: true }, "medium");
      res.json(serializeSupplierQuote(updated));
    } catch (error) {
      next(error);
    }
  });
  router.post("/:id/apply-to-order-cost", async (req, res, next) => {
    try {
      const existing = await findAccessibleQuote(db, req.user!.id, req.params.id, "view");
      if (!existing) return res.status(404).json({ message: "supplier quote not found" });
      const confirmError = requireConfirm(req, "supplierQuote.applyToCost");
      if (confirmError) return res.status(409).json(confirmError);
      const order = await findAccessibleOrder(db, req.user!.id, clean(req.body.orderId), existing.organizationId);
      if (!order) return res.status(404).json({ message: "order not found" });
      const role = order.organizationId ? await getActiveOrganizationRole(db as any, order.organizationId, req.user!.id) : null;
      if (order.organizationId && !hasPermission(role as any, "supplierQuote.applyToCost")) return res.status(403).json({ message: "apply cost permission required" });
      const oldCost = await (db as any).orderCost.findUnique({ where: { orderId: order.id } });
      if (oldCost?.costConfirmed && !canWriteOrganizationResource(role)) return res.status(403).json({ message: "confirmed cost requires owner or manager role" });
      const costField = clean(req.body.costField) || "productCost";
      const allowedCostFields = new Set(["productCost", "packagingCost", "domesticShipping", "internationalShipping", "paymentFee", "platformFee", "refundAmount", "reshipCost", "otherCost"]);
      if (!allowedCostFields.has(costField)) return res.status(400).json({ message: "invalid costField" });
      const data = toOrderCostData({ ...(oldCost || {}), [costField]: decimalString(existing.unitCost), currency: existing.currency || order.currency, notes: clean(req.body.notes) || oldCost?.notes || "Supplier quote applied manually." }, order, oldCost?.createdBy || req.user!.id);
      const row = oldCost
        ? await (db as any).orderCost.update({ where: { orderId: order.id }, data: { ...data, createdBy: oldCost.createdBy, costConfirmed: false, confirmedBy: null, confirmedAt: null } })
        : await (db as any).orderCost.create({ data });
      const summary = calculateOrderProfit(order, row);
      await audit(db, req.user!.id, order.organizationId, "update", "OrderCost", row.id, oldCost, row, { operation: "supplier_quote_apply_to_order_cost", supplierQuoteId: existing.id, orderId: order.id, orderNo: order.orderNo, costField, confirmed: true }, "high");
      res.json({ orderCost: summary, riskWarnings: [...summary.riskWarnings, "Supplier quote was applied manually as a cost reference. It does not confirm true cost, supplier payment, purchase order, or customer price."] });
    } catch (error) {
      next(error);
    }
  });
  return router;
}

export function createPurchaseNotesRouter(db: SupplierDb = prisma) {
  const router = Router();
  router.get("/", async (req, res, next) => {
    try {
      const organizationId = organizationIdFromRequest(req);
      const where: any = organizationId ? { organizationId } : { createdBy: req.user!.id };
      const role = organizationId ? await getActiveOrganizationRole(db as any, organizationId, req.user!.id) : null;
      if (organizationId && !canReadOrganization(role)) return res.status(403).json({ message: "organization membership required" });
      Object.assign(where, filterField(req.query.supplierId, "supplierId"), filterField(req.query.productId, "productId"), filterField(req.query.orderId, "orderId"), filterField(req.query.noteType, "noteType"));
      const rows = await (db as any).purchaseNote.findMany({ where, orderBy: { updatedAt: "desc" }, take: 100 });
      res.json(rows.map(serializePurchaseNote));
    } catch (error) {
      next(error);
    }
  });
  router.post("/", async (req, res, next) => {
    try {
      const errors = validatePurchaseNotePayload(req.body);
      if (errors.length) return res.status(400).json({ message: "validation failed", errors });
      const organizationId = await inferOrganizationFromNote(db, req.user!.id, req.body);
      if (organizationId) {
        const role = await getActiveOrganizationRole(db as any, organizationId, req.user!.id);
        if (!hasPermission(role as any, "purchaseNote.create")) return res.status(403).json({ message: "purchase note permission required" });
      }
      const row = await (db as any).purchaseNote.create({ data: toPurchaseNoteData(req.body, req.user!.id, organizationId) });
      await audit(db, req.user!.id, organizationId, "create", "PurchaseNote", row.id, null, row, { operation: "purchase_note_create" });
      res.status(201).json(serializePurchaseNote(row));
    } catch (error) {
      next(error);
    }
  });
  router.patch("/:id", async (req, res, next) => {
    try {
      const errors = validatePurchaseNotePayload(req.body, { partial: true });
      if (errors.length) return res.status(400).json({ message: "validation failed", errors });
      const existing = await findAccessiblePurchaseNote(db, req.user!.id, req.params.id, "update");
      if (!existing) return res.status(404).json({ message: "purchase note not found" });
      const updated = await (db as any).purchaseNote.update({ where: { id: existing.id }, data: toPurchaseNoteData(req.body, req.user!.id, existing.organizationId, existing) });
      await audit(db, req.user!.id, updated.organizationId, "update", "PurchaseNote", updated.id, existing, updated, { operation: "purchase_note_update" });
      res.json(serializePurchaseNote(updated));
    } catch (error) {
      next(error);
    }
  });
  router.delete("/:id", async (req, res, next) => {
    try {
      const existing = await findAccessiblePurchaseNote(db, req.user!.id, req.params.id, "update");
      if (!existing) return res.status(404).json({ message: "purchase note not found" });
      const confirmError = requireConfirm(req, "purchaseNote.delete");
      if (confirmError) return res.status(409).json(confirmError);
      await (db as any).purchaseNote.delete({ where: { id: existing.id } });
      await audit(db, req.user!.id, existing.organizationId, "delete", "PurchaseNote", existing.id, existing, null, { operation: "purchase_note_delete", confirmed: true }, "medium");
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });
  return router;
}

export function createSupplierRisksRouter(db: SupplierDb = prisma) {
  const router = Router();
  router.get("/", async (req, res, next) => {
    try {
      const organizationId = organizationIdFromRequest(req);
      const where: any = organizationId ? { organizationId } : { createdBy: req.user!.id };
      const role = organizationId ? await getActiveOrganizationRole(db as any, organizationId, req.user!.id) : null;
      if (organizationId && !canReadOrganization(role)) return res.status(403).json({ message: "organization membership required" });
      Object.assign(where, filterField(req.query.supplierId, "supplierId"), filterField(req.query.riskType, "riskType"), filterField(req.query.level, "level"), filterField(req.query.status, "status"));
      const rows = await (db as any).supplierRisk.findMany({ where, orderBy: { updatedAt: "desc" }, take: 100 });
      res.json(rows.map(serializeSupplierRisk));
    } catch (error) {
      next(error);
    }
  });
  router.post("/", async (req, res, next) => {
    try {
      const errors = validateSupplierRiskPayload(req.body);
      if (errors.length) return res.status(400).json({ message: "validation failed", errors });
      const supplier = await findAccessibleSupplier(db, req.user!.id, clean(req.body.supplierId), "update");
      if (!supplier) return res.status(404).json({ message: "supplier not found" });
      const row = await (db as any).supplierRisk.create({ data: toSupplierRiskData(req.body, supplier, req.user!.id) });
      await audit(db, req.user!.id, supplier.organizationId, "create", "SupplierRisk", row.id, null, row, { operation: "supplier_risk_create", supplierId: supplier.id }, row.level === "high" ? "high" : "medium");
      res.status(201).json(serializeSupplierRisk(row));
    } catch (error) {
      next(error);
    }
  });
  router.patch("/:id", async (req, res, next) => {
    try {
      const errors = validateSupplierRiskPayload(req.body, { partial: true });
      if (errors.length) return res.status(400).json({ message: "validation failed", errors });
      const existing = await findAccessibleRisk(db, req.user!.id, req.params.id, "update");
      if (!existing) return res.status(404).json({ message: "supplier risk not found" });
      const updated = await (db as any).supplierRisk.update({ where: { id: existing.id }, data: toSupplierRiskData(req.body, existing.supplier, req.user!.id, existing) });
      await audit(db, req.user!.id, updated.organizationId, "update", "SupplierRisk", updated.id, existing, updated, { operation: "supplier_risk_update" }, updated.level === "high" ? "high" : "medium");
      res.json(serializeSupplierRisk(updated));
    } catch (error) {
      next(error);
    }
  });
  return router;
}

export function createSupplierLinksRouter(db: SupplierDb = prisma) {
  const router = Router();
  router.delete("/:id", async (req, res, next) => {
    try {
      const existing = await findAccessibleLink(db, req.user!.id, req.params.id, "update");
      if (!existing) return res.status(404).json({ message: "supplier link not found" });
      const confirmError = requireConfirm(req, "supplierLink.manage");
      if (confirmError) return res.status(409).json(confirmError);
      await (db as any).supplierLink.delete({ where: { id: existing.id } });
      await audit(db, req.user!.id, existing.organizationId, "delete", "SupplierLink", existing.id, existing, null, { operation: "supplier_link_delete", confirmed: true }, "medium");
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });
  return router;
}

export function createSupplierAiRouter(db: SupplierDb = prisma) {
  const router = Router();
  router.post("/supplier-script", async (req, res, next) => {
    try {
      const scenario = clean(req.body.scenario) || "ask_price";
      if (!validateSupplierScriptScenario(scenario)) return res.status(400).json({ message: "invalid scenario" });
      const supplier = clean(req.body.supplierId) ? await findAccessibleSupplier(db, req.user!.id, clean(req.body.supplierId), "view") : null;
      if (clean(req.body.supplierId) && !supplier) return res.status(404).json({ message: "supplier not found" });
      const organizationId = supplier?.organizationId || nullableString(req.body.organizationId);
      if (organizationId) {
        const role = await getActiveOrganizationRole(db as any, organizationId, req.user!.id);
        if (!hasPermission(role as any, "supplier.aiScript")) return res.status(403).json({ message: "supplier ai script permission required" });
      }
      const product = clean(req.body.productId) ? await findAccessibleProduct(db, req.user!.id, clean(req.body.productId), organizationId) : null;
      if (clean(req.body.productId) && !product) return res.status(404).json({ message: "product not found" });
      const order = clean(req.body.orderId) ? await findAccessibleOrder(db, req.user!.id, clean(req.body.orderId), organizationId) : null;
      if (clean(req.body.orderId) && !order) return res.status(404).json({ message: "order not found" });
      const sampleOrder = clean(req.body.sampleOrderId) ? await findAccessibleSimple(db, "sampleOrder", req.user!.id, clean(req.body.sampleOrderId), organizationId) : null;
      if (clean(req.body.sampleOrderId) && !sampleOrder) return res.status(404).json({ message: "sample order not found" });
      const customRequest = clean(req.body.customRequestId) ? await findAccessibleSimple(db, "customRequest", req.user!.id, clean(req.body.customRequestId), organizationId) : null;
      if (clean(req.body.customRequestId) && !customRequest) return res.status(404).json({ message: "custom request not found" });
      const generated = generateSupplierScript({ scenario, supplier, product, order, sampleOrder, customRequest });
      const brandId = clean(req.body.brandId);
      const brandContext = brandId ? await resolveBrandContext(db as any, req.user!.id, { brandId, productId: product?.id || null, scenario }) : null;
      if (brandContext?.brandRulesUsed?.length) {
        generated.scriptText = `${generated.scriptText}\nBrand context checked: ${brandContext.brandRulesUsed.join(", ")}. Confirm brand rules before contacting the supplier manually.`;
        generated.riskWarnings = Array.from(new Set([...generated.riskWarnings, ...brandContext.riskWarnings]));
      }
      const log = await (db as any).aiActionSuggestionLog?.create?.({
        data: {
          organizationId: organizationId || order?.organizationId || null,
          customerId: order?.customerId || sampleOrder?.customerId || customRequest?.customerId || null,
          brandId: brandContext?.brand?.id || null,
          brandUsed: brandContext?.brandUsed || null,
          brandRulesUsed: brandContext?.brandRulesUsed || [],
          userId: req.user!.id,
          actionType: actionTypeForSupplierScenario(scenario),
          scenario,
          inputSnapshot: { supplierId: supplier?.id || null, productId: product?.id || null, orderId: order?.id || null, sampleOrderId: sampleOrder?.id || null, customRequestId: customRequest?.id || null },
          outputSnapshot: generated,
          riskLevel: "medium"
        }
      });
      await audit(db, req.user!.id, organizationId || null, "create", "AIActionSuggestionLog", log?.id || req.user!.id, null, { actionType: actionTypeForSupplierScenario(scenario), scenario }, { operation: "ai_supplier_script", scenario, supplierId: supplier?.id || null }, "medium");
      res.json({ ...generated, brandUsed: brandContext?.brandUsed || null, brandRulesUsed: brandContext?.brandRulesUsed || [], createdLogId: log?.id || null });
    } catch (error) {
      next(error);
    }
  });
  return router;
}

export const suppliersRouter = createSuppliersRouter();
export const supplierContactsRouter = createSupplierContactsRouter();
export const supplierQuotesRouter = createSupplierQuotesRouter();
export const purchaseNotesRouter = createPurchaseNotesRouter();
export const supplierRisksRouter = createSupplierRisksRouter();
export const supplierLinksRouter = createSupplierLinksRouter();
export const supplierAiRouter = createSupplierAiRouter();

async function supplierListContext(db: SupplierDb, req: any) {
  const organizationId = organizationIdFromRequest(req);
  if (!organizationId) return { organizationId: "", role: null };
  const role = await getActiveOrganizationRole(db as any, organizationId, req.user!.id);
  if (!canReadOrganization(role)) throw Object.assign(new Error("organization membership required"), { status: 403 });
  return { organizationId, role };
}

function supplierScope(userId: string, organizationId: string, role: any) {
  if (!organizationId) return { createdBy: userId };
  if (hasPermission(role, "supplier.viewTeam")) return { organizationId };
  if (hasPermission(role, "supplier.viewOwn")) return { organizationId };
  return { organizationId, createdBy: userId };
}

async function findAccessibleSupplier(db: SupplierDb, userId: string, supplierId: string, action: "view" | "update" | "delete") {
  if (!supplierId) return null;
  const row = await (db as any).supplier.findFirst({ where: { id: supplierId } });
  if (!row) return null;
  if (!row.organizationId) return row.createdBy === userId ? row : forbidden();
  const role = await getActiveOrganizationRole(db as any, row.organizationId, userId);
  if (!canReadOrganization(role)) return forbidden();
  if (action === "view" && (hasPermission(role as any, "supplier.viewTeam") || hasPermission(role as any, "supplier.viewOwn") || row.createdBy === userId)) return row;
  if (action === "update" && (hasPermission(role as any, "supplier.update") || row.createdBy === userId)) return row;
  if (action === "delete" && hasPermission(role as any, "supplier.delete")) return row;
  return forbidden();
}

async function findAccessibleContact(db: SupplierDb, userId: string, id: string, action: "update") {
  const row = await (db as any).supplierContact.findFirst({ where: { id } });
  if (!row) return null;
  const supplier = await findAccessibleSupplier(db, userId, row.supplierId, action);
  return supplier ? { ...row, supplier } : null;
}

async function findAccessibleQuote(db: SupplierDb, userId: string, id: string, action: "view" | "update") {
  const row = await (db as any).supplierQuote.findFirst({ where: { id } });
  if (!row) return null;
  const supplier = await findAccessibleSupplier(db, userId, row.supplierId, action);
  return supplier ? { ...row, supplier } : null;
}

async function findAccessiblePurchaseNote(db: SupplierDb, userId: string, id: string, action: "update") {
  const row = await (db as any).purchaseNote.findFirst({ where: { id } });
  if (!row) return null;
  if (row.supplierId) {
    const supplier = await findAccessibleSupplier(db, userId, row.supplierId, action);
    return supplier ? row : null;
  }
  if (!row.organizationId) return row.createdBy === userId ? row : forbidden();
  const role = await getActiveOrganizationRole(db as any, row.organizationId, userId);
  if (hasPermission(role as any, "purchaseNote.update") || row.createdBy === userId) return row;
  return forbidden();
}

async function findAccessibleRisk(db: SupplierDb, userId: string, id: string, action: "update") {
  const row = await (db as any).supplierRisk.findFirst({ where: { id } });
  if (!row) return null;
  const supplier = await findAccessibleSupplier(db, userId, row.supplierId, action);
  return supplier ? { ...row, supplier } : null;
}

async function findAccessibleLink(db: SupplierDb, userId: string, id: string, action: "update") {
  const row = await (db as any).supplierLink.findFirst({ where: { id } });
  if (!row) return null;
  const supplier = await findAccessibleSupplier(db, userId, row.supplierId, action);
  return supplier ? row : null;
}

async function findAccessibleProduct(db: SupplierDb, userId: string, productId: string, organizationId?: string | null) {
  if (!productId) return null;
  const product = await (db as any).product.findFirst({ where: { id: productId } });
  if (!product) return null;
  if (product.ownerId === userId) return product;
  if (organizationId) {
    const member = await getActiveOrganizationRole(db as any, organizationId, userId);
    const shared = await (db as any).organizationProduct?.findFirst?.({ where: { organizationId, productId } });
    if (shared && canReadOrganization(member)) return product;
  }
  return forbidden();
}

async function findAccessibleOrder(db: SupplierDb, userId: string, orderId: string, organizationId?: string | null) {
  if (!orderId) return null;
  const row = await (db as any).order.findFirst({ where: { id: orderId }, include: { customer: true, product: true } });
  if (!row) return null;
  if (organizationId && row.organizationId && organizationId !== row.organizationId) return forbidden();
  const isOwn = row.ownerId === userId || row.assignedTo === userId || row.createdBy === userId || row.customer?.ownerId === userId || row.customer?.assignedTo === userId || (row.customer?.collaborators || []).includes(userId);
  if (!row.organizationId) return isOwn ? row : forbidden();
  const role = await getActiveOrganizationRole(db as any, row.organizationId, userId);
  if (hasPermission(role as any, "order.viewTeam") || (hasPermission(role as any, "order.viewOwn") && isOwn)) return row;
  return forbidden();
}

async function findAccessibleSimple(db: SupplierDb, model: "sampleOrder" | "customRequest", userId: string, id: string, organizationId?: string | null) {
  const row = await (db as any)[model].findFirst({ where: { id } });
  if (!row) return null;
  if (organizationId && row.organizationId && organizationId !== row.organizationId) return forbidden();
  if (row.ownerId === userId || row.createdBy === userId) return row;
  if (row.organizationId) {
    const role = await getActiveOrganizationRole(db as any, row.organizationId, userId);
    const ownPermission = model === "sampleOrder" ? "sample.viewOwn" : "customRequest.viewOwn";
    const teamPermission = model === "sampleOrder" ? "sample.viewTeam" : "customRequest.viewTeam";
    if (hasPermission(role as any, teamPermission as any) || hasPermission(role as any, ownPermission as any)) return row;
  }
  return forbidden();
}

async function assertAccessibleEntity(db: SupplierDb, userId: string, organizationId: string | null, entityType: string, entityId: string) {
  if (entityType === "product") return findAccessibleProduct(db, userId, entityId, organizationId);
  if (entityType === "order") return findAccessibleOrder(db, userId, entityId, organizationId);
  if (entityType === "sample_order") return findAccessibleSimple(db, "sampleOrder", userId, entityId, organizationId);
  if (entityType === "custom_request") return findAccessibleSimple(db, "customRequest", userId, entityId, organizationId);
  if (entityType === "after_sales") {
    const row = await (db as any).afterSalesCase.findFirst({ where: { id: entityId } });
    if (!row) return null;
    if (organizationId && row.organizationId && organizationId !== row.organizationId) return forbidden();
    if (row.ownerId === userId || row.createdBy === userId || row.assignedTo === userId) return row;
    const role = row.organizationId ? await getActiveOrganizationRole(db as any, row.organizationId, userId) : null;
    if (hasPermission(role as any, "afterSales.viewTeam")) return row;
    return forbidden();
  }
  return null;
}

async function quoteListScope(db: SupplierDb, req: any) {
  const organizationId = organizationIdFromRequest(req);
  if (!organizationId) return { createdBy: req.user!.id };
  const role = await getActiveOrganizationRole(db as any, organizationId, req.user!.id);
  if (!canReadOrganization(role)) throw Object.assign(new Error("organization membership required"), { status: 403 });
  return hasPermission(role as any, "supplier.viewTeam") ? { organizationId } : { organizationId, createdBy: req.user!.id };
}

async function inferOrganizationFromNote(db: SupplierDb, userId: string, body: any) {
  if (clean(body.supplierId)) {
    const supplier = await findAccessibleSupplier(db, userId, clean(body.supplierId), "view");
    if (!supplier) throw Object.assign(new Error("supplier not found"), { status: 404 });
    return supplier.organizationId || null;
  }
  if (clean(body.orderId)) {
    const order = await findAccessibleOrder(db, userId, clean(body.orderId), null);
    if (!order) throw Object.assign(new Error("order not found"), { status: 404 });
    return order.organizationId || null;
  }
  return nullableString(body.organizationId);
}

async function assertSupplierDuplicateFree(db: SupplierDb, organizationId: string | null, body: any) {
  const name = clean(body.name);
  const contacts = [clean(body.phone), clean(body.email), clean(body.whatsapp), clean(body.wechat)].filter(Boolean);
  if (!name || contacts.length === 0) return;
  const duplicate = await (db as any).supplier.findFirst({
    where: {
      organizationId,
      name,
      OR: contacts.flatMap((value) => [{ phone: value }, { email: value }, { whatsapp: value }, { wechat: value }])
    }
  });
  if (duplicate) throw Object.assign(new Error("duplicate supplier in this organization"), { status: 409 });
}

function filterField(value: unknown, field: string) {
  const text = clean(value);
  return text ? { [field]: text } : {};
}

function forbidden(): never {
  throw Object.assign(new Error("permission denied"), { status: 403 });
}

function riskForSupplierChange(before: any, after: any) {
  if (after.status === "blocked" && before.status !== "blocked") return "high";
  if (after.riskLevel === "high" && before.riskLevel !== "high") return "high";
  return "medium";
}

function actionTypeForSupplierScenario(scenario: string) {
  if (scenario === "ask_price") return "supplier_price_inquiry";
  if (scenario === "ask_lead_time") return "supplier_lead_time_inquiry";
  if (scenario === "ask_quality_issue") return "supplier_quality_issue";
  if (scenario === "negotiate_price") return "supplier_negotiation";
  return "supplier_script";
}

async function audit(db: SupplierDb, userId: string, organizationId: string | null, action: string, entityType: string, entityId: string, before: any, after: any, metadata: Record<string, unknown>, riskLevel: "low" | "medium" | "high" = "low") {
  await writeAuditLog(db as any, {
    organizationId: organizationId || null,
    userId,
    action: action as any,
    entityType,
    entityId,
    before,
    after,
    metadata,
    riskLevel
  } as any);
}
