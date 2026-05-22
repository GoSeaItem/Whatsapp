import { describe, expect, it } from "vitest";
import { calculateOrderProfit, generateProfitReview } from "./profit-utils.js";

describe("profit calculation rules", () => {
  it("calculates total cost, gross profit, and gross margin", () => {
    const summary = calculateOrderProfit(order({ amount: 1000 }), {
      currency: "USD",
      productCost: 500,
      packagingCost: 20,
      domesticShipping: 30,
      internationalShipping: 80,
      paymentFee: 10,
      platformFee: 0,
      refundAmount: 0,
      reshipCost: 0,
      otherCost: 10,
      costConfirmed: true
    });

    expect(summary.totalCost).toBe("650.00");
    expect(summary.grossProfit).toBe("350.00");
    expect(summary.grossMargin).toBe("35.00");
    expect(summary.marginLevel).toBe("high");
  });

  it("flags empty costs, invalid revenue, losses, low margin, and currency mismatch", () => {
    expect(calculateOrderProfit(order({ amount: null }), null).riskWarnings.join(" ")).toContain("Order amount is empty");
    expect(calculateOrderProfit(order({ amount: 100 }), null).riskWarnings.join(" ")).toContain("No cost items are filled");
    expect(calculateOrderProfit(order({ amount: 100 }), { currency: "USD", productCost: 120 }).marginLevel).toBe("loss");
    expect(calculateOrderProfit(order({ amount: 100 }), { currency: "USD", productCost: 95 }).marginLevel).toBe("low");
    expect(calculateOrderProfit(order({ amount: 100, currency: "USD" }), { currency: "CNY", productCost: 20 }).riskWarnings.join(" ")).toContain("currency");
  });

  it("generates advisory-only profit review without accounting conclusions", () => {
    const summary = calculateOrderProfit(order({ amount: 100 }), { productCost: 95, costConfirmed: false });
    const review = generateProfitReview({ scope: "order", targetName: "ORD-1", summary });
    const text = JSON.stringify(review).toLowerCase();
    expect(text).toContain("operational");
    expect(text).toContain("not accounting");
    expect(text).toContain("cost is not confirmed");
    expect(text).not.toMatch(/tax filing|tax return|audited financial/);
  });
});

function order(overrides: Record<string, unknown> = {}) {
  return {
    id: "order-1",
    orderNo: "ORD-1",
    amount: 1000,
    currency: "USD",
    ...overrides
  };
}
