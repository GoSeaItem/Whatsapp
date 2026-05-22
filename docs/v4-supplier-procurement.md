# V4-L Supplier / Procurement Collaboration

Current V4 release target: `v0.6-v4-growth-ops`. All AI outputs remain draft-only; no automatic WhatsApp sending, bulk sending, simulated send-button clicking, real payment, real logistics, full ERP, full finance system, automatic customer/supplier contact, store API sync, or WhatsApp account switching is introduced.

V4-L adds a lightweight supplier and procurement workspace. It helps the team record supplier profiles, contacts, supplier quotes, purchase notes, supplier risk, and links between suppliers and products, orders, samples, custom requests, and after-sales cases.

## Scope

- Manage supplier records with status, tags, rating, notes, and risk level.
- Manage supplier contacts. Phone, email, WhatsApp, WeChat, and address are sensitive fields.
- Record supplier quotes for product cost, MOQ, lead time, sample fee, sample lead time, and bulk lead time.
- Record purchase notes for product, order, sample, custom request, and after-sales contexts.
- Record supplier risk such as unstable delivery, unstable quality, high price, poor cooperation, payment risk, or needs review.
- Link suppliers to products, orders, sample orders, custom requests, and after-sales cases.
- Generate supplier/procurement draft scripts.
- Apply a supplier quote to `OrderCost` only after manual `confirm=true`.

## Supplier Status

- `active`: normal cooperation.
- `inactive`: not currently cooperating.
- `blocked`: blocked or not recommended; requires confirmation when setting.
- `candidate`: candidate supplier.

Risk levels are `low`, `medium`, and `high`.

## Supplier Quote To Order Cost

`POST /api/supplier-quotes/:id/apply-to-order-cost` can copy a supplier `unitCost` into an order cost field, defaulting to `productCost`.

Rules:

- Requires `confirm=true`.
- Does not auto-confirm true cost.
- Does not create a purchase order.
- Does not contact the supplier.
- If the previous cost was confirmed, only users with the right permission can overwrite it.
- The updated order cost is recalculated and returned with warnings.

## Linked Business Objects

Suppliers can be linked to:

- Product: supplier / manufacturer / backup supplier.
- Order: bulk supplier or backup supplier.
- Sample order: sample supplier.
- Custom request: OEM/ODM supplier.
- After-sales case: after-sales supplier for quality or reshipment checks.

All linked entity IDs are checked against the current user's organization and access scope.

## AI Supplier Scripts

`POST /api/ai/supplier-script` supports:

- `ask_price`
- `ask_moq`
- `ask_sample_fee`
- `ask_lead_time`
- `ask_bulk_order_cost`
- `ask_custom_feasibility`
- `ask_quality_issue`
- `ask_reship_cost`
- `negotiate_price`
- `confirm_purchase_details`

Scripts are drafts only. They must not automatically contact suppliers, create purchase orders, confirm cost, confirm payment, or promise customer price or lead time.

## Permissions

New permission keys include:

- `supplier.viewOwn`, `supplier.viewTeam`, `supplier.create`, `supplier.update`, `supplier.delete`, `supplier.viewSensitiveContact`, `supplier.export`
- `supplierQuote.view`, `supplierQuote.create`, `supplierQuote.update`, `supplierQuote.delete`, `supplierQuote.applyToCost`
- `purchaseNote.view`, `purchaseNote.create`, `purchaseNote.update`, `purchaseNote.delete`
- `supplierRisk.view`, `supplierRisk.create`, `supplierRisk.update`
- `supplierLink.manage`
- `supplier.aiScript`

Default behavior:

- `owner`: full access.
- `manager`: manage suppliers, quotes, risks, notes, links, and apply quotes to costs.
- `sales`: can create suppliers and notes, view supplier summaries, generate supplier scripts, and view quotes; sensitive contact access remains restricted unless granted.
- `support`: can view limited supplier summaries and create support-related notes; sensitive contact access is restricted.

## Audit

Audit logs are written for supplier creation, updates, deactivation, blocked/risk changes, contact changes, quote changes, quote-to-cost application, purchase notes, risk records, supplier links, and supplier AI scripts.

## Chrome Extension

The WhatsApp sidebar includes a lightweight supplier draft generator. It can generate and copy/insert procurement draft text, but it does not contact suppliers, send WhatsApp messages, create purchase orders, or apply costs.

## Boundaries

V4-L does not implement:

- Automatic supplier contact.
- Purchase orders.
- Supplier payment.
- Inventory.
- Real cost confirmation.
- File upload or object storage.
- Full procurement ERP.

## Known Limits

- Supplier import/export is documented as a future V4-A extension.
- Supplier link management is available through API; the Web UI focuses on suppliers, contacts, quotes, notes, risks, quote-to-cost, and AI drafts.
- Contacts are stored as text fields and should be treated as sensitive data during export.

## V4-M Brand / Store Link

Suppliers can be assigned to a brand/store through `BrandAssignment` with `entityType=supplier` when the team wants to indicate that a supplier is commonly used for a specific brand or business line. Supplier scripts accept `brandId`, return `brandUsed` / `brandRulesUsed`, and can include brand-specific product, quote, payment, logistics or FAQ context.

Brand context does not automatically bind suppliers, apply supplier costs, confirm supplier lead time, create purchase orders, contact suppliers, or expose sensitive supplier contacts to unauthorized roles.


