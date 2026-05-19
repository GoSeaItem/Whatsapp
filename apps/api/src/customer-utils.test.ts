import { describe, expect, it } from "vitest";
import { normalizeTags, toCustomerCreateData, validateCustomerPayload } from "./customer-utils.js";

describe("customer utils", () => {
  it("validates required customer name", () => {
    const errors = validateCustomerPayload({ name: " " });
    expect(errors).toContainEqual({ field: "name", message: "客户名称不能为空" });
  });

  it("rejects unknown sales stage", () => {
    const errors = validateCustomerPayload({ name: "Amina", stage: "未知阶段" });
    expect(errors).toContainEqual({ field: "stage", message: "销售阶段不在默认选项中" });
  });

  it("normalizes tags and create payload", () => {
    expect(normalizeTags(["高意向", " 高意向 ", "需要跟进"])).toEqual(["高意向", "需要跟进"]);
    expect(
      toCustomerCreateData({
        name: " Amina ",
        tags: ["高意向"],
        nextFollowUpAt: "2026-05-20T10:00:00.000Z"
      }).stage
    ).toBe("新线索");
  });
});
