# V4-F Order Center

Current V4 release target: `v0.6-v4-growth-ops`. All AI outputs remain draft-only; no automatic WhatsApp sending, bulk sending, simulated send-button clicking, real payment, real logistics, full ERP, full finance system, automatic customer/supplier contact, store API sync, or WhatsApp account switching is introduced.

V4-I uses completed order records as one safe signal for reorder opportunities. If no completed order exists, reorder-operation scripts must not say the customer purchased before; they can only reference previous consultation or discussion.

V4-F adds a lightweight order center that connects customers, quotes, samples, custom requests, products and follow-up tasks.

V4-G extends this with the [order fulfillment board](v4-order-fulfillment-board.md), including fulfillment groups, alert rules, manual fulfillment follow-ups, and draft-only fulfillment scripts.

## Scope

- Manual order records only.
- Quote to order, sample to bulk order, and custom request to order.
- Order status management for payment, production, shipping and after-sales.
- Order-related draft scripts for WhatsApp conversations.
- AuditLog and AIActionSuggestionLog records for order actions and order scripts.

## Out of Scope

- No online payment.
- No real logistics query API.
- No ERP, accounting or finance system.
- No automatic payment confirmation.
- No automatic shipping promise.
- No automatic WhatsApp sending, group sending or send-button clicking.

## Order Types

- `normal`
- `sample_to_bulk`
- `custom`
- `reorder`
- `other`

## Status Fields

- `paymentStatus`: `unpaid`, `deposit_paid`, `paid`, `refunded`, `cancelled`
- `productionStatus`: `not_started`, `preparing`, `in_production`, `completed`, `delayed`, `cancelled`
- `shippingStatus`: `pending`, `ready_to_ship`, `shipped`, `delivered`, `delayed`, `cancelled`
- `afterSalesStatus`: `none`, `pending`, `processing`, `resolved`, `refunded`, `closed`
- `orderStatus`: `draft`, `confirmed`, `pending_payment`, `processing`, `shipped`, `completed`, `cancelled`

## API

- `GET /api/orders`
- `POST /api/orders`
- `GET /api/orders/:id`
- `PATCH /api/orders/:id`
- `DELETE /api/orders/:id`
- `POST /api/orders/from-quote/:quoteId`
- `POST /api/orders/from-sample/:sampleOrderId`
- `POST /api/orders/from-custom-request/:customRequestId`
- `PATCH /api/orders/:id/payment-status`
- `PATCH /api/orders/:id/production-status`
- `PATCH /api/orders/:id/shipping-status`
- `PATCH /api/orders/:id/after-sales-status`
- `POST /api/orders/:id/create-follow-up-task`
- `POST /api/ai/order-script`

## Safety Rules

All order scripts are drafts. The salesperson must confirm payment, price, inventory, production progress, logistics number, delivery time and after-sales policy before manually sending any message.

The Chrome extension only creates records and generates drafts after a user click. It does not send WhatsApp messages automatically.

## Known Limitations

- Order files are URL strings only. There is no file upload or storage service yet.
- Delivered/completed order linkage with reorder prediction is advisory in V4-F; no automatic reminder is created.
- Order import/export is recorded as a TODO for a later import/export expansion.

## V4-H Profit Review Linkage

- Order detail can open cost review and AI profit review in the Web backend.
- Profit and cost records are advisory only and do not process payment, confirm real costs, create accounting reports, or provide tax advice.
- Cost confirmation and deletion write audit logs; cost deletion requires manual confirmation.

## V4-J After-sales Link

Orders can be linked to after-sales cases. Creating an after-sales case may mark the order after-sales status as pending for tracking only. The system does not confirm responsibility, refund, reshipment, logistics status, or customer resolution automatically.

## V4-L Supplier / Procurement Link

Orders can be linked to suppliers through `SupplierLink`, and supplier quotes can be applied to order cost only after manual confirmation. This is cost-reference support only: it does not create purchase orders, contact suppliers, confirm supplier cost, confirm payment, or manage inventory.

## V4-M Brand / Store Link

Orders can be assigned to a brand/store through `BrandAssignment` with `entityType=order`. Order scripts and fulfillment scripts accept `brandId`, return `brandUsed` / `brandRulesUsed`, and prioritize brand quote rules, payment notes, logistics notes, after-sales policies and linked brand knowledge.

Brand assignment is manual and audited. It does not automatically overwrite order status, payment status, production status, shipping status, customer brand context, or after-sales status. If the selected brand differs from the customer brand, the system must warn the salesperson to confirm before using that brand context.



