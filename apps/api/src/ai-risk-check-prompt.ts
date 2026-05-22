import { AI_ADVANCED_SYSTEM_BOUNDARY } from "./ai-prompt-boundary.js";

export function buildAiRiskCheckPrompt() {
  return `${AI_ADVANCED_SYSTEM_BOUNDARY}\nTask: check the salesperson's draft for risky claims and rewrite it into a safer draft.`;
}
