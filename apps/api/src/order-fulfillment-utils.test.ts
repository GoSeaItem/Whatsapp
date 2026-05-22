import { describe, expect, it } from "vitest";
import { calculateFulfillmentAlerts, generateFulfillmentScript, getFulfillmentGroup } from "./order-fulfillment-utils.js";

const now = new Date("2026-05-21T10:00:00.000Z");

describe("order fulfillment rules", () => {
  it("groups key fulfillment statuses", () => {
    expect(getFulfillmentGroup(order({ paymentStatus: "unpaid", orderStatus: "pending_payment" }))).toBe("pending_payment");
    expect(getFulfillmentGroup(order({ paymentStatus: "deposit_paid", productionStatus: "preparing" }))).toBe("deposit_paid");
    expect(getFulfillmentGroup(order({ productionStatus: "in_production" }))).toBe("in_production");
    expect(getFulfillmentGroup(order({ productionStatus: "completed", shippingStatus: "pending" }))).toBe("pending_shipment");
    expect(getFulfillmentGroup(order({ shippingStatus: "shipped" }))).toBe("shipped_not_delivered");
    expect(getFulfillmentGroup(order({ shippingStatus: "delivered", afterSalesStatus: "none" }))).toBe("delivered_follow_up");
    expect(getFulfillmentGroup(order({ afterSalesStatus: "pending" }))).toBe("after_sales_pending");
    expect(getFulfillmentGroup(order({ orderStatus: "completed" }))).toBe("completed");
  });

  it("creates alert drafts with correct risk levels", () => {
    const alerts = calculateFulfillmentAlerts(order({
      createdAt: new Date("2026-05-10T00:00:00.000Z"),
      orderStatus: "pending_payment",
      paymentStatus: "unpaid",
      productionStatus: "in_production",
      expectedShipDate: new Date("2026-05-10T00:00:00.000Z"),
      shippingStatus: "shipped",
      trackingNumber: null,
      expectedDeliveryDate: new Date("2026-05-12T00:00:00.000Z"),
      updatedAt: new Date("2026-05-10T00:00:00.000Z"),
      afterSalesStatus: "processing"
    }), [], now);

    expect(alerts.map((alert) => alert.alertType)).toEqual(expect.arrayContaining(["payment_overdue", "production_delayed", "shipping_delayed", "missing_tracking_number", "after_sales_pending", "order_no_follow_up"]));
    expect(alerts.find((alert) => alert.alertType === "payment_overdue")?.level).toBe("high");
    expect(alerts.find((alert) => alert.alertType === "missing_tracking_number")?.level).toBe("medium");
  });

  it("generates draft-only fulfillment scripts without inventing logistics or payment facts", () => {
    const result = generateFulfillmentScript(order({ shippingStatus: "shipped", trackingNumber: null }), { orderId: "order-1", scenario: "shipping_notice", targetLanguage: "English" });
    const payload = JSON.stringify(result).toLowerCase();
    expect(result.scriptText).toContain("[please confirm tracking number]");
    expect(result.riskWarnings.join(" ")).toContain("drafts only");
    expect(payload).not.toMatch(/auto-send|bulk send|click.*send|send button/);
  });
});

function order(overrides: Record<string, unknown> = {}) {
  return {
    id: "order-1",
    organizationId: null,
    customerId: "customer-1",
    orderNo: "ORD-20260521-0001",
    orderType: "normal",
    title: "Blue Dress",
    amount: null,
    currency: "USD",
    quantity: 100,
    productId: "product-1",
    paymentStatus: "paid",
    productionStatus: "not_started",
    shippingStatus: "pending",
    afterSalesStatus: "none",
    orderStatus: "processing",
    expectedShipDate: null,
    expectedDeliveryDate: null,
    trackingNumber: null,
    notes: null,
    files: [],
    ownerId: "sales-1",
    assignedTo: null,
    createdBy: "sales-1",
    createdAt: new Date("2026-05-20T00:00:00.000Z"),
    updatedAt: new Date("2026-05-20T00:00:00.000Z"),
    customer: { name: "Maria", ownerId: "sales-1", language: "en" },
    product: { name: "Blue Dress" },
    ...overrides
  };
}
