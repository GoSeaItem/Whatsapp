import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "./server.js";

describe("POST /api/ai/reply", () => {
  it("returns English drafts for an English price inquiry without inventing unknown facts", async () => {
    const response = await request(app)
      .post("/api/ai/reply")
      .send({
        customerMessage: "Can you give me the best price for 500 pcs and shipping to UAE?",
        targetLanguage: "English",
        scenario: "price"
      })
      .expect(200);

    expect(response.body.translationZh).toContain("客户消息大意");
    expect(response.body.scenario).toBe("price");
    expect(response.body.intent).toBe("询价 / 报价");
    expect(response.body.concerns).toContain("价格");
    expect(response.body.concerns).toContain("物流");
    expect(response.body.shortReply).toContain("target quantity");
    expect(response.body.professionalReply).toContain("Thank you");
    expect(response.body.closingReply).toContain("Once you confirm");
    expect(response.body.riskWarnings.join(" ")).toContain("付款、退款信息");
    expect(response.body.riskWarnings.join(" ")).toContain("不得编造报价");
    expect(response.body.riskWarnings.join(" ")).toContain("不会自动发送");
  });

  it("returns Spanish drafts for a Spanish customer message", async () => {
    const response = await request(app)
      .post("/api/ai/reply")
      .send({
        customerMessage: "Hola, ¿cuál es el precio y el envío a México?",
        targetLanguage: "Spanish",
        scenario: "shipping"
      })
      .expect(200);

    expect(response.body.intent).toBe("咨询物流");
    expect(response.body.scenario).toBe("shipping");
    expect(response.body.shortReply).toContain("Gracias");
    expect(response.body.professionalReply).toContain("¿Podrías confirmarme");
    expect(response.body.concerns).toContain("运费");
  });

  it("validates customerMessage", async () => {
    const response = await request(app).post("/api/ai/reply").send({ customerMessage: "" }).expect(400);
    expect(response.body.message).toBe("customerMessage is required");
  });
});
