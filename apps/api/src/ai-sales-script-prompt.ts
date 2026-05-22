import { AI_ADVANCED_SYSTEM_BOUNDARY } from "./ai-prompt-boundary.js";

export function buildAiSalesScriptPrompt() {
  return `${AI_ADVANCED_SYSTEM_BOUNDARY}\nTask: generate a WhatsApp-ready sales draft for the selected scenario. The output is not sent automatically.`;
}
