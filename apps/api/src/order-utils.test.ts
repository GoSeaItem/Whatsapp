import { describe, expect, it } from "vitest";
import { generateOrderScript, riskWarningsForOrder, serializeOrder, validateOrderPayload } from "./order-utils.js";

const baseOrder = serializeOrder({
  id: "order-1",
  organizationId: "org-1",
  customerId: "customer-1",
  customer: { id: "customer-1", name: "Maria", language: "English" },
  productId: "product-1",
  product: { id: "product-1", name: "Blue Dress" },
  quoteId: "quote-1",
  sampleOrderId: null,
  customRequestId: null,
  orderNo: "ORD-20260521-0001",
  orderType: "normal",
  title: "Blue Dress order",
  amount: "1200.00",
  currency: "USD",
  quantity: 100,
  paymentStatus: "unpaid",
  productionStatus: "not_started",
  shippingStatus: "pending",
  afterSalesStatus: "none",
  orderStatus: "pending_payment",
  expectedShipDate: null,
  expectedDeliveryDate: null,
  trackingNumber: null,
  notes: null,
  files: [],
  ownerId: "sales-1",
  assignedTo: "sales-1",
  createdBy: "sales-1",
  createdAt: new Date("2026-05-21T00:00:00.000Z"),
  updatedAt: new Date("2026-05-21T00:00:00.000Z")
});

describe("order utils", () => {
  it("validates customer, enums, amount and quantity", () => {
    expect(validateOrderPayload({ customerId: "", orderType: "bad", amount: "abc", quantity: "1.5" })).toEqual(
      expect.arrayContaining([
        { field: "customerId", message: "customerId is required" },
        { field: "orderType", message: "orderType is invalid" },
        { field: "amount", message: "amount must be a number" },
        { field: "quantity", message: "quantity must be a positive integer" }
      ])
    );
  });

  it("returns payment, shipping, delay and after-sales risk warnings", () => {
    const warnings = riskWarningsForOrder({
      ...baseOrder,
      paymentStatus: "paid",
      shippingStatus: "shipped",
      productionStatus: "delayed",
      afterSalesStatus: "refunded",
      orderStatus: "completed",
      trackingNumber: null
    });
    expect(warnings.join(" ")).toContain("actual payment receipt");
    expect(warnings.join(" ")).toContain("Tracking number is missing");
    expect(warnings.join(" ")).toContain("real delay reason");
    expect(warnings.join(" ")).toContain("actual refund process");
    expect(warnings.join(" ")).toContain("drafts only");
  });

  it("generates order scripts as drafts without inventing logistics or payment", () => {
    const result = generateOrderScript(baseOrder, { orderId: baseOrder.id, scenario: "shipping_notice", targetLanguage: "English" });
    expect(result.scriptText).toContain("[please confirm tracking number]");
    expect(result.missingInfo).toContain("trackingNumber");
    expect(result.riskWarnings.join(" ")).toContain("drafts only");
    expect(JSON.stringify(result).toLowerCase()).not.toMatch(/auto.?send|bulk send|click.*send|send button/);
  });

  it("marks quote, sample and custom conversions as confirmation-only records", () => {
    expect(riskWarningsForOrder(baseOrder, "from_quote").join(" ")).toContain("Confirm price");
    expect(riskWarningsForOrder(baseOrder, "from_sample").join(" ")).toContain("does not infer bulk quantity");
    expect(riskWarningsForOrder(baseOrder, "from_custom").join(" ")).toContain("does not guarantee production capability");
  });
});
