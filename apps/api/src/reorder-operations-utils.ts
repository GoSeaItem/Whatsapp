import type { IntentLevel, ReorderOperationScriptScenario, ReorderOpportunityType } from "@wa-ai/shared";

export const REORDER_OPERATION_TYPES: ReorderOpportunityType[] = [
  "reorder",
  "dormant_reactivation",
  "new_product",
  "replenishment",
  "holiday",
  "high_value",
  "churn_risk"
];

export const REORDER_OPPORTUNITY_STATUSES = new Set(["open", "dismissed", "task_created", "contacted", "converted", "archived"]);
export const REORDER_CAMPAIGN_STATUSES = new Set(["draft", "active", "paused", "completed", "archived"]);
export const REORDER_CAMPAIGN_SCOPES = new Set(["own", "team", "organization"]);
export const REORDER_SCRIPT_SCENARIOS = new Set([
  "reorder_follow_up",
  "dormant_reactivation",
  "new_product_recommendation",
  "replenishment_check",
  "holiday_greeting",
  "high_value_customer_follow_up",
  "churn_risk_recovery"
]);

export type ReorderCustomer = {
  id: string;
  name?: string | null;
  tags?: string[];
  stage?: string | null;
  interestedProduct?: string | null;
  latestSummary?: string | null;
  notes?: string | null;
  ownerId?: string | null;
  organizationId?: string | null;
  assignedTo?: string | null;
  collaborators?: string[];
  updatedAt?: Date;
  intentScore?: number | null;
  intentLevel?: IntentLevel | string | null;
};

export type ReorderProduct = {
  id: string;
  name: string;
  sku?: string | null;
  category?: string | null;
  sellingPoints?: string[];
  createdAt?: Date;
};

export type ReorderOrder = {
  id: string;
  customerId: string;
  productId?: string | null;
  orderStatus?: string | null;
  afterSalesStatus?: string | null;
  amount?: unknown;
  quantity?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
  cost?: { grossMargin?: unknown; costConfirmed?: boolean | null } | null;
};

export type ReorderQuote = {
  id?: string;
  customerId: string;
  productId?: string | null;
  quantity?: number | null;
  unitPrice?: unknown;
  createdAt: Date;
};

export type ReorderFollowUp = {
  id?: string;
  customerId: string;
  remindAt: Date;
  status: string;
  completedAt?: Date | null;
};

export type ReorderRelatedData = {
  orders?: ReorderOrder[];
  quotes?: ReorderQuote[];
  followUps?: ReorderFollowUp[];
  products?: ReorderProduct[];
  now?: Date;
};

export type ReorderOpportunityRuleResult = {
  opportunityType: ReorderOpportunityType;
  score: number;
  level: IntentLevel;
  reasons: string[];
  recommendedAction: string;
  suggestedScript: string;
  productId?: string | null;
  orderId?: string | null;
};

export const REORDER_OPERATION_RISK_WARNINGS = [
  "Reorder operation content is a draft only and will not be sent automatically.",
  "Confirm price, inventory, discount, lead time, shipping cost, and payment details before sending.",
  "Do not invent customer purchase history, stock pressure, new products, discounts, or urgency."
];

export function calculateReorderOpportunities(
  customer: ReorderCustomer,
  related: ReorderRelatedData = {},
  selectedTypes: ReorderOpportunityType[] = REORDER_OPERATION_TYPES
) {
  return selectedTypes
    .map((type) => calculateReorderOpportunity(customer, related, type))
    .filter((item) => item.score > 0 || item.level !== "low");
}

export function calculateReorderOpportunity(customer: ReorderCustomer, related: ReorderRelatedData, type: ReorderOpportunityType): ReorderOpportunityRuleResult {
  const now = related.now || new Date();
  const orders = related.orders || [];
  const quotes = related.quotes || [];
  const followUps = related.followUps || [];
  const products = related.products || [];
  const completedOrders = orders.filter((order) => order.orderStatus === "completed" || order.afterSalesStatus === "closed");
  const latestCompleted = latestDate(completedOrders.map((order) => order.updatedAt || order.createdAt).filter(Boolean) as Date[]);
  const text = normalize([customer.latestSummary, customer.notes, customer.interestedProduct].filter(Boolean).join(" "));
  const reasons: string[] = [];
  let score = 0;
  const add = (points: number, reason: string) => {
    score += points;
    reasons.push(`${points >= 0 ? "+" : ""}${points} ${reason}`);
  };

  if (type === "reorder") {
    if (matches(customer.stage, ["已成交", "待复购", "closed", "reorder"])) add(30, "customer stage indicates closed deal or reorder");
    if (hasTag(customer, ["老客户", "old customer"])) add(20, "customer is tagged as old customer");
    if (completedOrders.length) add(30, "customer has completed order history");
    if (latestCompleted && daysBetween(latestCompleted, now) > 30) add(15, "latest completed order is older than 30 days");
    if (latestCompleted && daysBetween(latestCompleted, now) > 60) add(25, "latest completed order is older than 60 days");
    if (isHighIntent(customer)) add(15, "customer intent is high");
    if (containsAny(text, ["reorder", "restock", "repeat", "再来", "复购", "补货"])) add(30, "conversation mentions reorder or restock");
    if (followUps.filter((task) => task.status === "completed").length >= 2) add(10, "at least two completed follow-ups");
    if (averageGrossMargin(orders) >= 20) add(10, "historical gross margin is healthy");
    if (isInvalid(customer)) add(-50, "invalid customer signal");
    if (orders.some((order) => ["processing", "pending"].includes(String(order.afterSalesStatus || "")))) add(-20, "after-sales issue is not closed");
    if (containsAny(text, ["not interested", "no need", "不需要"])) add(-30, "customer indicated no need or no interest");
  }

  if (type === "dormant_reactivation") {
    const noRecentUpdate = customer.updatedAt ? daysBetween(customer.updatedAt, now) > 30 : false;
    const noFollowUps = followUps.length === 0 || daysSinceLastFollowUp(followUps, now) > 30;
    const oldQuoteNoFollowUp = quotes.some((quote) => daysBetween(quote.createdAt, now) > 14) && noFollowUps;
    const oldOrderNoFollowUp = latestCompleted ? daysBetween(latestCompleted, now) > 60 && noFollowUps : false;
    if (noRecentUpdate) add(25, "customer has no update for over 30 days");
    if (noFollowUps) add(20, "customer has no recent follow-up");
    if (oldQuoteNoFollowUp) add(20, "quoted over 14 days ago without follow-up");
    if (oldOrderNoFollowUp) add(25, "completed order over 60 days ago without follow-up");
    if (quotes.length) add(15, "customer has quote history");
    if (completedOrders.length) add(25, "customer has completed order history");
    if (isHighIntent(customer)) add(20, "customer is or was high intent");
  }

  if (type === "new_product") {
    const matchedProduct = findRelatedProduct(customer, products, now);
    if (matchedProduct) {
      if (matchesProductInterest(customer, matchedProduct)) add(20, "product category or name matches customer interest");
      if (completedOrders.some((order) => order.productId && order.productId !== matchedProduct.id)) add(20, "customer has related order history");
      if (matchedProduct.createdAt && daysBetween(matchedProduct.createdAt, now) <= 30) add(10, "product was added recently");
      if (quotes.filter((quote) => quote.productId === matchedProduct.id && daysBetween(quote.createdAt, now) <= 30).length >= 2) add(10, "product has recent quote activity");
      return finalize(type, score, reasons, customer, matchedProduct.id, null);
    }
    reasons.push("Data is insufficient to recommend a related product safely.");
  }

  if (type === "replenishment") {
    if (completedOrders.length) add(20, "customer has completed order history");
    if (latestCompleted && daysBetween(latestCompleted, now) > 45) add(20, "last completed order is older than 45 days");
    if (hasTag(customer, ["批发", "wholesale"])) add(15, "customer appears to buy wholesale");
    if (orders.some((order) => Number(order.quantity || 0) >= 100)) add(10, "historical order quantity is relatively large");
    if (matches(customer.stage, ["待复购", "reorder"])) add(20, "customer stage is reorder");
  }

  if (type === "holiday") {
    reasons.push("No holiday configuration is available yet; use this as a manual lightweight greeting only.");
    score = 10;
  }

  if (type === "high_value") {
    if (orders.some((order) => Number(order.amount || 0) > 1000)) add(25, "customer has high-value order amount");
    if (averageGrossMargin(orders) >= 20) add(20, "customer has healthy gross margin history");
    if (isHighIntent(customer)) add(20, "customer intent score is high");
    if (quotes.length >= 2 || followUps.length >= 2) add(10, "customer has multiple sales interactions");
    if (matches(customer.stage, ["待付款", "pending payment"])) add(30, "customer is in pending payment stage");
  }

  if (type === "churn_risk") {
    if (isHighIntent(customer) && daysSinceLastFollowUp(followUps, now) > 7) add(25, "high-intent customer has no follow-up in over 7 days");
    if (quotes.some((quote) => daysBetween(quote.createdAt, now) > 7) && followUps.length === 0) add(20, "quote older than 7 days without follow-up");
    if (orders.some((order) => ["processing", "pending"].includes(String(order.afterSalesStatus || "")))) add(20, "after-sales issue is still open");
    if (containsAny(text, ["too expensive", "price too high"])) add(15, "customer raised price objection");
  }

  const representativeOrder = completedOrders[0] || orders[0] || null;
  return finalize(type, score, reasons, customer, representativeOrder?.productId || null, representativeOrder?.id || null);
}

export function buildReorderOperationScript(input: {
  customer: ReorderCustomer;
  product?: ReorderProduct | null;
  opportunity?: { opportunityType?: string | null; reasons?: unknown; orderId?: string | null } | null;
  scenario: string;
  targetLanguage?: string | null;
  tone?: string | null;
  hasCompletedOrder?: boolean;
  knowledgeUsed?: string[];
}) {
  const name = input.customer.name || "there";
  const product = input.product?.name ? ` for ${input.product.name}` : "";
  const hasOrder = Boolean(input.hasCompletedOrder || input.opportunity?.orderId);
  const previousContext = hasOrder ? "your previous order" : "our previous discussion";
  const scripts: Record<string, string> = {
    reorder_follow_up: `Hi ${name}, I wanted to check whether you would like to review a reorder plan${product}. I will confirm the current price, inventory, and lead time before sharing final details.`,
    dormant_reactivation: `Hi ${name}, we have not spoken for a while, so I wanted to check whether your project is still active. If you need updated options${product}, I can review them and confirm price, inventory, and delivery time first.`,
    new_product_recommendation: `Hi ${name}, based on ${previousContext}, I can share another suitable option${product}. Please treat it as a reference first; I will confirm availability, price, and lead time before any commitment.`,
    replenishment_check: `Hi ${name}, I am checking whether you may need to review a restock plan${product}. I will confirm the latest stock, price, and lead time before sending a formal proposal.`,
    holiday_greeting: `Hi ${name}, hope everything is going well. If you are planning upcoming purchases${product}, I can help prepare updated product details after confirming price, inventory, and lead time.`,
    high_value_customer_follow_up: `Hi ${name}, I can prioritize checking the latest details for your project${product}. Please confirm quantity, destination city, and any updated requirements before I prepare the next step.`,
    churn_risk_recovery: `Hi ${name}, I wanted to follow up carefully on ${previousContext}. Please let me know whether price, shipping, timing, or product details are the main concern so I can review it properly.`
  };
  const scriptText = scripts[input.scenario] || scripts.reorder_follow_up;
  return {
    scriptText,
    alternativeScripts: [
      scriptText,
      `Short version: ${scriptText}`,
      `Professional version: ${scriptText}`
    ].slice(0, 3),
    missingInfo: ["current price", "inventory", "discount approval", "lead time", "shipping cost", "payment details"],
    riskWarnings: REORDER_OPERATION_RISK_WARNINGS,
    knowledgeUsed: input.knowledgeUsed || []
  };
}

export function serializeReasons(value: unknown) {
  if (Array.isArray(value)) return value.map(String);
  if (value && typeof value === "object") return Object.values(value).map(String);
  return [];
}

function finalize(type: ReorderOpportunityType, score: number, reasons: string[], customer: ReorderCustomer, productId?: string | null, orderId?: string | null): ReorderOpportunityRuleResult {
  const finalScore = clamp(score);
  return {
    opportunityType: type,
    score: finalScore,
    level: levelForScore(finalScore),
    reasons: reasons.length ? reasons : ["Data is insufficient; keep collecting customer, order, quote, and follow-up signals."],
    recommendedAction: recommendedActionFor(type, finalScore),
    suggestedScript: buildReorderOperationScript({
      customer,
      scenario: scenarioForType(type),
      hasCompletedOrder: Boolean(orderId),
      product: null
    }).scriptText,
    productId,
    orderId
  };
}

function scenarioForType(type: ReorderOpportunityType): ReorderOperationScriptScenario {
  if (type === "dormant_reactivation") return "dormant_reactivation";
  if (type === "new_product") return "new_product_recommendation";
  if (type === "replenishment") return "replenishment_check";
  if (type === "holiday") return "holiday_greeting";
  if (type === "high_value") return "high_value_customer_follow_up";
  if (type === "churn_risk") return "churn_risk_recovery";
  return "reorder_follow_up";
}

function recommendedActionFor(type: ReorderOpportunityType, score: number) {
  if (score < 40) return "Keep this customer in low-frequency manual follow-up; do not create pressure.";
  if (type === "reorder") return "Prepare a reorder draft and manually confirm price, inventory, lead time, and shipping cost.";
  if (type === "dormant_reactivation") return "Send a light reactivation draft and ask whether the project is still active.";
  if (type === "new_product") return "Share a related option as a draft only; avoid claiming it is a new arrival unless confirmed.";
  if (type === "replenishment") return "Ask whether the customer needs restock; do not claim they must replenish.";
  if (type === "holiday") return "Send a light greeting and optional product reference without fake urgency.";
  if (type === "high_value") return "Prioritize manual follow-up and confirm price, stock, shipping, and payment details.";
  return "Recover the conversation carefully by asking about blockers without pressure.";
}

function findRelatedProduct(customer: ReorderCustomer, products: ReorderProduct[], now: Date) {
  return products.find((product) => matchesProductInterest(customer, product))
    || products.find((product) => product.createdAt && daysBetween(product.createdAt, now) <= 30)
    || null;
}

function matchesProductInterest(customer: ReorderCustomer, product: ReorderProduct) {
  const interest = normalize(customer.interestedProduct || "");
  if (!interest) return false;
  return Boolean(
    normalize(product.name).includes(interest)
    || interest.includes(normalize(product.name))
    || (product.category && interest.includes(normalize(product.category)))
  );
}

function averageGrossMargin(orders: ReorderOrder[]) {
  const margins = orders
    .map((order) => Number(order.cost?.grossMargin ?? Number.NaN))
    .filter((value) => Number.isFinite(value));
  if (!margins.length) return 0;
  return margins.reduce((sum, value) => sum + value, 0) / margins.length;
}

function latestDate(dates: Date[]) {
  return dates.sort((a, b) => b.getTime() - a.getTime())[0] || null;
}

function daysSinceLastFollowUp(followUps: ReorderFollowUp[], now: Date) {
  if (!followUps.length) return Number.POSITIVE_INFINITY;
  const latest = latestDate(followUps.map((task) => task.completedAt || task.remindAt));
  return latest ? daysBetween(latest, now) : Number.POSITIVE_INFINITY;
}

function isHighIntent(customer: ReorderCustomer) {
  return customer.intentLevel === "high" || Number(customer.intentScore || 0) >= 70;
}

function isInvalid(customer: ReorderCustomer) {
  return matches(customer.stage, ["无效客户", "invalid"]) || hasTag(customer, ["无效客户", "invalid"]);
}

function hasTag(customer: ReorderCustomer, tags: string[]) {
  const normalized = (customer.tags || []).map(normalize);
  return tags.some((tag) => normalized.includes(normalize(tag)));
}

function matches(value: string | null | undefined, targets: string[]) {
  const normalized = normalize(value || "");
  return targets.some((target) => normalized === normalize(target) || normalized.includes(normalize(target)));
}

function containsAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(normalize(needle)));
}

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function daysBetween(date: Date, now: Date) {
  return Math.floor((now.getTime() - new Date(date).getTime()) / 86_400_000);
}

function clamp(value: number) {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

function levelForScore(score: number): IntentLevel {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}
