import { AI_SAFETY_NOTE, type AiReplyRequest, type AiReplyResponse, type AiReplyScenario } from "@wa-ai/shared";
import { buildReplyPrompt } from "./prompts/reply-prompt.js";

type Language = "English" | "Spanish" | "Chinese";

type Analysis = {
  language: Language;
  scenario: AiReplyScenario;
  intent: string;
  concerns: string[];
  missing: string[];
};

type ProductContextFlags = ReturnType<typeof parseProductContext>;

const scenarioDefinitions: Record<
  AiReplyScenario,
  {
    intent: string;
    concerns: string[];
    missing: string[];
    keywords: string[];
  }
> = {
  price: {
    intent: "询价 / 报价",
    concerns: ["价格"],
    missing: ["目标数量", "产品型号"],
    keywords: ["how much", "price", "quote", "quotation", "cost", "best price", "precio", "cotización", "cuanto", "cuánto", "价格", "报价"]
  },
  moq: {
    intent: "确认起订量",
    concerns: ["MOQ"],
    missing: ["目标数量", "产品型号"],
    keywords: ["moq", "minimum order", "minimum quantity", "cantidad mínima", "mínimo", "起订", "起订量"]
  },
  shipping: {
    intent: "咨询物流",
    concerns: ["运费", "物流"],
    missing: ["目的地国家", "目的地城市", "运输方式"],
    keywords: ["ship", "shipping", "freight", "send to", "deliver to", "envío", "entrega", "发货", "运输", "运费", "物流"]
  },
  discount: {
    intent: "价格异议 / 争取折扣",
    concerns: ["价格", "折扣"],
    missing: ["目标数量", "可接受价格", "产品型号"],
    keywords: ["too high", "expensive", "discount", "lower price", "cheaper", "descuento", "rebaja", "太贵", "优惠", "折扣"]
  },
  sample: {
    intent: "样品咨询",
    concerns: ["样品", "库存"],
    missing: ["样品数量", "收货国家", "收货城市"],
    keywords: ["sample", "muestra", "样品"]
  },
  lead_time: {
    intent: "咨询交期",
    concerns: ["交期"],
    missing: ["目标数量", "产品型号", "目的地国家"],
    keywords: ["lead time", "delivery time", "how long", "delivery", "交期", "多久", "发货时间"]
  },
  product_proof: {
    intent: "索要产品实拍 / 资料",
    concerns: ["产品资料", "实拍图"],
    missing: ["产品型号"],
    keywords: ["real picture", "real pictures", "photo", "picture", "video", "catalog", "spec", "实拍", "图片", "视频", "目录", "规格"]
  },
  follow_up: {
    intent: "客户暂缓 / 跟进",
    concerns: ["跟进"],
    missing: ["客户关注点", "下次跟进时间"],
    keywords: ["think about it", "consider", "later", "not now", "再考虑", "稍后", "以后"]
  },
  payment: {
    intent: "付款方式咨询",
    concerns: ["付款"],
    missing: ["付款方式", "收款账户", "订单金额"],
    keywords: ["pay", "paypal", "payment", "bank transfer", "付款", "支付", "收款账户"]
  },
  order_status: {
    intent: "订单物流状态咨询",
    concerns: ["物流状态", "订单"],
    missing: ["订单号", "物流单号", "目的地国家", "目的地城市"],
    keywords: ["where is my order", "order status", "tracking", "track", "my order", "订单", "物流状态", "到哪里"]
  }
};

const scenarioPriority: AiReplyScenario[] = [
  "order_status",
  "payment",
  "sample",
  "product_proof",
  "discount",
  "moq",
  "lead_time",
  "shipping",
  "price",
  "follow_up"
];

export function generateAiReply(input: AiReplyRequest): AiReplyResponse {
  const customerMessage = input.customerMessage.trim();
  if (!customerMessage) {
    throw new Error("customerMessage is required");
  }

  const prompt = buildReplyPrompt(input);
  const context = parseProductContext(input.productContext);
  const analysis = analyzeCustomerMessage(customerMessage, input.targetLanguage, input.scenario);
  const riskWarnings = buildRiskWarnings(analysis, context);
  const replies = buildReplies({
    language: analysis.language,
    intent: analysis.intent,
    concerns: analysis.concerns,
    missing: analysis.missing,
    hasUsefulContext: context.hasUsefulContext
  });

  void prompt;

  return {
    translationZh: translateToChinese(customerMessage, analysis),
    scenario: analysis.scenario,
    intent: analysis.intent,
    concerns: analysis.concerns,
    shortReply: replies.shortReply,
    professionalReply: replies.professionalReply,
    closingReply: replies.closingReply,
    riskWarnings
  };
}

function analyzeCustomerMessage(message: string, targetLanguage?: string, requestedScenario?: AiReplyScenario): Analysis {
  const normalizedMessage = normalizeText(message);
  const language = resolveLanguage(message, targetLanguage);
  const scenario = requestedScenario || inferScenario(normalizedMessage);
  const definition = scenarioDefinitions[scenario];
  const concerns = new Set<string>(definition.concerns);

  for (const candidate of scenarioPriority) {
    if (candidate === scenario) continue;
    if (matchesScenario(normalizedMessage, candidate)) {
      scenarioDefinitions[candidate].concerns.forEach((concern) => concerns.add(concern));
    }
  }

  return {
    language,
    scenario,
    intent: definition.intent,
    concerns: Array.from(concerns),
    missing: definition.missing
  };
}

function inferScenario(normalizedMessage: string): AiReplyScenario {
  return scenarioPriority.find((scenario) => matchesScenario(normalizedMessage, scenario)) || "follow_up";
}

function matchesScenario(normalizedMessage: string, scenario: AiReplyScenario) {
  return scenarioDefinitions[scenario].keywords.some((keyword) => normalizedMessage.includes(normalizeText(keyword)));
}

function resolveLanguage(message: string, targetLanguage?: string): Language {
  const normalized = (targetLanguage || "").toLowerCase();
  if (normalized.includes("spanish") || normalized.includes("español")) return "Spanish";
  if (normalized.includes("chinese") || normalized.includes("zh") || normalized.includes("中文")) return "Chinese";
  if (normalized.includes("english")) return "English";
  if (/[¿¡ñáéíóúü]/i.test(message) || containsAny(normalizeText(message), ["precio", "cotización", "envío", "descuento", "muestra", "disponible"])) return "Spanish";
  if (/[\u4e00-\u9fff]/.test(message)) return "Chinese";
  return "English";
}

function parseProductContext(productContext?: string) {
  const context = productContext?.trim() || "";
  const lower = normalizeText(context);
  return {
    hasUsefulContext: context.length > 0,
    hasPrice: containsAny(lower, ["price", "usd", "$", "价格", "报价"]),
    hasStock: containsAny(lower, ["stock", "inventory", "库存", "现货"]),
    hasLeadTime: containsAny(lower, ["lead time", "delivery", "days", "交期", "天"]),
    hasShipping: containsAny(lower, ["shipping", "freight", "tracking", "物流", "运费"]),
    hasPayment: containsAny(lower, ["payment", "paypal", "bank", "付款", "支付", "收款账户"]),
    hasProof: containsAny(lower, ["photo", "picture", "video", "catalog", "图片", "实拍", "视频"]),
    hasOrderStatus: containsAny(lower, ["tracking", "order status", "物流状态", "物流单号", "订单状态"])
  };
}

function buildRiskWarnings(analysis: Analysis, context: ProductContextFlags) {
  const warnings = [
    AI_SAFETY_NOTE,
    "AI 仅生成草稿，不会自动发送 WhatsApp 消息。",
    "信息不足时不得编造具体价格、库存、运费、交期或物流状态。"
  ];

  if (analysis.concerns.includes("价格") || analysis.concerns.includes("折扣")) {
    warnings.push(
      context.hasPrice
        ? "涉及价格，请业务员再次确认价格、币种、数量和有效期后再发送。"
        : "涉及价格，但价格信息不足，请业务员确认价格、币种、数量和有效期，不得编造报价。"
    );
  }

  if (analysis.concerns.includes("库存") || analysis.scenario === "sample") {
    warnings.push(
      context.hasStock
        ? "涉及库存或样品，请业务员再次确认可售库存、样品数量和保留时间。"
        : "涉及库存或样品，但库存信息不足，请业务员确认库存和样品可用性后再承诺。"
    );
  }

  if (analysis.concerns.includes("交期")) {
    warnings.push(
      context.hasLeadTime
        ? "涉及交期，请业务员再次确认生产周期、发货时间和节假日影响。"
        : "涉及交期，但交期信息不足，请业务员确认生产周期和发货时间，不得编造交期。"
    );
  }

  if (analysis.concerns.includes("运费") || analysis.concerns.includes("物流") || analysis.concerns.includes("物流状态")) {
    warnings.push(
      context.hasShipping
        ? "涉及运费/物流，请业务员确认国家、城市、运输方式、运费和物流单号后再发送。"
        : "涉及运费/物流，但物流信息不足，请业务员确认国家、城市、运输方式、运费或物流单号，不得编造物流状态。"
    );
  }

  if (analysis.concerns.includes("付款")) {
    warnings.push(
      context.hasPayment
        ? "涉及付款，请业务员再次确认付款方式、收款账户、手续费和到账规则。"
        : "涉及付款，但付款信息不足，请业务员确认付款方式和收款账户，不得编造收款信息。"
    );
  }

  if (analysis.scenario === "product_proof" && !context.hasProof) {
    warnings.push("客户索要实拍或资料，请业务员确认图片、视频或附件真实存在后再发送。");
  }

  if (analysis.scenario === "order_status" && !context.hasOrderStatus) {
    warnings.push("客户查询订单状态，但物流状态不足，请业务员确认订单号和物流单号后再回复，不得编造物流状态。");
  }

  return warnings;
}

function buildReplies(input: {
  language: Language;
  intent: string;
  concerns: string[];
  missing: string[];
  hasUsefulContext: boolean;
}) {
  if (input.language === "Spanish") return buildSpanishReplies(input);
  if (input.language === "Chinese") return buildChineseReplies(input);
  return buildEnglishReplies(input);
}

function buildEnglishReplies(input: { intent: string; missing: string[]; hasUsefulContext: boolean }) {
  const need = englishNeed(input.missing);
  const contextLine = input.hasUsefulContext
    ? "I will also check the product or order details you provided before confirming the final answer."
    : "To avoid giving you inaccurate information, I will confirm the details first.";

  return {
    shortReply: `Thanks for your message. Could you please share ${need}? I will check and get back to you soon.`,
    professionalReply: `Thank you for your inquiry. I understand you are asking about ${englishIntent(input.intent)}. ${contextLine} Could you please confirm ${need} so I can prepare an accurate reply for you?`,
    closingReply: `Thanks, this looks like a good fit. Once you confirm ${need}, I can help check the best available option and move the quotation or next step forward quickly.`
  };
}

function buildSpanishReplies(input: { intent: string; missing: string[]; hasUsefulContext: boolean }) {
  const need = spanishNeed(input.missing);
  const contextLine = input.hasUsefulContext
    ? "También revisaré la información del producto o pedido que compartiste antes de confirmar la respuesta final."
    : "Para evitar darte información incorrecta, primero voy a confirmar los detalles.";

  return {
    shortReply: `Gracias por tu mensaje. ¿Podrías confirmarme ${need}? Lo revisaré y te responderé pronto.`,
    professionalReply: `Gracias por tu consulta. Entiendo que quieres confirmar ${spanishIntent(input.intent)}. ${contextLine} ¿Podrías confirmarme ${need} para prepararte una respuesta precisa?`,
    closingReply: `Gracias, parece una buena oportunidad. Cuando me confirmes ${need}, puedo revisar la mejor opción disponible y avanzar rápidamente con la cotización o el siguiente paso.`
  };
}

function buildChineseReplies(input: { intent: string; missing: string[]; hasUsefulContext: boolean }) {
  const need = input.missing.length > 0 ? input.missing.join("、") : "具体需求";
  const contextLine = input.hasUsefulContext ? "我会结合你提供的产品或订单信息再确认最终答复。" : "为了避免信息不准确，我会先确认关键细节。";

  return {
    shortReply: `收到，谢谢你的消息。请先确认${need}，我会尽快核实后回复你。`,
    professionalReply: `感谢咨询。我理解你主要想确认${input.intent}。${contextLine}麻烦你补充${need}，这样我可以给你更准确的回复。`,
    closingReply: `谢谢，这个需求可以继续推进。你确认${need}后，我可以尽快核实合适方案，并推进报价或下一步。`
  };
}

function translateToChinese(message: string, analysis: Analysis) {
  if (analysis.language === "Chinese") return message;
  return `客户消息大意：客户正在咨询“${analysis.intent}”，识别场景为 ${analysis.scenario}，关注点包括：${analysis.concerns.join("、")}。原文：${message}`;
}

function englishNeed(missing: string[]) {
  if (missing.length === 0) return "your exact requirement";
  return missing.map(toEnglishFact).join(", ");
}

function spanishNeed(missing: string[]) {
  if (missing.length === 0) return "tu requerimiento exacto";
  return missing.map(toSpanishFact).join(", ");
}

function toEnglishFact(fact: string) {
  const map: Record<string, string> = {
    目标数量: "target quantity",
    产品型号: "product model",
    可接受价格: "acceptable target price",
    样品数量: "sample quantity",
    收货国家: "destination country",
    收货城市: "destination city",
    目的地国家: "destination country",
    目的地城市: "destination city",
    运输方式: "preferred shipping method",
    客户关注点: "your main concern",
    下次跟进时间: "a suitable follow-up time",
    付款方式: "preferred payment method",
    收款账户: "payment account details to confirm",
    订单金额: "order amount",
    订单号: "order number",
    物流单号: "tracking number"
  };
  return map[fact] || fact;
}

function toSpanishFact(fact: string) {
  const map: Record<string, string> = {
    目标数量: "la cantidad objetivo",
    产品型号: "el modelo del producto",
    可接受价格: "el precio objetivo aceptable",
    样品数量: "la cantidad de muestra",
    收货国家: "el país de destino",
    收货城市: "la ciudad de destino",
    目的地国家: "el país de destino",
    目的地城市: "la ciudad de destino",
    运输方式: "el método de envío preferido",
    客户关注点: "tu principal preocupación",
    下次跟进时间: "un horario adecuado para seguimiento",
    付款方式: "el método de pago preferido",
    收款账户: "los datos de pago que debemos confirmar",
    订单金额: "el importe del pedido",
    订单号: "el número de pedido",
    物流单号: "el número de seguimiento"
  };
  return map[fact] || fact;
}

function englishIntent(intent: string) {
  const map: Record<string, string> = {
    "询价 / 报价": "price and quotation",
    确认起订量: "MOQ",
    咨询物流: "shipping",
    "价格异议 / 争取折扣": "pricing and discount options",
    样品咨询: "samples",
    咨询交期: "delivery time",
    "索要产品实拍 / 资料": "real product pictures or product proof",
    "客户暂缓 / 跟进": "follow-up timing",
    付款方式咨询: "payment method",
    订单物流状态咨询: "order status"
  };
  return map[intent] || "the details";
}

function spanishIntent(intent: string) {
  const map: Record<string, string> = {
    "询价 / 报价": "precio y cotización",
    确认起订量: "MOQ",
    咨询物流: "envío",
    "价格异议 / 争取折扣": "precio y opciones de descuento",
    样品咨询: "muestras",
    咨询交期: "plazo de entrega",
    "索要产品实拍 / 资料": "fotos reales o prueba del producto",
    "客户暂缓 / 跟进": "seguimiento",
    付款方式咨询: "método de pago",
    订单物流状态咨询: "estado del pedido"
  };
  return map[intent] || "los detalles";
}

function normalizeText(value: string) {
  return value.toLowerCase().normalize("NFC");
}

function containsAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}
