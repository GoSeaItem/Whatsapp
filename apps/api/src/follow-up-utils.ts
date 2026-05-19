import type {
  CustomerSummary,
  FollowUpDetail,
  FollowUpStatus,
  FollowUpTaskType,
  FollowUpUpsertRequest,
  WorkbenchDashboard
} from "@wa-ai/shared";
import { serializeCustomer } from "./customer-utils.js";

export const FOLLOW_UP_TASK_TYPES: FollowUpTaskType[] = [
  "报价后跟进",
  "催付款",
  "样品反馈",
  "老客户复购",
  "售后跟进",
  "普通提醒"
];

export const FOLLOW_UP_STATUSES: FollowUpStatus[] = ["pending", "completed", "cancelled"];

type RawCustomer = Parameters<typeof serializeCustomer>[0];

type RawFollowUp = {
  id: string;
  customerId: string;
  taskType: string;
  remindAt: Date;
  recommendedScript: string;
  status: string;
  ownerId: string;
  createdAt: Date;
  completedAt: Date | null;
  customer: RawCustomer;
};

export function validateFollowUpPayload(input: Partial<FollowUpUpsertRequest>, options: { partial?: boolean } = {}) {
  const errors: Array<{ field: string; message: string }> = [];
  const shouldValidate = (field: keyof FollowUpUpsertRequest) => !options.partial || field in input;

  if (shouldValidate("customerId") && !cleanString(input.customerId)) {
    errors.push({ field: "customerId", message: "客户不能为空" });
  }
  if (shouldValidate("taskType") && !FOLLOW_UP_TASK_TYPES.includes(input.taskType as FollowUpTaskType)) {
    errors.push({ field: "taskType", message: "任务类型不正确" });
  }
  if (shouldValidate("remindAt")) {
    const remindAt = cleanString(input.remindAt);
    if (!remindAt || Number.isNaN(Date.parse(remindAt))) {
      errors.push({ field: "remindAt", message: "提醒时间格式不正确" });
    }
  }
  if (input.status !== undefined && !FOLLOW_UP_STATUSES.includes(input.status)) {
    errors.push({ field: "status", message: "任务状态不正确" });
  }
  if (cleanString(input.recommendedScript).length > 2000) {
    errors.push({ field: "recommendedScript", message: "推荐话术不能超过 2000 个字符" });
  }

  return errors;
}

export function toFollowUpCreateData(input: FollowUpUpsertRequest, ownerId: string) {
  const taskType = input.taskType;
  return {
    customerId: input.customerId,
    taskType,
    remindAt: new Date(input.remindAt),
    recommendedScript: cleanString(input.recommendedScript) || generateRecommendedScript(taskType),
    status: input.status || "pending",
    ownerId,
    completedAt: input.status === "completed" ? new Date() : null
  };
}

export function toFollowUpUpdateData(input: Partial<FollowUpUpsertRequest>) {
  const data: Record<string, unknown> = {};
  if (input.customerId !== undefined) data.customerId = cleanString(input.customerId);
  if (input.taskType !== undefined) data.taskType = input.taskType;
  if (input.remindAt !== undefined) data.remindAt = new Date(input.remindAt);
  if (input.recommendedScript !== undefined) data.recommendedScript = cleanString(input.recommendedScript);
  if (input.status !== undefined) {
    data.status = input.status;
    data.completedAt = input.status === "completed" ? new Date() : null;
  }
  if (input.taskType !== undefined && input.recommendedScript === undefined) {
    data.recommendedScript = generateRecommendedScript(input.taskType);
  }
  return data;
}

export function serializeFollowUp(task: RawFollowUp): FollowUpDetail {
  return {
    id: task.id,
    customerId: task.customerId,
    customerName: task.customer.name,
    whatsappNumber: task.customer.whatsappNumber,
    tags: task.customer.tags,
    stage: task.customer.stage,
    taskType: task.taskType as FollowUpTaskType,
    remindAt: task.remindAt.toISOString(),
    recommendedScript: task.recommendedScript,
    status: task.status as FollowUpStatus,
    ownerId: task.ownerId,
    createdAt: task.createdAt.toISOString(),
    completedAt: task.completedAt?.toISOString() || null
  };
}

export function generateRecommendedScript(taskType: FollowUpTaskType) {
  const scripts: Record<FollowUpTaskType, string> = {
    报价后跟进:
      "Hi, just checking if you had a chance to review the quotation. Would you like us to keep stock for you or adjust the quantity? This is only a draft; please confirm price, stock, lead time, and shipping before sending.",
    催付款:
      "Hi, may I confirm if the payment arrangement is ready? We will proceed after payment is confirmed. This is only a draft; please confirm payment method, account, price, stock, and lead time before sending.",
    样品反馈:
      "Hi, did you receive the sample and test it? Please let me know your feedback, and I can help adjust the product details if needed. This is only a draft and will not be sent automatically.",
    老客户复购:
      "Hi, hope everything is going well. Would you like to reorder the previous product or check the latest options? This is only a draft; please confirm price, stock, lead time, and shipping before sending.",
    售后跟进:
      "Hi, I am following up to check whether everything is working well after delivery. If you need support, please send details or photos. This is only a draft and will not be sent automatically.",
    普通提醒:
      "Hi, just following up on our previous conversation. Please let me know if you need any more details. This is only a draft; please confirm key information before sending."
  };
  return scripts[taskType];
}

export function getDayRange(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export function buildDashboard(input: {
  today: RawFollowUp[];
  overdue: RawFollowUp[];
  future: RawFollowUp[];
  quotedWithoutFollowUp: RawCustomer[];
  highIntent: RawCustomer[];
  recentCustomers: RawCustomer[];
}): WorkbenchDashboard {
  return {
    today: input.today.map(serializeFollowUp),
    overdue: input.overdue.map(serializeFollowUp),
    future: input.future.map(serializeFollowUp),
    quotedWithoutFollowUp: input.quotedWithoutFollowUp.map((customer) => serializeCustomer(customer) as CustomerSummary),
    highIntent: input.highIntent.map((customer) => serializeCustomer(customer) as CustomerSummary),
    recentCustomers: input.recentCustomers.map((customer) => serializeCustomer(customer) as CustomerSummary)
  };
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
