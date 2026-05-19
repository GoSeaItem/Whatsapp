import { describe, expect, it } from "vitest";
import { calculateCustomerIntent, levelForScore, type IntentCustomer } from "./customer-intent-rules.js";

const now = new Date("2026-05-20T10:00:00.000Z");

describe("customer intent rules", () => {
  it("adds score for high-intent tags and quoted/payment stages", () => {
    expect(score({ tags: ["高意向"] })).toBe(30);
    expect(score({ stage: "已报价" })).toBe(25);
    expect(score({ stage: "待付款" })).toBe(40);
  });

  it("adds score for quote records, recent quote, and multiple quotes", () => {
    const result = calculateCustomerIntent(baseCustomer(), {
      now,
      quotes: [
        { customerId: "c1", createdAt: new Date("2026-05-19T09:00:00.000Z") },
        { customerId: "c1", createdAt: new Date("2026-05-12T09:00:00.000Z") }
      ]
    });

    expect(result.intentScore).toBe(45);
    expect(result.intentReasons).toEqual(expect.arrayContaining(["+15 有报价记录", "+20 最近 3 天内有报价记录", "+10 报价记录数量不少于 2 条"]));
  });

  it("adds score for pending and today follow-up tasks", () => {
    const result = calculateCustomerIntent(baseCustomer(), {
      now,
      followUps: [{ customerId: "c1", status: "pending", remindAt: new Date("2026-05-20T15:00:00.000Z") }]
    });

    expect(result.intentScore).toBe(25);
    expect(result.intentReasons).toContain("+10 有 pending 跟进任务");
    expect(result.intentReasons).toContain("+15 今日待跟进");
  });

  it("subtracts score for overdue follow-ups and invalid customers", () => {
    const shortOverdue = calculateCustomerIntent(baseCustomer(), {
      now,
      followUps: [{ customerId: "c1", status: "pending", remindAt: new Date("2026-05-18T09:00:00.000Z") }]
    });
    expect(shortOverdue.intentReasons).toContain("-10 逾期未跟进 1-3 天");

    const longOverdue = calculateCustomerIntent(baseCustomer(), {
      now,
      followUps: [{ customerId: "c1", status: "pending", remindAt: new Date("2026-05-15T09:00:00.000Z") }]
    });
    expect(longOverdue.intentReasons).toContain("-20 逾期未跟进超过 3 天");

    const invalid = calculateCustomerIntent(baseCustomer({ tags: ["无效客户"], stage: "无效客户" }), { now });
    expect(invalid.intentScore).toBe(0);
    expect(invalid.recommendedAction).toContain("可能无效");
  });

  it("adds score for payment and shipping keywords", () => {
    const result = calculateCustomerIntent(baseCustomer({
      latestSummary: "Customer asked payment by PayPal and shipping freight to Mexico city."
    }), { now });

    expect(result.intentScore).toBeGreaterThanOrEqual(65);
    expect(result.intentReasons.join(" ")).toContain("付款方式");
    expect(result.intentReasons.join(" ")).toContain("物流或运费");
  });

  it("handles negative keywords and long overdue nextFollowUpAt", () => {
    const result = calculateCustomerIntent(baseCustomer({
      tags: ["高意向"],
      latestSummary: "Customer said too expensive and will think about it later.",
      nextFollowUpAt: new Date("2026-05-01T09:00:00.000Z")
    }), { now });

    expect(result.intentReasons).toEqual(expect.arrayContaining([
      "-15 客户认为价格太高且暂无后续报价动作",
      "-10 客户表示稍后考虑",
      "-20 下次跟进时间逾期超过 7 天"
    ]));
  });

  it("clamps score between 0 and 100 and maps low, medium, high levels", () => {
    const high = calculateCustomerIntent(baseCustomer({
      tags: ["高意向", "待付款", "已报价", "需要跟进", "老客户"],
      stage: "待付款",
      latestSummary: "payment PayPal address city order invoice shipping delivery sample OEM"
    }), {
      now,
      quotes: [
        { customerId: "c1", createdAt: new Date("2026-05-19T09:00:00.000Z") },
        { customerId: "c1", createdAt: new Date("2026-05-18T09:00:00.000Z") }
      ],
      followUps: [
        { customerId: "c1", status: "pending", remindAt: new Date("2026-05-20T15:00:00.000Z") },
        { customerId: "c1", status: "completed", remindAt: new Date("2026-05-10T09:00:00.000Z") },
        { customerId: "c1", status: "completed", remindAt: new Date("2026-05-11T09:00:00.000Z") }
      ]
    });
    expect(high.intentScore).toBe(100);
    expect(high.intentLevel).toBe("high");

    const low = calculateCustomerIntent(baseCustomer({ tags: ["无效客户"], latestSummary: "not interested no need" }), { now });
    expect(low.intentScore).toBe(0);
    expect(levelForScore(39)).toBe("low");
    expect(levelForScore(40)).toBe("medium");
    expect(levelForScore(70)).toBe("high");
  });

  it("returns required risk warnings", () => {
    const result = calculateCustomerIntent(baseCustomer(), { now });
    expect(result.riskWarnings).toContain("意向评分仅作辅助，不代表客户一定成交。");
    expect(result.riskWarnings.join(" ")).toContain("不要因评分高而自动发送消息");
    expect(result.riskWarnings.join(" ")).toContain("当前客户数据较少，评分可能不准确");
  });
});

function score(overrides: Partial<IntentCustomer>) {
  return calculateCustomerIntent(baseCustomer(overrides), { now }).intentScore;
}

function baseCustomer(overrides: Partial<IntentCustomer> = {}): IntentCustomer {
  return {
    id: "c1",
    name: "Maria",
    tags: [],
    stage: "新线索",
    interestedProduct: null,
    latestSummary: null,
    nextFollowUpAt: null,
    notes: null,
    ...overrides
  };
}
