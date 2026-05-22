const costFields = [
  "productCost",
  "packagingCost",
  "domesticShipping",
  "internationalShipping",
  "paymentFee",
  "platformFee",
  "refundAmount",
  "reshipCost",
  "otherCost"
] as const;

export type CostField = typeof costFields[number];
export type ProfitRiskLevel = "low" | "medium" | "high";
export type MarginLevel = "loss" | "low" | "normal" | "high";

export function calculateOrderProfit(order: any, cost: any = null) {
  const revenue = numberValue(order?.amount);
  const costCurrency = clean(cost?.currency) || clean(order?.currency) || null;
  const orderCurrency = clean(order?.currency) || null;
  const costItems = Object.fromEntries(costFields.map((field) => [field, decimalString(cost?.[field])])) as Record<CostField, string | null>;
  const numericCosts = Object.fromEntries(costFields.map((field) => [field, numberValue(cost?.[field])])) as Record<CostField, number>;
  const totalCost = roundMoney(costFields.reduce((sum, field) => sum + numericCosts[field], 0));
  const hasAnyCost = costFields.some((field) => cost?.[field] !== null && cost?.[field] !== undefined && cost?.[field] !== "");
  const riskWarnings = [
    "Profit and cost review is for sales operation reference only. It is not an accounting report or tax advice.",
    "All amounts, costs, refunds, reship costs, fees, and margin must be manually confirmed by the salesperson or manager/owner."
  ];
  const missingInfo: string[] = [];
  let grossProfit: number | null = null;
  let grossMargin: number | null = null;
  let riskLevel: ProfitRiskLevel = "low";
  let marginLevel: MarginLevel = "normal";

  if (!revenue || revenue <= 0) {
    missingInfo.push("order amount");
    riskWarnings.push("Order amount is empty or invalid, so gross profit and gross margin cannot be calculated.");
    riskLevel = "medium";
  } else {
    grossProfit = roundMoney(revenue - totalCost);
    grossMargin = roundPercent((grossProfit / revenue) * 100);
    if (grossMargin < 0) {
      marginLevel = "loss";
      riskLevel = "high";
      riskWarnings.push("Gross margin is below 0%. This is a loss-making order unless costs or revenue are corrected.");
    } else if (grossMargin < 10) {
      marginLevel = "low";
      riskLevel = "medium";
      riskWarnings.push("Gross margin is below 10%. This is a low-margin order and should be reviewed before repeating similar deals.");
    } else if (grossMargin >= 30) {
      marginLevel = "high";
    }
  }

  if (!hasAnyCost) {
    missingInfo.push("cost items");
    riskWarnings.push("No cost items are filled. Profit may be overstated until product cost, shipping, fees, refunds, and other costs are confirmed.");
    if (riskLevel === "low") riskLevel = "medium";
  }

  if (orderCurrency && costCurrency && orderCurrency !== costCurrency) {
    riskWarnings.push("Order currency and cost currency are different. No exchange-rate conversion is performed; manually convert before reviewing profit.");
    if (riskLevel === "low") riskLevel = "medium";
  }

  if (cost && cost.costConfirmed !== true) {
    riskWarnings.push("Cost is not confirmed. Treat this margin as an estimate until it is confirmed.");
  }

  return {
    id: cost?.id || null,
    orderId: order.id,
    orderNo: order.orderNo || null,
    revenue: decimalString(order?.amount),
    currency: orderCurrency,
    costCurrency,
    costItems,
    totalCost: decimalString(totalCost),
    grossProfit: grossProfit === null ? null : decimalString(grossProfit),
    grossMargin: grossMargin === null ? null : decimalString(grossMargin),
    marginLevel,
    costConfirmed: Boolean(cost?.costConfirmed),
    confirmedBy: cost?.confirmedBy || null,
    confirmedAt: toIso(cost?.confirmedAt),
    riskLevel,
    riskWarnings: Array.from(new Set(riskWarnings)),
    missingInfo: Array.from(new Set(missingInfo)),
    notes: cost?.notes || null,
    updatedAt: toIso(cost?.updatedAt)
  };
}

export function toOrderCostData(body: any, order: any, userId: string) {
  const costData: Record<string, unknown> = {
    organizationId: order.organizationId || null,
    orderId: order.id,
    currency: clean(body.currency) || clean(order.currency) || null,
    notes: clean(body.notes) || null,
    createdBy: userId
  };
  for (const field of costFields) {
    if (body[field] !== undefined) costData[field] = decimalInput(body[field]);
  }
  const calculated = calculateOrderProfit(order, costData);
  costData.totalCost = calculated.totalCost;
  costData.grossProfit = calculated.grossProfit;
  costData.grossMargin = calculated.grossMargin;
  return costData;
}

export function validateOrderCostPayload(body: any) {
  const errors: Array<{ field: string; message: string }> = [];
  for (const field of costFields) {
    if (body?.[field] !== undefined && body[field] !== null && body[field] !== "" && Number.isNaN(Number(body[field]))) {
      errors.push({ field, message: `${field} must be a number` });
    }
  }
  return errors;
}

export function generateProfitReview(input: {
  scope: string;
  targetName?: string | null;
  summary: ReturnType<typeof calculateOrderProfit> | null;
}) {
  const missingInfo = input.summary?.missingInfo || [];
  const riskWarnings = [
    "AI profit review is an operational suggestion only, not accounting, tax, or legal advice.",
    "Do not use this review as a final financial report. Confirm all revenue, costs, fees, refunds, and currency conversion manually.",
    ...(input.summary?.riskWarnings || [])
  ];
  const findings: string[] = [];
  const recommendedActions: string[] = [];
  if (!input.summary) {
    findings.push("Current data is insufficient for a detailed profit review.");
    recommendedActions.push("Add confirmed order amount and cost items before reviewing margin.");
  } else {
    findings.push(`Revenue: ${input.summary.currency || ""} ${input.summary.revenue || "unconfirmed"}`.trim());
    findings.push(`Total cost: ${input.summary.costCurrency || input.summary.currency || ""} ${input.summary.totalCost || "0.00"}`.trim());
    findings.push(`Gross margin: ${input.summary.grossMargin ?? "unconfirmed"}% (${input.summary.marginLevel})`);
    if (input.summary.marginLevel === "loss") recommendedActions.push("Review quote price, product cost, shipping, refunds, and reship cost before accepting similar orders.");
    if (input.summary.marginLevel === "low") recommendedActions.push("Check whether shipping, payment fees, packaging, or discount policy should be adjusted for similar deals.");
    if (!input.summary.costConfirmed) recommendedActions.push("Ask manager/owner to confirm costs before using this result for business decisions.");
    if (!recommendedActions.length) recommendedActions.push("Keep tracking actual cost and after-sales cost before repeating the deal.");
  }
  return {
    reviewSummary: `${titleCase(input.scope)} profit review for ${input.targetName || "selected data"}. This is a lightweight sales operation review only.`,
    findings,
    riskWarnings: Array.from(new Set(riskWarnings)),
    recommendedActions,
    missingInfo
  };
}

export function marginLevelFromSummary(summary: ReturnType<typeof calculateOrderProfit>) {
  return summary.marginLevel;
}

export const ORDER_COST_FIELDS = costFields;

function numberValue(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "object" && typeof (value as { toNumber?: unknown }).toNumber === "function") return (value as { toNumber: () => number }).toNumber();
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function decimalInput(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function decimalString(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "object" && typeof (value as { toFixed?: unknown }).toFixed === "function") return (value as { toFixed: (digits: number) => string }).toFixed(2);
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(2) : String(value);
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function roundPercent(value: number) {
  return Math.round(value * 100) / 100;
}

function toIso(value: unknown) {
  return value instanceof Date ? value.toISOString() : value ? String(value) : null;
}

function titleCase(value: string) {
  return value ? value.slice(0, 1).toUpperCase() + value.slice(1) : "Profit";
}
