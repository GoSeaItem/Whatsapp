import type { CustomerIntentResponse, IntentLevel } from "@wa-ai/shared";

export type IntentCustomer = {
  id: string;
  name?: string | null;
  tags: string[];
  stage: string;
  interestedProduct?: string | null;
  latestSummary?: string | null;
  nextFollowUpAt?: Date | null;
  notes?: string | null;
};

export type IntentQuote = {
  id?: string;
  customerId: string;
  createdAt: Date;
};

export type IntentFollowUpTask = {
  id?: string;
  customerId: string;
  remindAt: Date;
  status: string;
  completedAt?: Date | null;
};

export type IntentSampleOrder = {
  id?: string;
  customerId: string;
  paymentStatus: string;
  shippingStatus: string;
  feedbackStatus: string;
};

export type IntentCustomRequest = {
  id?: string;
  customerId: string;
  requestType: string;
  quantity?: number | null;
  status: string;
};

export type CustomerIntentRelatedData = {
  quotes?: IntentQuote[];
  followUps?: IntentFollowUpTask[];
  sampleOrders?: IntentSampleOrder[];
  customRequests?: IntentCustomRequest[];
  now?: Date;
};

type ScoreRule = {
  score: number;
  reason: string;
};

export const CUSTOMER_INTENT_RISK_WARNINGS = [
  "意向评分仅作辅助，不代表客户一定成交。",
  "不要因评分高而自动发送消息，所有跟进都必须由业务员手动确认。",
  "涉及价格、库存、交期、运费、付款仍需业务员确认。",
  "当前客户数据较少，评分可能不准确。"
];

const tagRules: Record<string, ScoreRule> = {
  高意向: { score: 30, reason: "标签为高意向" },
  已报价: { score: 15, reason: "客户已打已报价标签" },
  待付款: { score: 35, reason: "客户已进入待付款标签" },
  老客户: { score: 10, reason: "老客户有复购基础" },
  需要跟进: { score: 10, reason: "客户需要跟进" },
  无效客户: { score: -60, reason: "客户被标记为无效客户" }
};

const stageRules: Record<string, ScoreRule> = {
  已沟通需求: { score: 10, reason: "销售阶段为已沟通需求" },
  已推荐产品: { score: 15, reason: "销售阶段为已推荐产品" },
  已报价: { score: 25, reason: "销售阶段为已报价" },
  待付款: { score: 40, reason: "销售阶段为待付款" },
  已成交: { score: 20, reason: "销售阶段为已成交" },
  待复购: { score: 20, reason: "销售阶段为待复购" },
  无效客户: { score: -60, reason: "销售阶段为无效客户" }
};

const keywordRules: Array<{ patterns: string[]; score: number; reason: string }> = [
  { patterns: ["price", "价格", "cuanto", "cuánto", "precio"], score: 10, reason: "聊天内容提到价格" },
  { patterns: ["moq", "起订量"], score: 10, reason: "聊天内容提到 MOQ/起订量" },
  { patterns: ["shipping", "freight", "运费", "envio", "envío"], score: 15, reason: "聊天内容提到物流或运费" },
  { patterns: ["delivery", "lead time", "交期", "entrega"], score: 15, reason: "聊天内容提到交期或交付" },
  { patterns: ["payment", "paypal", "bank transfer", "付款"], score: 25, reason: "聊天内容提到付款方式" },
  { patterns: ["address", "地址", "city", "ciudad"], score: 25, reason: "聊天内容提到地址或城市" },
  { patterns: ["sample", "样品", "muestra"], score: 15, reason: "聊天内容提到样品" },
  { patterns: ["logo", "packaging", "oem", "odm", "定制"], score: 15, reason: "聊天内容提到定制需求" },
  { patterns: ["order", "pi", "invoice"], score: 25, reason: "聊天内容提到订单、PI 或发票" }
];

const negativeKeywordRules: Array<{ patterns: string[]; score: number; reason: string; needsNoQuote?: boolean }> = [
  { patterns: ["no need", "不需要", "not interested"], score: -30, reason: "聊天内容显示客户暂不需要或不感兴趣" },
  { patterns: ["too expensive"], score: -15, reason: "客户认为价格太高且暂无后续报价动作", needsNoQuote: true },
  { patterns: ["later", "think about it", "考虑一下"], score: -10, reason: "客户表示稍后考虑" }
];

export function calculateCustomerIntent(customer: IntentCustomer, relatedData: CustomerIntentRelatedData = {}): CustomerIntentResponse {
  const now = relatedData.now || new Date();
  const quotes = relatedData.quotes || [];
  const followUps = relatedData.followUps || [];
  const sampleOrders = relatedData.sampleOrders || [];
  const customRequests = relatedData.customRequests || [];
  const reasons: string[] = [];
  let score = 0;

  for (const tag of customer.tags || []) {
    const rule = tagRules[tag];
    if (rule) {
      score += rule.score;
      reasons.push(formatReason(rule));
    }
  }

  const stageRule = stageRules[customer.stage];
  if (stageRule) {
    score += stageRule.score;
    reasons.push(formatReason(stageRule));
  }

  if (quotes.length > 0) {
    score += 15;
    reasons.push("+15 有报价记录");
  }
  if (quotes.some((quote) => daysBetween(quote.createdAt, now) <= 3)) {
    score += 20;
    reasons.push("+20 最近 3 天内有报价记录");
  }
  if (quotes.length >= 2) {
    score += 10;
    reasons.push("+10 报价记录数量不少于 2 条");
  }

  const pending = followUps.filter((task) => task.status === "pending");
  if (pending.length > 0) {
    score += 10;
    reasons.push("+10 有 pending 跟进任务");
  }
  if (pending.some((task) => isToday(task.remindAt, now))) {
    score += 15;
    reasons.push("+15 今日待跟进");
  }
  if (pending.some((task) => overdueDays(task.remindAt, now) >= 1 && overdueDays(task.remindAt, now) <= 3)) {
    score -= 10;
    reasons.push("-10 逾期未跟进 1-3 天");
  }
  if (pending.some((task) => overdueDays(task.remindAt, now) > 3)) {
    score -= 20;
    reasons.push("-20 逾期未跟进超过 3 天");
  }
  if (followUps.filter((task) => task.status === "completed").length >= 2) {
    score += 10;
    reasons.push("+10 已完成跟进任务不少于 2 条");
  }

  const keywordText = normalizeText([customer.latestSummary, customer.notes, customer.interestedProduct].filter(Boolean).join(" "));
  for (const rule of keywordRules) {
    if (containsPattern(keywordText, rule.patterns)) {
      score += rule.score;
      reasons.push(`+${rule.score} ${rule.reason}`);
    }
  }
  for (const rule of negativeKeywordRules) {
    if (rule.needsNoQuote && quotes.length > 0) continue;
    if (containsPattern(keywordText, rule.patterns)) {
      score += rule.score;
      reasons.push(`${rule.score} ${rule.reason}`);
    }
  }

  if (customer.nextFollowUpAt && overdueDays(customer.nextFollowUpAt, now) > 7) {
    score -= 20;
    reasons.push("-20 下次跟进时间逾期超过 7 天");
  }

  if (sampleOrders.length > 0) {
    score += 10;
    reasons.push("+10 有样品单记录");
  }
  if (sampleOrders.some((sample) => sample.paymentStatus === "paid")) {
    score += 15;
    reasons.push("+15 样品已付款");
  }
  if (sampleOrders.some((sample) => sample.shippingStatus === "delivered" && sample.feedbackStatus === "satisfied")) {
    score += 20;
    reasons.push("+20 样品已签收且反馈满意");
  }
  if (sampleOrders.some((sample) => sample.feedbackStatus === "converted_to_bulk")) {
    score += 30;
    reasons.push("+30 样品已转大货");
  }
  if (sampleOrders.some((sample) => sample.feedbackStatus === "no_response")) {
    score -= 5;
    reasons.push("-5 样品反馈暂无响应");
  }

  if (customRequests.length > 0) {
    score += 10;
    reasons.push("+10 有定制需求记录");
  }
  if (customRequests.some((item) => ["logo", "packaging", "oem", "odm", "mixed"].includes(item.requestType))) {
    score += 15;
    reasons.push("+15 定制需求包含 logo / packaging / OEM / ODM");
  }
  if (customRequests.some((item) => Number(item.quantity || 0) >= 300)) {
    score += 10;
    reasons.push("+10 定制需求数量较大");
  }
  if (customRequests.some((item) => item.status === "waiting_customer_confirm")) {
    score += 10;
    reasons.push("+10 定制需求等待客户确认");
  }
  if (customRequests.some((item) => item.status === "sample_confirmed")) {
    score += 20;
    reasons.push("+20 定制样品已确认");
  }
  if (customRequests.some((item) => item.status === "cancelled")) {
    score -= 20;
    reasons.push("-20 定制需求已取消");
  }

  const intentScore = clampScore(score);
  const intentLevel = levelForScore(intentScore);
  return {
    customerId: customer.id,
    intentScore,
    intentLevel,
    intentReasons: reasons.length > 0 ? reasons : ["当前客户数据较少，暂无明显意向信号"],
    recommendedAction: recommendedActionFor(customer, intentLevel),
    riskWarnings: buildRiskWarnings(customer, quotes, followUps, keywordText)
  };
}

export function levelForScore(score: number): IntentLevel {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function recommendedActionFor(customer: IntentCustomer, level: IntentLevel) {
  if ((customer.tags || []).includes("无效客户") || customer.stage === "无效客户") {
    return "该客户可能无效，建议减少跟进或标记为无效客户。";
  }
  if (level === "high") {
    return "客户意向较高，建议优先跟进，确认价格、运费、交期或付款方式，推动客户下单。";
  }
  if (level === "medium") {
    return "客户有一定兴趣，建议补充产品资料、确认数量和收货城市，再进行报价。";
  }
  return "客户意向较低，建议先了解需求，不要投入过多人工时间。";
}

function buildRiskWarnings(customer: IntentCustomer, quotes: IntentQuote[], followUps: IntentFollowUpTask[], keywordText: string) {
  const warnings = [
    "意向评分仅作辅助，不代表客户一定成交。",
    "不要因评分高而自动发送消息，所有跟进都必须由业务员手动确认。",
    "涉及价格、库存、交期、运费、付款仍需业务员确认。"
  ];
  if ((customer.tags || []).length === 0 && !customer.latestSummary && !customer.notes && !customer.interestedProduct && quotes.length === 0 && followUps.length === 0) {
    warnings.push("当前客户数据较少，评分可能不准确。");
  } else if (!keywordText && quotes.length === 0) {
    warnings.push("当前客户数据较少，评分可能不准确。");
  }
  return warnings;
}

function formatReason(rule: ScoreRule) {
  return `${rule.score > 0 ? "+" : ""}${rule.score} ${rule.reason}`;
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, score));
}

function isToday(date: Date, now: Date) {
  const start = startOfDay(now);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return date >= start && date < end;
}

function overdueDays(date: Date, now: Date) {
  if (date >= now) return 0;
  return Math.floor((startOfDay(now).getTime() - startOfDay(date).getTime()) / 86_400_000);
}

function daysBetween(date: Date, now: Date) {
  return Math.floor((now.getTime() - date.getTime()) / 86_400_000);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function containsPattern(text: string, patterns: string[]) {
  return patterns.some((pattern) => text.includes(normalizeText(pattern)));
}

function normalizeText(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
