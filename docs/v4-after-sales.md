# V4-J After-sales and Exception Management

Current V4 release target: `v0.6-v4-growth-ops`. All AI outputs remain draft-only; no automatic WhatsApp sending, bulk sending, simulated send-button clicking, real payment, real logistics, full ERP, full finance system, automatic customer/supplier contact, store API sync, or WhatsApp account switching is introduced.

V4-J adds lightweight after-sales and exception handling on top of the order center, fulfillment board, profit review, and reorder operations modules.

## Goals

- Record customer complaints, quality issues, logistics delays, missing/wrong items, refund requests, return requests, reship requests, and other exceptions.
- Track status, responsibility, requested solution, final solution, evidence URLs, refund amount, reship cost, compensation amount, and internal notes.
- Generate safe after-sales WhatsApp draft scripts.
- Link after-sales cases to customers, orders, products, follow-up tasks, profit review, and audit logs.

## Case Types

- `quality_issue`
- `shipping_delay`
- `missing_item`
- `wrong_item`
- `refund_request`
- `return_request`
- `reship_request`
- `complaint`
- `other`

## Statuses

- `open`
- `waiting_customer`
- `waiting_internal`
- `processing`
- `resolved`
- `closed`
- `cancelled`

`resolved` requires resolution notes or a final solution. `closed` requires explicit confirmation.

## Responsibility

Responsibility can be `unknown`, `company`, `customer`, `logistics`, `supplier`, or `mixed`.

The system does not automatically decide responsibility. AI scripts can only suggest that the salesperson verifies evidence and internal policy.

## Solutions

Requested and final solutions support:

- `refund`
- `reship`
- `return`
- `discount`
- `replacement`
- `explanation`
- `no_compensation`
- `other`

Refund, reship, discount, replacement, compensation, return, or no-compensation decisions must be manually confirmed. The system never executes refunds, creates shipments, or promises compensation.

## API

- `GET /api/after-sales`
- `POST /api/after-sales`
- `GET /api/after-sales/:id`
- `PATCH /api/after-sales/:id`
- `DELETE /api/after-sales/:id`
- `PATCH /api/after-sales/:id/status`
- `PATCH /api/after-sales/:id/responsibility`
- `PATCH /api/after-sales/:id/solution`
- `POST /api/after-sales/:id/create-follow-up-task`
- `POST /api/ai/after-sales-script`

## Web Entry

The Web backend adds `After sales` in the left navigation.

The page includes:

- Overview counts for open, processing, waiting, high priority, refund requests, and reship requests.
- Filters for organization, keyword, type, priority, status, and responsibility.
- Case editor with evidence URL text fields.
- Manual status, responsibility, and solution actions.
- AI after-sales draft generation and copy workflow.
- Event timeline for selected cases.

Customer detail panels also show after-sales cases for the selected customer.

## Order Center and Fulfillment Links

When an after-sales case is created with an order, the order can be marked as after-sales pending as a record. This is not a final resolution and still needs manual review.

Fulfillment and order views can use after-sales state to show pending/processing cases. V4-J does not query real logistics.

## Profit Review Link

Final solutions can optionally sync refund/reship/compensation amounts into `OrderCost`, but only after explicit confirmation. This remains an operational cost record, not an accounting entry.

## Reorder Operations Link

Open or processing after-sales cases should reduce reorder priority. Resolved/closed cases may support later maintenance follow-up, but the system does not auto-market.

## AI Scripts

Supported scenarios:

- `ask_for_evidence`
- `apologize_and_acknowledge`
- `explain_shipping_delay`
- `explain_quality_check`
- `refund_policy_explain`
- `reship_arrangement`
- `solution_confirm`
- `follow_up_after_resolved`
- `calm_down_complaint`
- `request_internal_confirmation`

AI output is draft only. It must not promise refunds, reshipment, compensation, unconditional returns, logistics status, processing time, or company responsibility.

## Permissions

Default intent:

- `owner`: full after-sales permissions.
- `manager`: team visibility, update, responsibility/solution confirmation, close, export, and delete with confirmation.
- `sales`: own customer/order after-sales records, case creation/update, draft generation, and manual follow-up task creation.
- `support`: authorized customer after-sales records, support notes, draft generation, and follow-up task creation.

## Audit

The system records:

- Case create/update/delete.
- Status updates.
- Responsibility updates.
- Solution updates.
- Refund/reship/compensation records.
- Case close.
- Follow-up task creation.
- AI script generation.
- Optional cost sync.

## Safety Boundaries

- No WhatsApp official API integration.
- No automatic WhatsApp sending.
- No bulk sending.
- No simulated click on WhatsApp send buttons.
- No automatic refund.
- No automatic reshipment.
- No automatic compensation.
- No automatic responsibility attribution.
- No real logistics query.
- No complete ticketing, finance, or accounting system.

## Known Limits

- Evidence is stored as URL text only; no file upload or object storage.
- Import/export for after-sales cases is documented as a TODO.
- Chrome sidebar has existing order/fulfillment/reorder draft workflows; a richer dedicated after-sales sidebar workflow remains a future UX improvement.
## V4-K A/B Script Testing Link

After-sales soothing drafts can be tested in V4-K with the `after_sales_soothing` scenario. The module only records draft usage and manually marked outcomes; it does not send WhatsApp messages, promise refunds/reships, or automatically decide responsibility.

## V4-L Supplier / Procurement Link

After-sales cases can be linked to suppliers for quality checks, reship cost reference, or supplier responsibility notes. Supplier links and purchase notes are records only; the system does not automatically confirm supplier responsibility, reship, refund, contact a supplier, or apply after-sales cost without manual confirmation.

## V4-M Brand / Store Link

After-sales cases can be assigned to a brand/store through `BrandAssignment` with `entityType=after_sales`. After-sales scripts accept `brandId`, return `brandUsed` / `brandRulesUsed`, and prioritize brand after-sales policy, logistics notes, FAQ, forbidden expressions and linked brand knowledge.

Brand context never confirms responsibility, refund, reshipment, compensation, processing time, logistics status or return policy. If a brand lacks an after-sales policy, generated drafts must tell the salesperson to confirm the brand policy manually.


