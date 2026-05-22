import { describe, expect, it } from "vitest";
import { afterSalesRiskWarnings, generateAfterSalesScript, validateAfterSalesPayload } from "./after-sales-utils.js";

describe("V4-J after-sales safety utilities", () => {
  it("validates required fields and supported enum values", () => {
    expect(validateAfterSalesPayload({})).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "customerId" }),
      expect.objectContaining({ field: "caseType" })
    ]));

    expect(validateAfterSalesPayload({ customerId: "c1", caseType: "refund_request", priority: "urgent" })).toEqual([]);
    expect(validateAfterSalesPayload({ customerId: "c1", caseType: "bad_type" })).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "caseType" })
    ]));
  });

  it("returns refund, reship and responsibility risk warnings", () => {
    const warnings = afterSalesRiskWarnings({
      finalSolution: "refund",
      refundAmount: "20",
      reshipCost: "8",
      responsibility: "company"
    });

    expect(warnings.join(" ")).toMatch(/draft/i);
    expect(warnings.join(" ")).toMatch(/Refund|reship|compensation/i);
    expect(warnings.join(" ")).toMatch(/does not execute an actual refund/i);
    expect(warnings.join(" ")).toMatch(/does not create a real reshipment/i);
    expect(warnings.join(" ")).toMatch(/manual/i);
  });

  it("generates after-sales scripts as safe drafts without automatic promises", () => {
    const result = generateAfterSalesScript(caseRow(), { afterSalesCaseId: "as1", scenario: "refund_policy_explain", targetLanguage: "en" });

    expect(result.scriptText).toMatch(/need to check|policy/i);
    expect(result.scriptText).not.toMatch(/refund is approved|we will refund|we accept responsibility|guaranteed/i);
    expect(result.riskWarnings.join(" ")).toMatch(/draft|Do not promise/i);
    expect(result.missingInfo).toContain("after-sales policy knowledge");
  });

  it("asks for evidence instead of deciding quality responsibility", () => {
    const result = generateAfterSalesScript(caseRow({ caseType: "quality_issue", responsibility: "unknown" }), {
      afterSalesCaseId: "as1",
      scenario: "explain_quality_check",
      targetLanguage: "en"
    });

    expect(result.scriptText).toMatch(/photos|videos|review/i);
    expect(result.scriptText).not.toMatch(/our fault|company responsibility|free replacement/i);
    expect(result.missingInfo).toContain("responsibility confirmation");
  });
});

function caseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "as1",
    caseNo: "AS-20260521-0001",
    caseType: "refund_request",
    responsibility: "unknown",
    finalSolution: null,
    evidenceUrls: [],
    customer: { name: "Maria", language: "en" },
    order: { orderNo: "ORD-1" },
    ...overrides
  };
}
