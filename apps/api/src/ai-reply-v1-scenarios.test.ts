import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "./server.js";
import { aiReplyV1Cases, type AiReplyV1Case } from "./fixtures/ai-reply-v1-cases.js";

const requiredFields = [
  "translationZh",
  "scenario",
  "intent",
  "concerns",
  "shortReply",
  "professionalReply",
  "closingReply",
  "riskWarnings"
] as const;

describe("POST /api/ai/reply V1 scenario regression cases", () => {
  it.each(aiReplyV1Cases)("$expectedScenario: $message", async (testCase) => {
    const response = await requestAiReply(testCase.message);
    assertCompleteAiReply(response.body, testCase, testCase.message);
    assertDraftSafety(response.body, testCase, testCase.message);
  });

  it("recognizes scenario variants without depending on the exact 10 fixture sentences", async () => {
    for (const testCase of aiReplyV1Cases) {
      for (const message of testCase.alternativeMessages || []) {
        const response = await requestAiReply(message);
        expect(response.body.scenario, context(testCase, message, "scenario variant")).toBe(testCase.expectedScenario);
      }
    }
  });
});

function requestAiReply(customerMessage: string) {
  return request(app)
    .post("/api/ai/reply")
    .send({
      customerMessage,
      targetLanguage: "English"
    })
    .expect(200);
}

function assertCompleteAiReply(body: Record<string, unknown>, testCase: AiReplyV1Case, message: string) {
  for (const field of requiredFields) {
    expect(body, context(testCase, message, `missing field ${field}`)).toHaveProperty(field);
  }

  expect(body.scenario, context(testCase, message, "scenario")).toBe(testCase.expectedScenario);
  expect(String(body.intent), context(testCase, message, "intent")).toContain(testCase.expectedIntentIncludes);
  expect(String(body.translationZh), context(testCase, message, "translation scenario marker")).toContain(testCase.expectedScenario);
  expect(Array.isArray(body.concerns), context(testCase, message, "concerns array")).toBe(true);
  expect(Array.isArray(body.riskWarnings), context(testCase, message, "riskWarnings array")).toBe(true);

  for (const concern of testCase.expectedConcerns) {
    expect(body.concerns, context(testCase, message, `concern ${concern}`)).toContain(concern);
  }

  for (const field of ["shortReply", "professionalReply", "closingReply"] as const) {
    expect(body[field], context(testCase, message, `${field} type`)).toEqual(expect.any(String));
    expect(String(body[field]).length, context(testCase, message, `${field} length`)).toBeGreaterThan(10);
  }
}

function assertDraftSafety(body: Record<string, unknown>, testCase: AiReplyV1Case, message: string) {
  const warningText = (body.riskWarnings as string[]).join(" ");
  expect(warningText, context(testCase, message, "draft warning")).toContain("AI 仅生成草稿");
  expect(warningText, context(testCase, message, "no auto-send warning")).toContain("不会自动发送 WhatsApp 消息");
  expect(warningText, context(testCase, message, "insufficient info warning")).toContain("信息不足时不得编造具体价格、库存、运费、交期或物流状态");

  for (const expectedRisk of testCase.expectedRiskIncludes) {
    expect(warningText, context(testCase, message, `risk ${expectedRisk}`)).toContain(expectedRisk);
  }

  const draftText = `${body.shortReply}\n${body.professionalReply}\n${body.closingReply}`;
  expect(draftText, context(testCase, message, "must not claim auto-send")).not.toMatch(/automatic(?:ally)? send|auto[- ]?send|sent (?:it|this|the message) to WhatsApp|message has been sent/i);
  expect(draftText, context(testCase, message, "must not invent concrete money amounts")).not.toMatch(/(?:USD|US\$|\$)\s*\d+(?:\.\d{1,2})?/i);
  expect(draftText, context(testCase, message, "must not invent concrete delivery time")).not.toMatch(/\b\d+\s*(?:days?|working days?|business days?|weeks?)\b/i);
  expect(draftText, context(testCase, message, "must not invent concrete stock quantity")).not.toMatch(/\b\d+\s*(?:pcs|pieces|units)\s*(?:in stock|available|ready)\b/i);
  expect(draftText, context(testCase, message, "must not invent tracking number")).not.toMatch(/\b[A-Z]{2}\d{8,}[A-Z]{0,2}\b|\btracking\s*(?:no\.?|number)?\s*[:#]\s*[A-Z0-9-]{6,}/i);
  expect(draftText, context(testCase, message, "must not invent payment account")).not.toMatch(/paypal\.me|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|account\s*(?:no\.?|number)\s*[:#]\s*\d{4,}/i);
}

function context(testCase: AiReplyV1Case, message: string, assertion: string) {
  return `[${testCase.expectedScenario}] ${assertion} failed for message: "${message}"`;
}
