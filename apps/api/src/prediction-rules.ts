import type { IntentLevel, PredictionType } from "@wa-ai/shared";

export type { PredictionType };

export type PredictionCustomer = {
  id: string;
  name?: string | null;
  country?: string | null;
  tags?: string[];
  stage?: string | null;
  interestedProduct?: string | null;
  latestSummary?: string | null;
  notes?: string | null;
  nextFollowUpAt?: Date | null;
  ownerId?: string | null;
  organizationId?: string | null;
  assignedTo?: string | null;
  updatedAt?: Date;
  createdAt?: Date;
  intentScore?: number | null;
  intentLevel?: IntentLevel | string | null;
};

export type PredictionQuote = {
  id?: string;
  customerId: string;
  productId?: string | null;
  quantity?: number | null;
  unitPrice?: unknown;
  createdAt: Date;
};

export type PredictionFollowUp = {
  id?: string;
  customerId: string;
  remindAt: Date;
  status: string;
  completedAt?: Date | null;
};

export type PredictionSampleOrder = {
  id?: string;
  customerId: string;
  productId?: string | null;
  paymentStatus: string;
  shippingStatus: string;
  feedbackStatus: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type PredictionCustomRequest = {
  id?: string;
  customerId: string;
  productId?: string | null;
  requestType: string;
  quantity?: number | null;
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type PredictionRelatedData = {
  quotes?: PredictionQuote[];
  followUps?: PredictionFollowUp[];
  sampleOrders?: PredictionSampleOrder[];
  customRequests?: PredictionCustomRequest[];
  now?: Date;
};

export type PredictionResult = {
  predictionType: PredictionType;
  score: number;
  level: IntentLevel;
  reasons: string[];
  recommendedAction: string;
  suggestedScript: string;
};

const predictionTypes: PredictionType[] = ["reorder", "dormant", "high_value", "churn_risk"];

export function calculateCustomerPredictions(
  customer: PredictionCustomer,
  related: PredictionRelatedData = {},
  selectedTypes: PredictionType[] = predictionTypes
) {
  return selectedTypes
    .filter((type) => type !== "product_opportunity")
    .map((type) => calculateCustomerPrediction(customer, related, type))
    .filter((item) => item.score > 0 || item.level !== "low");
}

export function calculateCustomerPrediction(customer: PredictionCustomer, related: PredictionRelatedData, predictionType: PredictionType): PredictionResult {
  const now = related.now || new Date();
  const quotes = related.quotes || [];
  const followUps = related.followUps || [];
  const sampleOrders = related.sampleOrders || [];
  const customRequests = related.customRequests || [];
  const reasons: string[] = [];
  let score = 0;
  const text = normalize([customer.latestSummary, customer.notes, customer.interestedProduct].filter(Boolean).join(" "));

  const add = (points: number, reason: string) => {
    score += points;
    reasons.push(`${points >= 0 ? "+" : ""}${points} ${reason}`);
  };

  if (predictionType === "reorder") {
    if (matches(customer.stage, ["已成交", "待复购", "closed", "reorder"])) add(30, "customer stage indicates previous deal or reorder");
    if (hasTag(customer, ["老客户", "old customer"])) add(20, "customer is tagged as old customer");
    if (quotes.some((quote) => daysBetween(quote.createdAt, now) > 30)) add(15, "has quote records older than 30 days");
    if (sampleOrders.some((sample) => sample.feedbackStatus === "converted_to_bulk")) add(20, "sample converted to bulk order signal");
    if (customRequests.some((item) => ["sample_confirmed", "bulk_production"].includes(item.status))) add(20, "custom request has advanced status");
    if (containsAny(text, ["reorder", "restock", "repeat", "再来", "复购", "补货"])) add(30, "conversation mentions reorder/restock");
    if (customer.intentLevel === "high" || Number(customer.intentScore || 0) >= 70) add(15, "customer intent is high");
    if (followUps.filter((task) => task.status === "completed").length >= 2) add(10, "at least two completed follow-ups");
    if (isInvalid(customer)) add(-50, "invalid customer signal");
    if (containsAny(text, ["no need", "not interested", "不需要"])) add(-30, "customer indicated no need or no interest");
  }

  if (predictionType === "dormant") {
    const dormantByUpdate = customer.updatedAt ? daysBetween(customer.updatedAt, now) > 30 : false;
    const overdueFollowUp = customer.nextFollowUpAt ? daysBetween(customer.nextFollowUpAt, now) > 14 : false;
    const quotedNoFollowUp = quotes.some((quote) => daysBetween(quote.createdAt, now) > 14) && followUps.length === 0;
    if (dormantByUpdate) add(25, "customer has not been updated for over 30 days");
    if (overdueFollowUp) add(20, "next follow-up is overdue by more than 14 days");
    if (quotedNoFollowUp) add(20, "quoted over 14 days ago without follow-up");
    if (matches(customer.stage, ["已报价", "quoted"])) add(20, "customer is already quoted");
    if (customer.intentLevel === "high" || Number(customer.intentScore || 0) >= 70) add(20, "customer was high intent");
    if (quotes.length) add(15, "has quote history");
    if (sampleOrders.length) add(10, "has sample order history");
    if (customRequests.length) add(10, "has custom request history");
  }

  if (predictionType === "high_value") {
    if (quotes.some((quote) => quoteAmount(quote) > 1000)) add(25, "quote amount is above 1000");
    if (quotes.length >= 2) add(15, "multiple quotes");
    if (sampleOrders.some((sample) => sample.paymentStatus === "paid")) add(15, "paid sample order");
    if (customRequests.some((item) => Number(item.quantity || 0) >= 300)) add(20, "large quantity custom request");
    if (customer.intentLevel === "high" || Number(customer.intentScore || 0) >= 70) add(20, "high intent score");
    if (matches(customer.stage, ["待付款", "pending payment"])) add(30, "pending payment stage");
  }

  if (predictionType === "churn_risk") {
    if ((customer.intentLevel === "high" || Number(customer.intentScore || 0) >= 70) && daysSinceLastFollowUp(followUps, now) > 7) add(25, "high-intent customer has no follow-up in over 7 days");
    if (quotes.some((quote) => daysBetween(quote.createdAt, now) > 7) && followUps.length === 0) add(20, "quote older than 7 days with no follow-up");
    if (containsAny(text, ["too expensive", "price too high"]) && !quotes.some((quote) => daysBetween(quote.createdAt, now) <= 7)) add(15, "price objection without recent quote adjustment");
    if (sampleOrders.some((sample) => sample.shippingStatus === "delivered" && sample.feedbackStatus === "no_response")) add(20, "sample delivered with no response");
    if (customRequests.some((item) => item.status === "waiting_customer_confirm" && daysBetween(item.updatedAt || item.createdAt || now, now) > 7)) add(20, "custom request waiting for confirmation over 7 days");
    if (followUps.some((task) => task.status === "pending" && daysBetween(task.remindAt, now) > 7)) add(20, "pending follow-up overdue by over 7 days");
  }

  score = clamp(score);
  return {
    predictionType,
    score,
    level: levelForScore(score),
    reasons,
    recommendedAction: recommendedActionFor(predictionType, score),
    suggestedScript: scriptForPrediction(customer, predictionType)
  };
}

export function calculateProductOpportunities(input: {
  products: Array<{ id: string; name: string; sku?: string | null; category?: string | null }>;
  customers: Array<{ interestedProduct?: string | null }>;
  quotes: PredictionQuote[];
  sampleOrders: PredictionSampleOrder[];
  customRequests: PredictionCustomRequest[];
  materials?: Array<{ productId?: string | null }>;
  now?: Date;
}) {
  const now = input.now || new Date();
  return input.products.map((product) => {
    const reasons: string[] = [];
    let score = 0;
    const name = normalize(product.name);
    const interestedCount = input.customers.filter((customer) => normalize(customer.interestedProduct || "").includes(name) && name).length;
    const recentQuotes = input.quotes.filter((quote) => quote.productId === product.id && daysBetween(quote.createdAt, now) <= 30).length;
    const materialCount = (input.materials || []).filter((item) => item.productId === product.id).length;
    const sampleCount = input.sampleOrders.filter((item) => item.productId === product.id).length;
    const customCount = input.customRequests.filter((item) => item.productId === product.id).length;
    if (interestedCount >= 2) { score += 20; reasons.push("+20 multiple customers mention this product"); }
    if (recentQuotes >= 2) { score += 20; reasons.push("+20 product has multiple recent quotes"); }
    if (materialCount >= 2) { score += 10; reasons.push("+10 product has reusable sales materials"); }
    if (sampleCount >= 1) { score += 15; reasons.push("+15 product has sample demand"); }
    if (customCount >= 1) { score += 15; reasons.push("+15 product has custom request demand"); }
    if (!reasons.length) reasons.push("Data is insufficient; keep collecting customer, quote, sample, and custom request data.");
    return {
      productId: product.id,
      productName: product.name,
      sku: product.sku || null,
      category: product.category || null,
      score: clamp(score),
      level: levelForScore(score),
      reasons,
      recommendedAction: score >= 40 ? "Prepare product materials and follow up with interested customers manually." : "Continue collecting customer and quote signals before taking action."
    };
  }).sort((left, right) => right.score - left.score);
}

export const REORDER_RISK_WARNINGS = [
  "Reorder scripts are drafts only and will not be sent automatically.",
  "Confirm price, inventory, discount, lead time, shipping cost, and payment details before sending.",
  "Do not create false urgency, fake stock pressure, fake purchase history, or unapproved discounts."
];

export function buildReorderScript(input: { customer: PredictionCustomer; productName?: string | null; reminderType: string; targetLanguage?: string | null; tone?: string | null }) {
  const productText = input.productName ? ` about ${input.productName}` : "";
  const base = {
    reorder: `Hi ${input.customer.name || "there"}, we previously discussed${productText}. Would you like to review a reorder or restock plan? I will confirm current price, inventory, and lead time before sending details.`,
    dormant_reactivation: `Hi ${input.customer.name || "there"}, just checking whether your project is still active. If you need updated product details or shipping options, I can confirm them before sending a new proposal.`,
    product_recommendation: `Hi ${input.customer.name || "there"}, based on our previous discussion, I can share a suitable product option${productText}. I will confirm availability, price, and lead time before making any commitment.`,
    churn_risk_follow_up: `Hi ${input.customer.name || "there"}, I wanted to follow up on the previous quotation and requirements. Please let me know whether price, shipping, MOQ, or timing is the main concern so I can review it carefully.`,
    high_value_follow_up: `Hi ${input.customer.name || "there"}, I can prioritize checking the latest details for your project. Please confirm quantity, destination city, and any updated requirements before I prepare the next step.`
  } as Record<string, string>;
  const scriptText = base[input.reminderType] || base.reorder;
  return {
    scriptText,
    alternativeScripts: [
      scriptText,
      `Short version: ${scriptText}`,
      `Professional version: ${scriptText}`
    ].slice(0, 3),
    missingInfo: ["current price", "inventory", "lead time", "shipping cost", "payment details"],
    riskWarnings: REORDER_RISK_WARNINGS
  };
}

function recommendedActionFor(type: PredictionType, score: number) {
  if (score < 40) return "Monitor the customer and keep collecting signals.";
  if (type === "reorder") return "Generate a reorder draft and manually confirm current price, inventory, and lead time.";
  if (type === "dormant") return "Send a light reactivation draft and ask whether the project is still active.";
  if (type === "high_value") return "Prioritize manual follow-up and confirm payment, shipping, and product details.";
  if (type === "churn_risk") return "Follow up carefully, ask about blockers, and avoid pressure or fake urgency.";
  return "Review product demand and prepare supporting materials.";
}

function scriptForPrediction(customer: PredictionCustomer, type: PredictionType) {
  return buildReorderScript({
    customer,
    productName: customer.interestedProduct,
    reminderType: type === "dormant" ? "dormant_reactivation" : type === "churn_risk" ? "churn_risk_follow_up" : type === "high_value" ? "high_value_follow_up" : "reorder"
  }).scriptText;
}

function quoteAmount(quote: PredictionQuote) {
  const unit = Number(quote.unitPrice || 0);
  const quantity = Number(quote.quantity || 0);
  return Number.isFinite(unit * quantity) ? unit * quantity : 0;
}

function daysSinceLastFollowUp(followUps: PredictionFollowUp[], now: Date) {
  if (!followUps.length) return Number.POSITIVE_INFINITY;
  const latest = followUps.map((task) => task.completedAt || task.remindAt).sort((a, b) => b.getTime() - a.getTime())[0];
  return daysBetween(latest, now);
}

function daysBetween(date: Date, now: Date) {
  return Math.floor((now.getTime() - new Date(date).getTime()) / 86_400_000);
}

function hasTag(customer: PredictionCustomer, tags: string[]) {
  return (customer.tags || []).some((tag) => matches(tag, tags));
}

function isInvalid(customer: PredictionCustomer) {
  return matches(customer.stage, ["无效客户", "invalid"]) || hasTag(customer, ["无效客户", "invalid"]);
}

function matches(value: string | null | undefined, options: string[]) {
  const text = normalize(value || "");
  return options.some((item) => text.includes(normalize(item)));
}

function containsAny(text: string, options: string[]) {
  return options.some((item) => text.includes(normalize(item)));
}

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function clamp(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function levelForScore(score: number): IntentLevel {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}
