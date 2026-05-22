# V4-E Business Prediction and Reorder Reminders

Current V4 release target: `v0.6-v4-growth-ops`. All AI outputs remain draft-only; no automatic WhatsApp sending, bulk sending, simulated send-button clicking, real payment, real logistics, full ERP, full finance system, automatic customer/supplier contact, store API sync, or WhatsApp account switching is introduced.

V4-E adds lightweight business prediction and reorder reminders for sales follow-up prioritization. It is rule-based only. It does not use machine learning, does not create automatic marketing campaigns, and never sends WhatsApp messages automatically.

V4-G adds fulfillment signals from orders. Delivered and completed orders can support reorder follow-up suggestions, while delayed shipping or unresolved after-sales alerts should lower priority or trigger risk-focused follow-up. The system still does not create reorder reminders automatically.

V4-I builds on this module with `ReorderCampaign`, `ReorderOpportunity`, and `ReorderPlaybook`. V4-E remains the lightweight prediction/reminder layer; V4-I adds opportunity pools, campaign grouping, reusable playbooks, and safer multi-scenario reorder operation drafts.

## Prediction Types

- `reorder`: old customer or reorder/restock signal.
- `dormant`: quoted or interested customer has gone quiet.
- `high_value`: high quote value, pending payment, paid sample, large custom quantity, or high intent.
- `churn_risk`: high intent or quoted customer has stale follow-up, sample no-response, or custom confirmation delay.
- `product_opportunity`: product-level opportunity from interested customers, quotes, samples, custom requests, and materials.

Scores are clamped to `0-100`.

- `low`: 0-39
- `medium`: 40-69
- `high`: 70-100

## APIs

- `GET /api/predictions/customers`
- `POST /api/predictions/customers/recalculate`
- `PATCH /api/predictions/customers/:id`
- `GET /api/predictions/product-opportunities`
- `GET /api/reorder-reminders`
- `POST /api/reorder-reminders`
- `PATCH /api/reorder-reminders/:id`
- `POST /api/reorder-reminders/:id/create-follow-up-task`
- `POST /api/ai/reorder-script`

All endpoints require login. Organization-scoped requests enforce organization membership and role permissions. Sales/support users only see customers they own, are assigned to, or collaborate on.

## Reorder Reminder Status

- `pending`
- `completed`
- `dismissed`
- `converted`
- `task_created`

`FollowUpTask` records are created only after a user manually clicks the create-follow-up action.

## AI Reorder Script Boundary

The reorder script API supports:

- `reorder`
- `dormant_reactivation`
- `product_recommendation`
- `churn_risk_follow_up`
- `high_value_follow_up`

The generated script is a draft only. It must not invent:

- previous purchase history;
- price;
- inventory;
- discount or urgency;
- lead time;
- shipping or logistics status;
- payment status.

If there is no real order data, the script says the customer previously discussed or consulted about the item, not that they purchased before.

## Audit

The system writes audit logs for:

- prediction recalculation;
- prediction status updates;
- reorder reminder creation;
- reorder reminder status updates;
- manual FollowUpTask creation from a reminder;
- AI reorder script generation;
- permission and cross-organization failures.

## Web and Extension

Web backend entry: `经营预测 / 复购提醒`.

Customer detail and dashboard show lightweight prediction/reminder data. Chrome sidebar can load reorder prediction and generate a reorder draft for the saved customer. It does not send WhatsApp messages, click send buttons, or create tasks automatically.

## Known Limits

- No real order center exists yet, so reorder prediction is based on CRM and sales workflow data.
- No machine learning or scheduled batch worker is included.
- Product opportunity scoring is a lightweight first pass.
- No automatic marketing, WhatsApp automation, payment, finance, procurement prediction, or full order management is added.


