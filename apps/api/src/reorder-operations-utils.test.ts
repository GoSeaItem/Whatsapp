import { describe, expect, it } from "vitest";
import {
  buildReorderOperationScript,
  calculateReorderOpportunity,
  calculateReorderOpportunities,
  type ReorderCustomer,
  type ReorderRelatedData
} from "./reorder-operations-utils.js";

const now = new Date("2026-05-21T10:00:00.000Z");

describe("V4-I reorder operation rules", () => {
  it("creates high reorder opportunity from old customer and completed order", () => {
    const result = calculateReorderOpportunity(customer({ tags: ["old customer"], stage: "reorder" }), related({
      orders: [order({ orderStatus: "completed", updatedAt: new Date("2026-03-01T10:00:00.000Z") })],
      followUps: [followUp(), followUp({ id: "f2", completedAt: new Date("2026-05-02T10:00:00.000Z") })]
    }), "reorder");

    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.level).toBe("high");
    expect(result.recommendedAction).toContain("reorder");
  });

  it("detects dormant reactivation from stale updates and no follow-up", () => {
    const result = calculateReorderOpportunity(customer({ updatedAt: new Date("2026-03-01T10:00:00.000Z") }), related({
      quotes: [{ id: "q1", customerId: "c1", productId: "p1", createdAt: new Date("2026-04-01T10:00:00.000Z") }]
    }), "dormant_reactivation");

    expect(result.score).toBeGreaterThanOrEqual(40);
    expect(result.recommendedAction).toContain("reactivation");
  });

  it("lowers reorder priority for unresolved after-sales issues", () => {
    const result = calculateReorderOpportunity(customer({ tags: ["old customer"], stage: "reorder" }), related({
      orders: [order({ orderStatus: "completed", afterSalesStatus: "processing" })]
    }), "reorder");

    expect(result.reasons.join(" ")).toContain("after-sales");
  });

  it("finds related product opportunity without saying new arrival", () => {
    const result = calculateReorderOpportunity(customer({ interestedProduct: "dress" }), related({
      products: [{ id: "p2", name: "Blue Dress", category: "dress", createdAt: new Date("2026-05-10T10:00:00.000Z") }]
    }), "new_product");

    expect(result.productId).toBe("p2");
    expect(result.score).toBeGreaterThan(0);
  });

  it("clamps scores to 0-100 and maps levels", () => {
    const rows = calculateReorderOpportunities(customer({ tags: ["old customer"], stage: "reorder", intentScore: 100, latestSummary: "reorder restock repeat" }), related({
      orders: [
        order({ orderStatus: "completed", updatedAt: new Date("2026-01-01T10:00:00.000Z"), cost: { grossMargin: 35 } }),
        order({ id: "o2", orderStatus: "completed", amount: 5000, cost: { grossMargin: 40 } })
      ],
      followUps: [followUp(), followUp({ id: "f2" })]
    }), ["reorder", "high_value"]);

    expect(rows.every((item) => item.score >= 0 && item.score <= 100)).toBe(true);
    expect(rows.some((item) => item.level === "high")).toBe(true);
  });

  it("builds safe scripts without invented purchase history when there is no order", () => {
    const result = buildReorderOperationScript({
      customer: customer(),
      scenario: "new_product_recommendation",
      hasCompletedOrder: false,
      product: { id: "p1", name: "Blue Dress" }
    });

    expect(result.scriptText).toContain("previous discussion");
    expect(result.scriptText).not.toMatch(/previous order|previously purchased|bought before|limited stock|lowest price|only today/i);
    expect(result.riskWarnings.join(" ")).toContain("draft");
    expect(result.riskWarnings.join(" ")).toContain("Confirm price");
  });
});

function customer(overrides: Partial<ReorderCustomer> = {}): ReorderCustomer {
  return {
    id: "c1",
    name: "Maria",
    tags: [],
    stage: "new lead",
    interestedProduct: null,
    latestSummary: null,
    notes: null,
    ownerId: "u1",
    organizationId: "org1",
    assignedTo: "u1",
    collaborators: [],
    intentScore: 0,
    intentLevel: "low" as any,
    updatedAt: new Date("2026-05-20T10:00:00.000Z"),
    ...overrides
  };
}

function related(overrides: Partial<ReorderRelatedData> = {}): ReorderRelatedData {
  return {
    now,
    orders: [],
    quotes: [],
    followUps: [],
    products: [],
    ...overrides
  };
}

function order(overrides: Record<string, unknown> = {}) {
  return {
    id: "o1",
    customerId: "c1",
    productId: "p1",
    orderStatus: "completed",
    afterSalesStatus: "closed",
    amount: 1200,
    quantity: 100,
    createdAt: new Date("2026-03-01T10:00:00.000Z"),
    updatedAt: new Date("2026-03-01T10:00:00.000Z"),
    cost: null,
    ...overrides
  };
}

function followUp(overrides: Record<string, unknown> = {}) {
  return {
    id: "f1",
    customerId: "c1",
    status: "completed",
    remindAt: new Date("2026-05-01T10:00:00.000Z"),
    completedAt: new Date("2026-05-01T10:00:00.000Z"),
    ...overrides
  };
}
