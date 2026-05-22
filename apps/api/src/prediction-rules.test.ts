import { describe, expect, it } from "vitest";
import {
  buildReorderScript,
  calculateCustomerPrediction,
  calculateCustomerPredictions,
  calculateProductOpportunities,
  type PredictionCustomer,
  type PredictionRelatedData
} from "./prediction-rules.js";

const now = new Date("2026-05-21T10:00:00.000Z");

describe("V4-E reorder and business prediction rules", () => {
  it("scores reorder potential for old customers and reorder stage", () => {
    const result = calculateCustomerPrediction(customer({ tags: ["old customer"], stage: "reorder", latestSummary: "Please prepare reorder and restock plan." }), related(), "reorder");

    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.level).toBe("high");
    expect(result.recommendedAction).toContain("reorder");
  });

  it("keeps invalid customers low even when other signals exist", () => {
    const result = calculateCustomerPrediction(customer({ tags: ["invalid customer", "old customer"], stage: "invalid customer", latestSummary: "reorder repeat" }), related(), "reorder");

    expect(result.score).toBe(0);
    expect(result.level).toBe("low");
  });

  it("detects dormant customers from old quotes without follow-up", () => {
    const result = calculateCustomerPrediction(customer({ stage: "quoted", updatedAt: new Date("2026-04-01T10:00:00.000Z") }), related({
      quotes: [quote({ createdAt: new Date("2026-05-01T10:00:00.000Z") })]
    }), "dormant");

    expect(result.score).toBeGreaterThanOrEqual(40);
    expect(result.recommendedAction).toContain("reactivation");
  });

  it("detects churn risk from stale high-intent, sample no-response, and overdue follow-up", () => {
    const result = calculateCustomerPrediction(customer({ intentLevel: "high" as any, latestSummary: "Customer said too expensive." }), related({
      quotes: [quote({ createdAt: new Date("2026-05-10T10:00:00.000Z") })],
      followUps: [{ customerId: "c1", status: "pending", remindAt: new Date("2026-05-10T10:00:00.000Z"), completedAt: null }],
      sampleOrders: [{ customerId: "c1", shippingStatus: "delivered", feedbackStatus: "no_response" }]
    }), "churn_risk");

    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.level).toBe("high");
  });

  it("detects high-value customers from pending payment and high quote value", () => {
    const result = calculateCustomerPrediction(customer({ stage: "pending payment", intentScore: 80 }), related({
      quotes: [quote({ quantity: 200, unitPrice: 8 })]
    }), "high_value");

    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.level).toBe("high");
  });

  it("scores product opportunities from quote, sample, custom, and material signals", () => {
    const rows = calculateProductOpportunities({
      products: [{ id: "p1", name: "Blue Dress", sku: "BD-1", category: "dress" }],
      customers: [customer({ interestedProduct: "Blue Dress" }), customer({ id: "c2", interestedProduct: "BD-1" })],
      quotes: [quote({ productId: "p1" }), quote({ id: "q2", productId: "p1" })],
      sampleOrders: [{ customerId: "c1", productId: "p1" }],
      customRequests: [{ customerId: "c1", productId: "p1" }],
      materials: [{ productId: "p1" }]
    });

    expect(rows[0]).toMatchObject({ productId: "p1", productName: "Blue Dress" });
    expect(rows[0].score).toBeGreaterThanOrEqual(50);
  });

  it("clamps scores and maps levels", () => {
    const results = calculateCustomerPredictions(customer({ tags: ["invalid customer"], stage: "invalid customer" }), related(), ["reorder", "dormant", "high_value", "churn_risk"]);

    expect(results.every((item) => item.score >= 0 && item.score <= 100)).toBe(true);
    expect(calculateCustomerPrediction(customer({ tags: ["old customer"], stage: "reorder", intentLevel: "high" as any, latestSummary: "payment shipping reorder restock repeat" }), related({
      quotes: [quote({ quantity: 500, unitPrice: 10 }), quote({ id: "q2" })],
      followUps: [
        { customerId: "c1", status: "completed", remindAt: new Date("2026-05-01T10:00:00.000Z"), completedAt: new Date("2026-05-02T10:00:00.000Z") },
        { customerId: "c1", status: "completed", remindAt: new Date("2026-05-03T10:00:00.000Z"), completedAt: new Date("2026-05-04T10:00:00.000Z") }
      ]
    }), "reorder").score).toBe(100);
  });

  it("builds reorder scripts without invented purchase history, stock, price, or urgency", () => {
    const result = buildReorderScript({ customer: customer(), productName: "Blue Dress", reminderType: "reorder" });

    expect(result.scriptText).toContain("previously discussed");
    expect(result.scriptText).not.toMatch(/previously purchased|bought before|limited stock|only today|lowest price/i);
    expect(result.riskWarnings.join(" ")).toContain("Confirm price");
    expect(result.riskWarnings.join(" ")).toContain("draft");
  });
});

function customer(overrides: Partial<PredictionCustomer> = {}): PredictionCustomer {
  return {
    id: "c1",
    name: "Maria",
    tags: [],
    stage: "new lead",
    interestedProduct: null,
    latestSummary: null,
    notes: null,
    nextFollowUpAt: null,
    intentScore: 0,
    intentLevel: "low" as any,
    ownerId: "sales-1",
    organizationId: "org-1",
    assignedTo: "sales-1",
    collaborators: [],
    createdAt: new Date("2026-04-01T10:00:00.000Z"),
    updatedAt: new Date("2026-05-20T10:00:00.000Z"),
    ...overrides
  };
}

function related(overrides: Partial<PredictionRelatedData> = {}): PredictionRelatedData {
  return {
    now,
    quotes: [],
    followUps: [],
    sampleOrders: [],
    customRequests: [],
    ...overrides
  };
}

function quote(overrides: Record<string, unknown> = {}) {
  return {
    id: "q1",
    customerId: "c1",
    productId: "p1",
    quantity: 100,
    unitPrice: 5,
    createdAt: new Date("2026-05-20T10:00:00.000Z"),
    ...overrides
  };
}
