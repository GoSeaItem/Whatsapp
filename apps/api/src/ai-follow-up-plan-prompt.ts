import { AI_ADVANCED_SYSTEM_BOUNDARY } from "./ai-prompt-boundary.js";

export function buildAiFollowUpPlanPrompt() {
  return `${AI_ADVANCED_SYSTEM_BOUNDARY}\nTask: build a 7-14 day follow-up plan. Do not create tasks unless the API request explicitly sets createTasks=true.`;
}
