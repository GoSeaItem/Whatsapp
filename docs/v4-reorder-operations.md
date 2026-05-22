# V4-I Reorder Operations

Current V4 release target: `v0.6-v4-growth-ops`. All AI outputs remain draft-only; no automatic WhatsApp sending, bulk sending, simulated send-button clicking, real payment, real logistics, full ERP, full finance system, automatic customer/supplier contact, store API sync, or WhatsApp account switching is introduced.

V4-I strengthens old-customer and repeat-purchase operations. It helps salespeople identify reorder, dormant reactivation, related product, replenishment, holiday, high-value, and churn-risk opportunities.

It is not an automatic marketing system. It does not send WhatsApp messages, group-send, click WhatsApp send buttons, or automatically create bulk tasks.

## Data Models

- `ReorderCampaign`: a planning/grouping record for reorder operation work.
- `ReorderOpportunity`: a rule-based opportunity snapshot for one customer and optional product/order.
- `ReorderPlaybook`: reusable draft templates for safe reorder operation scenarios.

## Opportunity Types

- `reorder`: old customer or completed-order reorder chance.
- `dormant_reactivation`: customer has been inactive or under-followed.
- `new_product`: related product recommendation opportunity.
- `replenishment`: restock check based on completed orders or wholesale signals.
- `holiday`: lightweight holiday/activity greeting. V4-I does not ship a full holiday calendar.
- `high_value`: high-value customer follow-up.
- `churn_risk`: customer may be dropping off and needs careful follow-up.

Scores are clamped to `0-100`:

- `low`: `0-39`
- `medium`: `40-69`
- `high`: `70-100`

## APIs

- `GET /api/reorder/opportunities`
- `POST /api/reorder/opportunities/recalculate`
- `PATCH /api/reorder/opportunities/:id`
- `POST /api/reorder/opportunities/:id/create-follow-up-task`
- `GET /api/reorder/campaigns`
- `POST /api/reorder/campaigns`
- `PATCH /api/reorder/campaigns/:id`
- `DELETE /api/reorder/campaigns/:id`
- `GET /api/reorder/playbooks`
- `POST /api/reorder/playbooks`
- `PATCH /api/reorder/playbooks/:id`
- `DELETE /api/reorder/playbooks/:id`
- `POST /api/ai/reorder-operation-script`

## Permissions

- `owner`: full reorder operation permissions.
- `manager`: team opportunity viewing, team recalculation, campaign management, playbook management, script generation, and manual task creation.
- `sales`: own/customer-access scope only, personal campaign/playbook, script generation, and manual task creation.
- `support`: read and script-generation support for accessible customers only.

Organization-scoped access must pass organization membership and role checks. Cross-organization opportunity, campaign, playbook, customer, product, and order access is rejected.

## Manual Follow-Up Creation

Converting an opportunity into `FollowUpTask` requires:

- a manual user click;
- `confirm=true`;
- access to the customer/opportunity;
- an audit log entry.

No bulk task creation is performed automatically.

## AI Draft Safety

`POST /api/ai/reorder-operation-script` supports:

- `reorder_follow_up`
- `dormant_reactivation`
- `new_product_recommendation`
- `replenishment_check`
- `holiday_greeting`
- `high_value_customer_follow_up`
- `churn_risk_recovery`

The generated text is always a draft. It must not invent:

- customer purchase history;
- inventory;
- price;
- discount;
- lead time;
- new products;
- urgency.

If no completed order data exists, the script uses wording like â€œprevious discussionâ€?instead of â€œprevious orderâ€?or â€œprevious purchaseâ€?

## Audit Logs

V4-I writes audit logs for:

- opportunity recalculation;
- opportunity status updates;
- opportunity conversion to follow-up task;
- campaign create/update/delete;
- playbook create/update/delete.

AI script generation writes `AIActionSuggestionLog`.

## Known Limits

- Rule-based scoring only; no machine learning.
- No automatic marketing workflow.
- No true holiday calendar.
- No reorder import/export pass yet.
- Chrome sidebar integration is lightweight; Web backend remains the main operation surface.

## V4-J After-sales Link

Open or processing after-sales cases should reduce reorder priority. Resolved cases may support a maintenance follow-up, but the system does not auto-market, auto-create bulk tasks, or auto-send WhatsApp messages.

## V4-K A/B Script Testing Link

Reorder and dormant reactivation drafts can participate in V4-K A/B script tests through scenarios such as `reorder_follow_up`, `dormant_reactivation` and `new_product_recommendation`. Usage and outcomes are recorded manually; no reorder campaign, task or WhatsApp message is sent automatically.

## V4-M Brand / Store Link

Reorder operation scripts accept `brandId`, return `brandUsed` / `brandRulesUsed`, and can prioritize brand products, brand materials, brand rules and linked brand knowledge. New product or related product suggestions should prefer products attached to the selected brand.

Brand context does not permit cross-brand recommendations unless the salesperson explicitly confirms the context. It also does not invent purchase history, inventory, price, discount, lead time, campaign urgency, or brand policy.


