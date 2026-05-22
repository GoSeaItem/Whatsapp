import { AI_ADVANCED_SYSTEM_BOUNDARY } from "./ai-prompt-boundary.js";

export function buildAiNextActionPrompt() {
  return `${AI_ADVANCED_SYSTEM_BOUNDARY}\nTask: recommend the next best sales action based on customer status, quotes, follow-ups, sample orders, custom requests, and knowledge base context.`;
}
