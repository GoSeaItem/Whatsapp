# V4-G Order Fulfillment Board

Current V4 release target: `v0.6-v4-growth-ops`. All AI outputs remain draft-only; no automatic WhatsApp sending, bulk sending, simulated send-button clicking, real payment, real logistics, full ERP, full finance system, automatic customer/supplier contact, store API sync, or WhatsApp account switching is introduced.

V4-G adds a lightweight fulfillment board on top of the V4-F order center. It helps salespeople and managers spot order bottlenecks, prepare follow-up tasks, and generate draft-only fulfillment messages.

## Scope

- View pending payment, pending production, in-production, delayed, pending shipment, shipped, delivered follow-up, after-sales, completed, and cancelled orders.
- Detect fulfillment alerts using local rules.
- Create fulfillment follow-up tasks only after a user clicks.
- Generate WhatsApp-friendly fulfillment drafts.
- Record audit logs and AI suggestion logs.

## Out Of Scope

- No real logistics API.
- No automatic shipping.
- No automatic payment confirmation.
- No ERP workflow engine.
- No automatic order status changes.
- No automatic WhatsApp messages or bulk sending.

## Fulfillment Groups

- `pending_payment`: unpaid or pending-payment orders.
- `deposit_paid`: deposit paid and not yet in production.
- `in_production`: production is in progress.
- `production_delayed`: production delayed or expected ship date is overdue.
- `pending_shipment`: production complete but not shipped.
- `shipped_not_delivered`: shipped and not yet delivered.
- `shipping_delayed`: expected delivery date is overdue.
- `delivered_follow_up`: delivered and ready for satisfaction/reorder follow-up.
- `after_sales_pending`: after-sales issue is pending or processing.
- `completed`: completed orders.
- `cancelled`: cancelled orders.

## Alert Rules

- `payment_overdue`: unpaid or pending-payment for more than 3 days.
- `production_delayed`: expected ship date passed and production is not completed/cancelled.
- `shipping_delayed`: expected delivery date passed and shipment is not delivered/cancelled.
- `missing_tracking_number`: order is shipped but tracking number is empty.
- `after_sales_pending`: after-sales pending/processing for more than 3 days.
- `delivery_follow_up`: delivered order has no delivery follow-up task.
- `order_no_follow_up`: active order has no recent follow-up.

## Alert Levels

- `high`: overdue more than 7 days for payment, production, shipping, or after-sales.
- `medium`: 1-7 day production/shipping delay, 3-7 day payment/after-sales delay, or missing tracking number.
- `low`: delivery follow-up or no recent follow-up.

## APIs

- `GET /api/orders/fulfillment-board`
- `GET /api/orders/:id/fulfillment`
- `POST /api/orders/:id/recalculate-fulfillment-alerts`
- `POST /api/orders/recalculate-fulfillment-alerts`
- `PATCH /api/order-fulfillment-alerts/:id`
- `POST /api/orders/:id/create-fulfillment-follow-up`
- `POST /api/ai/order-fulfillment-script`

## AI Fulfillment Drafts

Supported scenarios:

- `payment_follow_up`
- `production_update`
- `production_delay_explain`
- `shipping_notice`
- `shipping_delay_explain`
- `delivery_follow_up`
- `after_sales_follow_up`
- `reorder_after_delivery`

All generated messages are drafts. The system must not invent payment status, production progress, tracking number, delivery time, or after-sales promises.

## Permissions

- `owner` / `manager`: can view organization fulfillment board and batch recalculations.
- `sales`: can view and act on own or assigned orders.
- `support`: can view authorized orders and prepare support follow-ups, but should not perform sensitive order operations.
- Cross-organization access is rejected.

## Audit

The system writes audit logs for alert recalculation, alert status updates, fulfillment follow-up task creation, and AI fulfillment draft generation. AI draft generation also writes `AIActionSuggestionLog`.

## Known Limits

- No real logistics or payment integrations.
- No automatic status sync.
- No alert export yet.
- No full workflow engine.

## V4-H Profit Review Linkage

- Fulfillment cards and order review can reference low-margin, loss, and unconfirmed-cost risks from the Profit review page.
- V4-H does not automatically change fulfillment status, confirm payment, or query logistics.

## V4-J After-sales Link

Fulfillment views can surface orders with pending or processing after-sales cases. This remains a manual workflow: no real logistics query, no automatic status change, no automatic refund/reshipment, and no WhatsApp auto-send.



