import type { AiReplyScenario } from "@wa-ai/shared";

export type AiReplyV1Case = {
  message: string;
  expectedScenario: AiReplyScenario;
  expectedIntentIncludes: string;
  expectedConcerns: string[];
  expectedRiskIncludes: string[];
  alternativeMessages?: string[];
};

export const aiReplyV1Cases: AiReplyV1Case[] = [
  {
    message: "How much for 100 pcs?",
    expectedScenario: "price",
    expectedIntentIncludes: "询价",
    expectedConcerns: ["价格"],
    expectedRiskIncludes: ["确认价格", "不得编造具体价格"],
    alternativeMessages: ["Could you quote 200 units?", "Please give me your best price."]
  },
  {
    message: "What is your MOQ?",
    expectedScenario: "moq",
    expectedIntentIncludes: "起订量",
    expectedConcerns: ["MOQ"],
    expectedRiskIncludes: ["不得编造具体价格"],
    alternativeMessages: ["What is the minimum order quantity?"]
  },
  {
    message: "Can you ship to Mexico?",
    expectedScenario: "shipping",
    expectedIntentIncludes: "物流",
    expectedConcerns: ["物流"],
    expectedRiskIncludes: ["确认国家、城市、运输方式、运费", "不得编造物流状态"],
    alternativeMessages: ["Do you deliver to Mexico City?"]
  },
  {
    message: "Your price is too high.",
    expectedScenario: "discount",
    expectedIntentIncludes: "折扣",
    expectedConcerns: ["价格", "折扣"],
    expectedRiskIncludes: ["确认价格", "不得编造报价"],
    alternativeMessages: ["Can you make it cheaper?"]
  },
  {
    message: "Can I get a sample first?",
    expectedScenario: "sample",
    expectedIntentIncludes: "样品",
    expectedConcerns: ["样品", "库存"],
    expectedRiskIncludes: ["确认库存", "样品可用性"],
    alternativeMessages: ["Do you have samples available?"]
  },
  {
    message: "How long is the delivery time?",
    expectedScenario: "lead_time",
    expectedIntentIncludes: "交期",
    expectedConcerns: ["交期"],
    expectedRiskIncludes: ["确认生产周期和发货时间", "不得编造具体价格、库存、运费、交期或物流状态"],
    alternativeMessages: ["What is the lead time?"]
  },
  {
    message: "Do you have real pictures?",
    expectedScenario: "product_proof",
    expectedIntentIncludes: "实拍",
    expectedConcerns: ["产品资料", "实拍图"],
    expectedRiskIncludes: ["确认图片、视频或附件真实存在"],
    alternativeMessages: ["Can you send real product photos?"]
  },
  {
    message: "I will think about it.",
    expectedScenario: "follow_up",
    expectedIntentIncludes: "跟进",
    expectedConcerns: ["跟进"],
    expectedRiskIncludes: ["不得编造具体价格、库存、运费、交期或物流状态"],
    alternativeMessages: ["Let me consider it and reply later."]
  },
  {
    message: "Can I pay by PayPal?",
    expectedScenario: "payment",
    expectedIntentIncludes: "付款",
    expectedConcerns: ["付款"],
    expectedRiskIncludes: ["确认付款方式和收款账户", "不得编造收款信息"],
    alternativeMessages: ["Do you accept PayPal payment?"]
  },
  {
    message: "Where is my order?",
    expectedScenario: "order_status",
    expectedIntentIncludes: "订单",
    expectedConcerns: ["物流状态", "订单"],
    expectedRiskIncludes: ["确认订单号和物流单号", "不得编造物流状态"],
    alternativeMessages: ["Can you update me on my tracking status?"]
  }
];
