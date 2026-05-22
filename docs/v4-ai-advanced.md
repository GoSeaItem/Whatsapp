# V4-C AI Advanced Enhancement

Current V4 release target: `v0.6-v4-growth-ops`. All AI outputs remain draft-only; no automatic WhatsApp sending, bulk sending, simulated send-button clicking, real payment, real logistics, full ERP, full finance system, automatic customer/supplier contact, store API sync, or WhatsApp account switching is introduced.

V4-C upgrades AI from simple reply generation to sales advice, structured summaries, scenario drafts, risk checks, and follow-up plans.

## APIs

- `POST /api/ai/next-action`
- `POST /api/ai/customer-sales-summary`
- `POST /api/ai/sales-script`
- `POST /api/ai/risk-check`
- `POST /api/ai/follow-up-plan`
- `POST /api/ai/reorder-script`

All APIs require login. Any `customerId`, `productId`, `materialId`, `quoteId`, `sampleOrderId`, or `customRequestId` must be visible to the current user through personal ownership or organization membership rules.

V4-E adds `/api/ai/reorder-script` for reorder, dormant reactivation, product recommendation, churn-risk follow-up, and high-value follow-up drafts. It follows the same safety boundary: draft only, no automatic WhatsApp sending, no invented price, inventory, discount, lead time, payment, logistics, urgency, or purchase history.

## Data Used

The module reuses existing Customer, Product, Quote, FollowUpTask, KnowledgeBase, organization knowledge, Material, SampleOrder, and CustomRequest data. It does not introduce an order system, payment system, or WhatsApp API integration.

## Output Rules

- AI only generates drafts or suggestions.
- The salesperson must manually confirm and send.
- AI must not invent price, inventory, lead time, shipping cost, payment method, logistics status, certificates, or after-sales policies.
- Missing information is marked as unconfirmed.
- All outputs include `riskWarnings`.

## Next Action Logic

Rules detect clear sales states first:

- quote created 24-72 hours ago with no pending follow-up -> quote follow-up
- pending payment stage -> payment reminder
- sample delivered with pending feedback -> sample feedback follow-up
- custom request missing logo files -> request files
- high-intent customer with no pending follow-up -> priority follow-up

The returned fields include `recommendedAction`, `reason`, `suggestedScript`, `actionPriority`, `knowledgeUsed`, `riskWarnings`, and `createdLogId`.

## Customer Sales Summary

The summary returns structured fields such as need, interested products, quantity, country/city, budget sensitivity, quoted status, shipping/payment questions, sample status, custom status, current blocker, and next best action. Unknown fields are returned as `未确认`.

## Sales Scripts

Supported scenarios include first reply, price reply, quote follow-up, payment reminder, sample quote, sample feedback, custom confirmation, custom file request, material intro, customer thinks about it, too expensive, shipping explanation, after-sales soothing, old customer reorder, and delivery delay explanation.

## Risk Check

High-risk examples:

- `lowest price`
- `always in stock`
- `100% guaranteed delivery`
- `today shipping`
- unconfirmed payment or certificate claims

The response includes `riskLevel`, `riskWarnings`, `riskyPhrases`, `rewriteSuggestion`, and `safeVersion`.

## Follow-up Plan

Follow-up plans produce 7-14 day draft tasks and suggested messages. By default, no task is created. `createTasks=true` is required to create FollowUpTask rows, and this still does not send any WhatsApp message.

## Audit

`AIActionSuggestionLog` records the current user, optional organization/customer, action type, sanitized input snapshot, sanitized output snapshot, and risk level. It does not store secrets, `.env`, server passwords, or API keys.

## Known Limits

- V4-C uses deterministic rules and templates first; real LLM integration can be upgraded later.
- It is a sales assistant, not a final commitment engine.
- It cannot replace salesperson confirmation of price, stock, shipping, payment, logistics, certificates, or after-sales policy.
## V4-K A/B Script Testing Link

V4-K can use AI to generate A/B/C draft variants for supported sales scenarios. These generated variants follow the same AI safety boundary: draft only, no automatic WhatsApp sending, no invented price, stock, lead time, shipping, discount or urgency. Saving or using a generated variant is a manual salesperson action.
## V4-M Brand Context

AI advanced workflows can receive an optional `brandId` when the user selects a brand/store context. Brand context is resolved only after organization and role checks. When available, brand rules and linked brand knowledge are ranked ahead of organization and personal knowledge, and responses return `brandUsed`, `brandRulesUsed`, `knowledgeUsed`, and `riskWarnings`.

Brand context must not make the assistant invent price, stock, lead time, freight, payment method, logistics status, after-sales policy, brand authorization, or return promises. If the selected brand lacks a relevant rule, the AI output must remind the salesperson to confirm the brand policy manually. If the selected brand differs from the customer or entity brand, the output must include a confirmation warning.

The V4-M implementation wires brand context into AI reply, order scripts, fulfillment scripts, after-sales scripts, reorder operation scripts, supplier scripts, and A/B script variant generation. Deeper prompt tuning for every V4-C advanced endpoint remains a hardening item.


