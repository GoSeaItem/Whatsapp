import { AI_ADVANCED_SYSTEM_BOUNDARY } from "./ai-prompt-boundary.js";

export function buildAiSalesSummaryPrompt() {
  return `${AI_ADVANCED_SYSTEM_BOUNDARY}\nTask: summarize the customer's sales state with explicit unknown fields marked as 未确认.`;
}
