# Changelog

## v1.0-enterprise - Chrome extension UI refresh

### Added

- Upgraded the Chrome extension from one crowded right sidebar into a three-layer workflow: WhatsApp quick toolbar, right-side AI workbench, and Web backend links for complex management.
- Added a WhatsApp input-area quick toolbar with `AI 回复`, `翻译`, `报价`, `素材`, and `更多`.
- Added right-side workbench tabs: `客户`, `AI`, `业务`, `A/B`, and `更多`.
- Added a compact customer/brand context card and a fixed bottom action bar.
- Added A/B result marking through a dropdown instead of four large buttons.
- Added DOM mounting fallback: input-area toolbar first, then a floating AI button if the WhatsApp input container cannot be found.

### Safety

- The extension still only generates, copies, records, or inserts drafts.
- It does not call the WhatsApp official API, auto-send WhatsApp messages, bulk-send, simulate clicking the WhatsApp send button, or bypass WhatsApp controls.

## v0.6-v4-growth-ops - 2026-05-22

V4 growth ops release consolidates V4-A through V4-M into one release: organization import/export jobs, cross-organization reports, AI advanced enhancement, advanced permissions and audit, business prediction and reorder reminders, order center, order fulfillment board, profit and cost review, reorder operations, after-sales management, lightweight script A/B testing, supplier/procurement collaboration, and multi-brand/store management.

### Release Safety Boundary

- No WhatsApp official API integration, automatic WhatsApp sending, bulk sending, simulated send-button clicking, automatic customer contact, automatic supplier contact, real payment, real logistics, automatic refund, automatic shipment, automatic inventory confirmation, automatic cost confirmation, store API sync, or WhatsApp account switching was added.
- All AI outputs remain drafts or recommendations. Salespeople must manually verify price, stock, lead time, shipping, payment, logistics, after-sales policy, cost, supplier details, and brand policy before sending or acting.
- `.env.production`, real secrets, server passwords, API keys, session secrets, cookie secrets, backups, logs, build output, and node_modules remain excluded from git.

### Included V4 Modules
### V4-M Multi-brand / Multi-store Management

### Added

- Added `Brand`, `BrandProduct`, `BrandMaterial`, `BrandKnowledgeBase`, `BrandScript`, `BrandRule`, and `BrandAssignment` models with a production-safe migration.
- Added brand/store APIs for brand CRUD/archive, product/material/knowledge/script linking, brand rules, brand assignment, and brand AI context lookup.
- Added Web backend entry: `Brands / stores`, with brand filters, brand editor, resource links, brand rules, assignment, and context warnings.
- Added Chrome extension brand selector. The selected brand filters products/materials and is passed into AI draft generation where supported.
- Added brand permission keys and audit logging for brand lifecycle, resource links, rules, entity assignments, and AI brand context use.
- Enhanced `POST /api/ai/reply`, order scripts, fulfillment scripts, after-sales scripts, reorder operation scripts, supplier draft generation, and A/B script variant generation to resolve brand context and return `brandUsed` / `brandRulesUsed`.

### Security

- V4-M does not switch WhatsApp accounts, connect store APIs, sync store orders, send WhatsApp messages, bulk send, or simulate send-button clicks.
- Brand assignment is manual and confirmed; it does not automatically overwrite customer/order/after-sales brand context.
- Brand rules are draft context only. AI must still warn users to confirm price, inventory, lead time, shipping, payment, and after-sales policy.
- Inactive/archived brands are not shown by default in plugin selectors.

### Tests

- Added brand API tests for create/archive confirmation, same-organization uniqueness, active brand visibility, cross-organization rejection, resource linking, brand rules, assignment, and context resolution.

### V4-L Supplier / Procurement Collaboration

### Added

- Added `Supplier`, `SupplierContact`, `SupplierQuote`, `PurchaseNote`, `SupplierRisk`, and `SupplierLink` models with a production-safe migration.
- Added supplier/procurement APIs for supplier CRUD, contacts, quotes, purchase notes, risks, entity links, quote-to-order-cost application, and AI supplier scripts.
- Added Web backend entry: `Suppliers`, with supplier filters, supplier editor, contact/quote/note/risk sections, supplier draft generation, and manual quote-to-cost application.
- Added Chrome extension supplier draft generator for price, MOQ, sample fee, lead time, bulk cost, custom feasibility, quality issue, reship cost, negotiation, and purchase-detail confirmation drafts.
- Added supplier/procurement permission keys and audit logging for supplier updates, risk changes, quote changes, cost application, links, and AI script generation.

### Security

- V4-L does not auto-contact suppliers, create purchase orders, make supplier payments, manage inventory, auto-confirm real costs, send WhatsApp messages, bulk send, or simulate send-button clicks.
- Applying supplier quotes to order cost requires `confirm=true` and keeps cost confirmation manual.
- Supplier contact fields are treated as sensitive; low-permission users receive redacted summaries.
- AI supplier scripts are drafts only and include warnings to confirm price, MOQ, lead time, quality, reship cost, and cost before acting.

### Tests

- Added supplier API tests for duplicate detection, confirmation requirements, cross-organization protection, contact redaction, quote-to-cost confirmation, audit logging, and draft-only supplier AI scripts.

### V4-K Lightweight Script A/B Testing

### Added

- Added `ScriptExperiment`, `ScriptVariant`, and `ScriptUsage` models with a production-safe migration.
- Added script experiment APIs for experiment CRUD/archive, variant management, usage recording, outcome marking, stats, and AI A/B/C variant generation.
- Added Web backend entry: `A/B scripts`, with filters, experiment editor, variant editor, AI-generated drafts, usage recording, outcome marking, and stats.
- Added Chrome extension A/B script selector for active experiments. Copying or inserting a variant records `used_draft`; it does not send WhatsApp messages.
- Added lightweight stats: usage by variant, reply rate, quote/order/payment/reorder conversion rates, no-response rate, sample-size warning, and best-variant hint.

### Security

- V4-K does not auto-send WhatsApp messages, bulk send, simulate WhatsApp send-button clicks, or auto-judge customer outcomes.
- AI-generated variants are drafts only and include risk warnings for price, stock, lead time, shipping, discount, and urgency.
- Experiment/variant/usage access is organization-scoped and customer access is checked before recording usage.
- Deleting experiments/variants requires confirmation; used variants are disabled instead of losing history.

### Tests

- Added script A/B API tests for creation, variant uniqueness, usage recording, outcome marking, stats, confirmation requirements, cross-organization rejection, and AI draft safety.

### V4-J After-sales and Exception Management

### Added

- Added `AfterSalesCase` and `AfterSalesEvent` models with production-safe migration.
- Added after-sales APIs for case CRUD, status updates, responsibility confirmation, final solution confirmation, manual FollowUpTask creation, and AI after-sales scripts.
- Added Web backend entry: `After sales`, with overview metrics, filters, case editor, event timeline, risk warnings, and draft generation.
- Added after-sales permission keys for own/team visibility, creation, updates, close/delete, assignment, responsibility, solution, task creation, script generation, and export.

### Security

- V4-J does not automate refunds, reshipments, compensation, responsibility attribution, logistics checks, WhatsApp sending, bulk sending, or simulated send-button clicks.
- Responsibility and final solution updates require explicit confirmation and write audit logs.
- Refund/reship/compensation fields are records only; optional OrderCost sync requires manual confirmation.
- AI after-sales scripts are drafts only and do not promise refunds, reshipments, compensation, unconditional returns, logistics status, or company responsibility.

### Tests

- Added after-sales utility tests and API tests for creation, listing, resolution validation, cross-user rejection, confirmation requirements, cost sync, manual follow-up creation, and draft-only AI script safety.

### V4-I Reorder Operations

### Added

- Added `ReorderCampaign`, `ReorderOpportunity`, and `ReorderPlaybook` models with production-safe migration.
- Added reorder operation APIs for opportunity listing, recalculation, status updates, manual FollowUpTask creation, campaign CRUD, playbook CRUD, and AI reorder operation scripts.
- Added Web backend entry: `Reorder ops`, with opportunity pool, campaign management, playbook management, draft generation, and manual task creation.
- Added reorder operation permission keys for own/team visibility, recalculation, campaign management, playbook management, task creation, and script generation.

### Security

- V4-I does not add automatic marketing, WhatsApp auto-send, bulk sending, or simulated send-button clicking.
- Opportunity-to-task conversion requires explicit confirmation and writes audit logs.
- AI reorder operation scripts do not invent customer purchase history, inventory, price, discount, lead time, urgency, or new-product claims.
- Without completed order data, scripts use safe wording such as previous discussion instead of previous purchase.

### Tests

- Added reorder operation rule tests and API tests for recalculation, cross-organization rejection, manual task confirmation, campaign/playbook confirmation, and draft-only AI script safety.

### V4-H Profit and Cost Review

### Added

- Added `OrderCost` model and production-safe migration for lightweight order cost records.
- Added profit APIs for order cost CRUD, cost confirmation, order profit list, profit summary, product/customer/salesperson breakdowns, and AI profit review.
- Added Web backend entry: `Profit review`, with summary cards, order margin list, cost editor, confirmation, and advisory AI review.
- Added profit permission keys for own/team viewing, cost editing, cost confirmation, cost deletion, export, and AI review.

### Security

- Profit/cost data is operational reference only, not accounting, tax, payment, or reconciliation.
- No automatic real-cost confirmation, no payment confirmation, no tax advice, and no financial statement generation.
- `support` cannot access profit APIs; `sales` can only view own accessible order profit and cannot edit costs by default.
- Cost confirmation and deletion write audit logs; deletion requires `confirm=true`.

### Tests

- Added profit calculation, risk warning, role boundary, cost confirmation, delete confirmation, summary, and AI profit review tests.

### V4-G Order Fulfillment Board

### Added

- Added `OrderFulfillmentAlert` model and optional `FollowUpTask.orderId`.
- Added order fulfillment board APIs, alert recalculation, alert status updates, and manual fulfillment follow-up creation.
- Added `POST /api/ai/order-fulfillment-script` for draft-only payment, production, shipping, delivery, after-sales, delay, and reorder fulfillment scripts.
- Added Web backend entry: `Fulfillment`, with summary cards, grouped fulfillment columns, alert actions, and order-detail alert controls.
- Added Chrome extension lightweight fulfillment controls for current customer orders, alert checks, and fulfillment draft generation.

### Security

- Fulfillment board does not query real logistics, confirm payment, auto-ship, auto-update order status, or auto-create tasks.
- Fulfillment follow-up tasks are created only after manual user action.
- Fulfillment scripts require salesperson confirmation for payment, production, shipping, tracking, delivery timing, and after-sales policy.
- Alert recalculation, alert updates, follow-up task creation, and fulfillment script generation write audit/AI logs.

### Tests

- Added fulfillment grouping, alert rule, draft-only script, API board, recalc, alert update, and manual follow-up tests.

### V4-F Order Center

### Added

- Added lightweight `Order` model and production-safe migration.
- Added order CRUD, quote-to-order, sample-to-bulk-order and custom-request-to-order APIs.
- Added manual payment, production, shipping and after-sales status updates with risk warnings.
- Added `POST /api/ai/order-script` for draft-only order confirmation, payment reminder, production update, shipping notice, delay explanation, after-sales and reorder scripts.
- Added Web backend entry: `Orders`, plus customer-detail order records and conversion actions.
- Added Chrome extension order controls for current customer orders, manual order creation and draft script generation.

### Security

- Order records are manual sales records only.
- The system does not process payments, query logistics, confirm payment, promise shipping, send WhatsApp messages, group send, or click WhatsApp send buttons.
- Order scripts require salesperson confirmation for payment, production, logistics, after-sales, price, inventory and lead time.
- Order creation, conversion, status update, deletion and order-script generation write audit/AI logs.

### Tests

- Added order utility tests for validation, conversion warnings, status warnings and no automatic WhatsApp sending behavior.

### V4-E Business prediction and reorder reminders

### Added

- Added `CustomerPrediction` for rule-based customer prediction snapshots.
- Added `ReorderReminder` for manual reorder, dormant reactivation, and product recommendation reminders.
- Added prediction APIs:
  - `GET /api/predictions/customers`
  - `POST /api/predictions/customers/recalculate`
  - `PATCH /api/predictions/customers/:id`
  - `GET /api/predictions/product-opportunities`
- Added reorder reminder APIs:
  - `GET /api/reorder-reminders`
  - `POST /api/reorder-reminders`
  - `PATCH /api/reorder-reminders/:id`
  - `POST /api/reorder-reminders/:id/create-follow-up-task`
- Added `POST /api/ai/reorder-script` for reorder, dormant reactivation, product recommendation, churn-risk, and high-value follow-up drafts.
- Added Web backend entry: `经营预测 / 复购提醒`.
- Added customer detail, dashboard, and Chrome sidebar touchpoints for reorder prediction and manual draft generation.

### Security

- Predictions are rule-based assistant signals only and do not guarantee conversion.
- Reorder reminders do not create `FollowUpTask` records unless the user explicitly clicks the create endpoint/button.
- Reorder scripts do not invent customer purchase history, price, inventory, discounts, lead time, shipping, payment, or urgency.
- All APIs enforce login and customer/product organization access checks.
- Prediction recalculation, reminder creation/status changes, follow-up creation, and AI reorder script generation write audit logs.
- No WhatsApp official API integration, automatic WhatsApp sending, bulk sending, simulated send-button clicking, payment, finance, machine-learning pipeline, or full order-system logic was added.

### Tests

- Added V4-E tests for prediction scoring rules, product opportunities, reorder script safety, API access control, manual follow-up creation, and cross-organization denial.

### V4-D Advanced permissions and audit

### Added

- Added centralized permission keys and default role matrix for `owner`, `manager`, `sales`, and `support`.
- Added confirmation enforcement for sensitive operations such as deleting customers/products/quotes/sample orders/custom requests, deleting organizations, changing member roles, disabling/removing members, and exporting sensitive organization data.
- Enhanced organization export with `fieldsScope=normal|sensitive`; `owner` may export sensitive fields, `manager` is limited to normal fields, and `sales/support` are blocked from organization export creation.
- Enhanced `AuditLog` with `ipAddress`, `userAgent`, and `riskLevel`; added risk-level filtering and audit CSV export.
- Added `GET /api/security/risk-events` for owner/manager review of high/medium risk operations.
- Added Web backend entries for permission matrix and risk events.
- Chrome extension now shows a clear permission-denied message when protected APIs return `403`.

### Security

- Sensitive operations return `CONFIRM_REQUIRED` unless `confirm=true` is provided.
- Permission-denied, cross-organization, confirmation-required, and sensitive export attempts are written to security audit logs.
- Audit/export CSV output keeps formula-injection protection and does not include password, token, secret, cookie, session, API key, or `.env` data.
- No WhatsApp official API integration, automatic WhatsApp sending, bulk sending, simulated send-button clicking, payment, finance, SSO, IAM, or order-system logic was added.

### Tests

- Added tests for role permissions, confirmation enforcement, sensitive export permission, audit log filtering/export, risk events, and plugin-side permission boundary.

### V4-C AI advanced enhancement

### Added

- Added `AIActionSuggestionLog` for AI advanced suggestion audit and troubleshooting.
- Added AI advanced APIs:
  - `POST /api/ai/next-action`
  - `POST /api/ai/customer-sales-summary`
  - `POST /api/ai/sales-script`
  - `POST /api/ai/risk-check`
  - `POST /api/ai/follow-up-plan`
- Added prompt boundary files for next action, sales summary, sales script, risk check, and follow-up plan.
- AI advanced logic uses customer, product, quote, follow-up, knowledge, material, sample order, and custom request context.
- Follow-up plans default to draft-only planning; tasks are created only when `createTasks=true`.

### Security

- All AI advanced APIs enforce login and customer/resource access checks.
- AI outputs remain drafts/suggestions only and include risk warnings for price, inventory, lead time, shipping, payment, logistics, and after-sales commitments.
- Risk check flags high-risk phrases such as `lowest price`, `always in stock`, `100% guaranteed delivery`, and `today shipping`.
- No WhatsApp official API integration, automatic WhatsApp sending, bulk sending, or simulated send-button clicking was added.

### Tests

- Added V4-C tests for cross-organization denial, next-action rules, customer summary missing data, multi-scenario drafts, risk checks, forbidden expressions, follow-up plan creation flags, and AI log ownership.

### V4-B Cross-organization reports

### Added

- Added `ReportJob` for organization report generation tracking.
- Added report APIs:
  - `GET /api/reports/team-summary`
  - `GET /api/reports/high-intent-customers`
  - `POST /api/reports/generate`
  - `GET /api/reports/:id/status`
- Added Web backend navigation entry: `报表分析`, visible only for selected organization owner/manager.
- Report KPI includes today new customers, today follow-up customers, overdue follow-up customers, high-intent customers, and quoted customers without pending follow-up.
- Report member stats include customer count, completed follow-ups, and quote count.
- High-intent report list supports salesperson, stage, and intent-level filters.
- Added CSV and Excel-compatible exports for team reports.

### Security

- Report APIs require active organization membership and `owner` / `manager` role.
- `sales` and `support` receive `403`.
- Cross-organization report job status access is rejected.
- High-intent report rows hide contact fields.
- Report generation writes `AuditLog`.
- No WhatsApp official API integration, automatic WhatsApp sending, bulk sending, simulated send-button clicking, payment, finance, or full order-system logic was added.

### Tests

- Added V4-B reports API tests for owner/manager access, sales/support rejection, KPI accuracy, member stats, high-intent filtering, CSV/Excel export, report jobs, audit logging, and cross-organization rejection.

### V4-A Organization import/export jobs

### Added

- Added `ImportJob` and `ExportJob` models for organization-level import/export task tracking.
- Added organization import support for `customer`, `product`, `material`, `knowledge`, and `script`.
- Added organization export job API for the same data types.
- Added dryRun validation for organization imports so format, enum, date, number, membership, and duplicate issues can be checked without writing data.
- Added Web backend controls in the import/export page for organization-scoped import/export.
- Organization product imports create a product owned by the operator and share it into the selected organization.
- Organization material imports create a material owned by the operator and share it into the selected organization.
- Organization knowledge and script imports write directly to shared organization libraries.

### Security

- Organization import/export requires active membership and `owner` / `manager` role.
- `sales` and `support` cannot create import/export jobs.
- Cross-organization job status access is rejected.
- CSV import ignores `ownerId`, `createdBy`, `organizationId`, password, token, secret, cookie, session, and API key fields.
- CSV export uses formula-injection escaping.
- All organization import/export task creation writes `AuditLog`.
- No WhatsApp official API integration, automatic WhatsApp sending, bulk sending, simulated send-button clicking, payments, finance, or full order-system logic was added.

### Tests

- Added V4-A API tests for dryRun, formal import, duplicate detection, organization product/material/knowledge/script import, owner/manager permissions, sales rejection, export jobs, job status, cross-organization rejection, and audit logging.

## Unreleased - V3-H Manager team dashboard

### Added

- Added organization team dashboard API: `GET /api/dashboard/team-summary`.
- Organization-scoped `GET /api/dashboard/high-intent-customers?organizationId=...` now returns sanitized team high-intent customers for owner/manager.
- Added team KPI summary:
  - today new customers
  - today follow-up customers
  - overdue follow-up customers
  - high-intent customers
  - quoted customers without pending follow-up
- Added salesperson stats: customer count, completed follow-ups, and quote count.
- Added Web backend navigation entry: `Team dashboard`, visible only for selected organization owner/manager.
- Added CSV export for visible team dashboard data.

### Security

- Team dashboard requires active organization membership and `owner` / `manager` role.
- `sales` and `support` receive `403` for team dashboard APIs.
- Cross-organization access is rejected.
- Team high-intent lists omit contact fields such as WhatsApp number and email.
- CSV export escapes formula-like cells.
- No WhatsApp official API integration, automatic WhatsApp sending, bulk sending, simulated send-button clicking, payments, pricing, order-system, finance, or boss-dashboard logic was added.

### Tests

- Added team dashboard API tests for owner/manager access, sales/support rejection, KPI accuracy, member stats, high-intent sanitization, CSV export, and cross-organization rejection.

## Unreleased - V3-G Audit logs

### Added

- Upgraded `AuditLog` with `userId`, `before`, and `after` fields while keeping `actorId` for compatibility.
- Added protected audit log APIs:
  - `GET /api/audit-logs`
  - `GET /api/audit-logs/:id`
- Audit log list supports organization scope, entity type, user, action, time-range filters, pagination, and CSV export through `format=csv`.
- Added Web backend navigation entry: `Audit logs`.
- Customer, quote, organization product/material, organization knowledge/script, and follow-up create/update/delete paths now write structured audit entries where organization context exists.

### Security

- Audit logs are scoped by `organizationId`.
- `owner` and `manager` can view organization logs.
- `sales` and `support` can only view their own audit logs.
- Cross-organization access is rejected.
- Audit CSV export escapes formula-like cells and does not include password, token, secret, cookie, session, or API key fields.
- No WhatsApp official API integration, automatic WhatsApp sending, bulk sending, simulated send-button clicking, payments, order-system, finance, or boss-dashboard logic was added.

### Tests

- Added audit log API tests for write sanitization, owner/manager listing, sales/support self-only visibility, cross-organization rejection, filters, and CSV export.
- Updated organization knowledge/script/product/material tests to assert structured `before` / `after` audit records.

## Unreleased - V3-F Organization shared products and materials

### Added

- Added `OrganizationProduct` for sharing existing products into an organization library.
- Added `OrganizationMaterial` for sharing existing materials into an organization library.
- Added protected organization product APIs:
  - `GET /api/products/org`
  - `GET /api/products/org/:id`
  - `POST /api/products/org`
  - `PATCH /api/products/org/:id`
  - `DELETE /api/products/org/:id`
- Added protected organization material APIs:
  - `GET /api/materials/org`
  - `GET /api/materials/org/:id`
  - `POST /api/materials/org`
  - `PATCH /api/materials/org/:id`
  - `DELETE /api/materials/org/:id`
- Added Web backend navigation entries: `Org products` and `Org materials`.
- Quote generation can now use organization-shared products when `organizationId` is provided.
- Organization product/material create, update, and delete actions write `AuditLog` entries.

### Security

- Organization products/materials are scoped by `organizationId`.
- `owner` and `manager` can add, update, and remove shared resources.
- `sales` and `support` are read-only.
- Adding a shared product/material requires that the current user owns the underlying personal product/material.
- Cross-organization access is rejected.
- No WhatsApp official API integration, automatic WhatsApp sending, bulk sending, simulated send-button clicking, payments, pricing, order-system, finance, or boss-dashboard logic was added.

### Tests

- Added organization shared product/material API tests for list/search, read-only sales/support enforcement, cross-organization rejection, duplicate share rejection, audit logging, and quote generation using organization-shared products.

## Unreleased - V3-E Organization shared knowledge and scripts

### Added

- Added `KnowledgeBaseOrg` for organization-level shared knowledge.
- Added `ScriptOrg` for organization-level shared draft scripts.
- Added lightweight `AuditLog` records for organization knowledge/script create, update, and delete operations.
- Added protected organization knowledge APIs:
  - `GET /api/knowledge-base/org`
  - `GET /api/knowledge-base/org/:id`
  - `POST /api/knowledge-base/org`
  - `PATCH /api/knowledge-base/org/:id`
  - `DELETE /api/knowledge-base/org/:id`
- Added protected organization script APIs:
  - `GET /api/scripts/org`
  - `GET /api/scripts/org/:id`
  - `POST /api/scripts/org`
  - `PATCH /api/scripts/org/:id`
  - `DELETE /api/scripts/org/:id`
- Added Web backend navigation entries: `Org knowledge` and `Org scripts`.
- AI reply lookup can now use `organizationId` and returns `[Org]` entries in `knowledgeUsed` when organization knowledge is referenced.

### Security

- Organization knowledge/script records are always scoped by `organizationId`.
- `owner` and `manager` can create, update, delete, enable, and disable organization records.
- `sales` and `support` are read-only.
- Disabled organization knowledge is excluded from AI lookup.
- Cross-organization read/write access is rejected.
- No WhatsApp official API integration, automatic WhatsApp sending, bulk sending, simulated send-button clicking, payments, pricing, order-system, finance, or boss-dashboard logic was added.

### Tests

- Added organization knowledge/script API tests for CRUD permissions, read-only sales/support access, cross-organization rejection, search, duplicate detection, audit logging, and AI organization knowledge usage.

## Unreleased - V3-D Duplicate customer collision detection

### Added

- Added `Customer.socialLinks` for storing customer social media profile URLs.
- Added `CustomerDuplicateEventLog` for recording duplicate customer checks that were detected, blocked, or skipped.
- Added duplicate customer pre-check API: `POST /api/customers/check-duplicate`.
- Customer create/update now detects duplicate WhatsApp numbers, email addresses, and social links within the same personal or organization scope.
- Customer CSV import now validates duplicate WhatsApp numbers, email addresses, and social links during `dryRun`, skips duplicates by default during formal import, and supports `skipDuplicates=false` for row-level duplicate errors.
- Web customer form now includes social links and blocks save when duplicate customer matches are found, showing owner/assigned user and matched fields.

### Security

- Duplicate detection is scoped by current user for personal customers and by organization for organization customers.
- Cross-organization duplicates are allowed.
- `support` remains read-only for organization customer import and customer creation.
- CSV `ownerId`, `createdBy`, `organizationId`, password, token, secret, API key, session, and cookie fields are still ignored on import.
- No WhatsApp official API integration, automatic WhatsApp sending, bulk sending, simulated send-button clicking, payments, pricing, order-system, finance, or boss-dashboard logic was added.

### Tests

- Added tests for same-organization duplicate blocking by WhatsApp/email/social link, cross-organization duplicate allowance, duplicate pre-check responses, duplicate event logs, import `dryRun` duplicate reporting, formal import duplicate skipping, and `skipDuplicates=false` behavior.

## Unreleased - V3-C Customer ownership and assignment

### Added

- Added organization-aware customer ownership fields: `organizationId`, `assignedTo`, `collaborators`, and `email`.
- Added `CustomerAssignmentLog` Prisma model for recording customer assignment changes.
- Added customer assignment API: `POST /api/customers/:id/assign`.
- Customer list and detail APIs now support organization context and role-aware visibility.
- Web backend customer page now shows organization, owner, assigned user, collaborators, email, and assignment logs.
- Customer create/update and CSV import now include duplicate collision checks by WhatsApp number or email within the current personal or organization scope.

### Security

- Organization customers are still created with the current user as `ownerId`.
- `assignedTo` and `collaborators` must be active members of the same organization.
- `owner` and `manager` can view and assign organization customers.
- `sales` can view and manage customers they created or are assigned to.
- `support` and collaborators can view customer details but cannot edit or delete customers.
- Cross-organization customer access and assignment are rejected.
- No WhatsApp official API integration, automatic WhatsApp sending, bulk sending, simulated send-button clicking, payments, pricing, order-system, finance, or boss-dashboard logic was added.

### Tests

- Added customer API tests covering organization customer creation, duplicate collision checks, organization visibility, collaborator read-only behavior, customer assignment, and assignment logs.

## Unreleased - V3-B Role permission management

### Added

- Added `Role` Prisma model scoped to organization, with fixed role names `owner`, `manager`, `sales`, and `support`.
- Organization creation now initializes default role descriptions for all four roles.
- Added protected role APIs:
  - `GET /api/roles?organizationId=...`
  - `GET /api/roles/:id`
  - `POST /api/roles`
  - `PATCH /api/roles/:id`
  - `DELETE /api/roles/:id`
- Added organization role permission middleware for organization-context resource requests.
- Added Web backend `Roles` page for listing, searching, creating, updating, and deleting role descriptions.

### Security

- Only organization members can read role definitions for that organization.
- Only `owner` can create, update, or delete role definitions.
- For organization-context customer/product/material/knowledge-base requests, `owner` and `manager` can write while `sales` and `support` are read-only.
- Existing personal V1/V2 data isolation remains active when no organization context is provided.
- No WhatsApp official API integration, automatic WhatsApp sending, bulk sending, simulated send-button clicking, payments, pricing, or order-system logic was added.

### Tests

- Added role API and permission middleware tests covering default role listing, cross-organization rejection, owner-only role CRUD, invalid role names, and sales/support read-only enforcement.

## Unreleased - V3-A Organization and team member management

### Added

- Added `Organization` and `OrganizationMember` Prisma models for the V3 team collaboration foundation.
- Added protected organization APIs:
  - `GET /api/organizations`
  - `GET /api/organizations/:id`
  - `POST /api/organizations`
  - `PATCH /api/organizations/:id`
  - `DELETE /api/organizations/:id`
- Added protected member management APIs:
  - `GET /api/organizations/:id/members`
  - `POST /api/organizations/:id/members`
  - `PATCH /api/organizations/:id/members/:memberId`
  - `DELETE /api/organizations/:id/members/:memberId`
- Added Web backend `Organizations` page for creating organizations, editing organization names, deleting organizations, searching members, adding members, changing role/status, and removing members.
- Added shared organization role/status types for `owner`, `manager`, `sales`, `support`, `active`, and `inactive`.
- Added V3 team collaboration documentation in `docs/v3-team-collaboration.md`.

### Security

- Organization APIs only return organizations where the current user is owner or active member.
- Organization updates/deletes require owner role.
- Member add/update/delete requires owner or manager role.
- The owner member role is reserved for the organization creator; member management cannot add another owner, promote a member to owner, change the owner member, or remove the owner member.
- Adding members validates that `userId` exists.
- Cross-organization access is rejected.
- V3-A does not change V1/V2 personal data isolation. Customer, product, quote, follow-up, knowledge base, material, sample order, custom request, import, and export data remain scoped to the current logged-in user.
- No WhatsApp official API integration, automatic WhatsApp sending, bulk sending, or simulated send-button clicking was added.

### Tests

- Added organization API tests covering create, list visibility, owner-only organization updates/deletes, member add/update/delete, userId validation, role permissions, and cross-organization access rejection.

## v0.4-v2-sales-enhancement - 2026-05-20

V2 成交增强版收尾版本，覆盖 V2-A �?V2-F 的完整能力，并完成全链路联调、账号隔离检查、安全边界检查、部署检查和文档收尾�?
### Added

- V2-A AI 公司知识库：支持公司介绍、产品卖点、物流政策、售后政策、报价规则、付款方式、禁用表达和 FAQ，AI 回复返回 `knowledgeUsed`�?- V2-B 素材中心：支持图片、视频、目录、尺码表、买家秀、工厂视频、物流截图、付款说明、证书等 URL 素材管理和说明草稿生成�?- V2-C 客户意向评分：支持规则评分、意向等级、评分原因、推荐动作、客户列表排序和首页高意向客户区块�?- V2-D 样品单管理：支持样品�?CRUD、付�?发货/反馈状态更新、客户详情展示、侧边栏样品入口和样品话术草稿�?- V2-E 定制需求管理：支持定制需�?CRUD、状态更新、客户详情展示、侧边栏定制入口和定制话术草稿�?- V2-F 数据导入导出：支持客户、产品、知识库、素材、样品单、定制需�?CSV 模板、dryRun 导入、正式导入和 CSV 导出�?- 版本号统一更新�?`0.4.0`�?
### Safety

- 全仓库继续保持：不接�?WhatsApp 官方 API、不自动发�?WhatsApp 消息、不自动群发、不模拟点击 WhatsApp 发送按钮�?- AI 回复、产品介绍、素材说明、报价、跟进、样品和定制话术均只生成草稿，业务员必须手动确认后发送�?- 价格、库存、交期、运费、付款、物流、证书真实性和售后承诺均保留业务员确认提醒�?- V2 不引入收费、定价、支付、套餐、团�?角色/部门权限、完整订单系统、财务利润、采购预测或老板驾驶舱�?- 导入导出按当前登录用户隔离，不导出密钥、token、session、cookie 或其他用户数据�?
### Validation

- API 全量测试通过�?3 个测试文件，125 个测试�?- 类型检查通过：shared、api、web、extension�?- 生产构建通过：shared、api、web、extension�?- 自动发送风险扫描未发现 WhatsApp 自动发送、自动群发、模拟点击发送按钮相关逻辑�?- 部署配置检查覆�?Dockerfile、docker-compose.prod.yml�?env.example、运维脚本、部署文档、生�?smoke test �?Chrome Extension 生产文档�?
## Unreleased - V2-F 数据导入导出
### Added

- 新增 CSV 导出 API：`/api/export/customers`、`/api/export/products`、`/api/export/knowledge-base`、`/api/export/materials`、`/api/export/sample-orders`、`/api/export/custom-requests`�?- 新增 CSV 模板下载 API：`/api/import/templates/customers`、`/api/import/templates/products`、`/api/import/templates/knowledge-base`、`/api/import/templates/materials`、`/api/import/templates/sample-orders`、`/api/import/templates/custom-requests`�?- 新增 CSV 导入 API：`/api/import/customers`、`/api/import/products`、`/api/import/knowledge-base`、`/api/import/materials`、`/api/import/sample-orders`、`/api/import/custom-requests`�?- 导入支持 `multipart/form-data`、`.csv` 文件限制�?MB 文件大小限制、`dryRun=true` 预览校验�?`skipDuplicates=true` 重复跳过�?- Web 后台新增 `Import / Export` 页面，可下载模板、上�?CSV、预览错误、确认导入和导出当前用户数据�?- 客户导入支持重复 WhatsApp 号码跳过；产品导入支持重�?SKU 跳过；知识库、素材、样品单、定制需求导入支持当前用户下产品和客户关联校验�?
### Safety

- 所有导入数据自动绑定当前登录用户，CSV 中的 `ownerId`、`createdBy`、`organizationId`、密码、token、secret、API key、session、cookie 等敏感字段会被忽略�?- 所有导出接口只导出当前登录用户自己的数据，不导出密码、密钥、token、session、cookie �?`.env` 内容�?- CSV 导出�?`=`、`+`、`-`、`@` 开头的单元格做公式注入防护�?- V2-F 只做 CSV，不�?Excel、复杂字段映射器、收费、支付、团队权限、订单系统或 WhatsApp 自动发送�?- 继续禁止自动发�?WhatsApp 消息、自动群发、批量发送和模拟点击 WhatsApp 发送按钮�?
### Tests

- 新增 `import-export-api.test.ts`，覆�?6 类数据导出隔离、模板、CSV 注入转义、敏感字段排除、dryRun、实际导入、重复跳过、非法枚�?日期/数字、跨用户关联拒绝、非 CSV/恶意 MIME/超大文件拒绝�?
## Unreleased - V2-E 定制需求管�?
### Added

- 新增 `CustomRequest` 数据模型，记录客�?Logo、包装、颜色、尺寸、材质、OEM/ODM、数量、MOQ、打样费、打样周期、大货周期、文�?URL、状态和备注�?- 新增受保护定制需�?API：`/api/custom-requests`，覆盖创建、列表、详情、更新、删除、状态更新和定制话术生成�?- 定制需求按当前登录用户 `ownerId` 隔离，创建时校验 `customerId` 属于当前用户；传�?`productId` 时校验产品属于当前用户�?- Web 后台新增 `Custom` 页面，支持新�?编辑/删除、按类型/状态筛选、关键词搜索和生成定制话术草稿�?- 客户详情右侧记录区展示该客户定制需求�?- Chrome Extension 侧边栏新�?`定制` 入口，支持创建定制需求、填�?Logo/包装/颜色/尺寸/材质/数量/MOQ/打样�?周期/文件 URL，并生成定制话术草稿�?- 定制话术生成轻量引用知识�?`quote_rules`、`payment_methods`、`logistics`、`after_sales_policy` �?`faq`�?- 客户意向评分轻量联动定制需求：有定制需求、Logo/包装/OEM/ODM、较大数量、等待客户确认、样品确认会加分；取消会减分�?- 定制需求可创建普通跟进提醒，用于客户确认、打样完成或大货确认�?- 新增 V2-E 文档：`docs/v2-custom-request.md`�?
### Safety

- 定制需求只做销售需求记录和话术草稿，不做真实生产排期、订单系统、支付系统、财务利润或团队权限�?- 定制话术只生成草稿，不会自动发�?WhatsApp 消息�?- 继续禁止自动群发、批量发送、模拟点�?WhatsApp 发送按钮�?- 不编�?MOQ、打样费、打样周期、大货周期、付款方式、定制能力、客户文件可生产性或售后承诺�?- 缺少 Logo 文件、包装要求、MOQ、打样费或周期时，必须提醒业务员确认后再发送�?
### Tests

- 新增定制需求工具函数测试，覆盖表单校验、话术生成、缺失资料风险提醒和无自动发送逻辑�?- 新增定制需�?API 测试，覆盖创建、列表隔离、筛�?搜索、详�?更新/删除跨用户拒绝、跨用户客户/产品创建拒绝、状态更新和话术风险提醒�?- 更新客户意向评分测试，覆盖定制需求加�?减分联动�?
## Unreleased - V2-D 样品单管�?
### Added

- 新增 `SampleOrder` 数据模型，记录客户样品单、样品费、运费、付款状态、发货状态、物流单号、反馈状态、预计发�?签收日期和备注�?- 新增受保护样品单 API：`/api/sample-orders`，覆盖创建、列表、详情、更新、删除、付款状态更新、发货状态更新、反馈状态更新和样品话术生成�?- 样品单按当前登录用户 `ownerId` 隔离，创建时校验 `customerId` 属于当前用户；传�?`productId` 时校验产品属于当前用户�?- Web 后台新增“样品单”页面，支持新增/编辑/删除、搜索客户名/样品�?物流单号，并按付款、发货、反馈状态筛选�?- 客户详情右侧面板新增样品单区块，可查看客户样品单并快速新增�?- Chrome Extension 侧边栏新增“样品”入口，可保存样品单、生成样品报�?付款提醒/发货通知/反馈跟进/转大货引导草稿、复制或插入输入框�?- 样品话术生成轻量引用知识库：报价规则、付款方式、物流政策、售后政策和 FAQ 可作为草稿上下文�?- 客户意向评分轻量联动样品单：有样品单、样品已付款、样品签收满意、样品转大货会加分；样品无反馈会轻微减分�?- 新增 V2-D 样品单文档：`docs/v2-sample-order.md`�?
### Safety

- 样品单只做销售流程记录，不做在线支付、不做真实物流查询、不做完整订单系统�?- 样品话术只生成草稿，不会自动发�?WhatsApp 消息�?- 继续禁止自动群发、批量发送、模拟点�?WhatsApp 发送按钮�?- 不编造样品费、运费、交期、付款方式、样品费抵扣规则或物流时效�?- 涉及付款时提醒业务员确认收款账户和付款方式；涉及发货时提醒业务员确认物流单号、物流方式和时效�?
### Tests

- 新增样品单工具函数测试，覆盖表单校验、样品报价话术、发货话术风险提醒和无自动发送逻辑�?- 新增样品�?API 测试，覆盖创建、列表隔离、筛�?搜索、跨用户访问拒绝、跨用户客户/产品创建拒绝、状态更新和样品话术安全提醒�?- 更新客户意向评分关联数据，支持样品单规则加减分�?
## Unreleased - V2-C 客户意向评分

### Added

- 新增规则评分模块 `customer-intent-rules`，根据客户标签、销售阶段、报价记录、跟进任务、聊天摘要、备注和意向产品关键词动态计算意向分�?- 意向分范围为 `0-100`，意向等级为 `low`、`medium`、`high`�?- 新增客户意向 API�?  - `GET /api/customers/:id/intent`
  - `POST /api/customers/:id/recalculate-intent`
  - `GET /api/customers?sort=intentScore`
  - `GET /api/dashboard/high-intent-customers`
- 客户列表返回 `intentScore`、`intentLevel` �?`recommendedAction`，支持按意向分排序和按意向等级筛选�?- Web 后台客户列表显示意向分和等级，客户详情显示评分原因、推荐动作和重新计算按钮�?- 首页工作台新增高意向客户 Top 10，显示意向分、推荐动作和打开客户入口�?- Chrome Extension 侧边栏客户信息区显示意向分、意向等级和推荐动作；未保存客户时提示先保存�?- 新增 V2-C 文档：`docs/v2-customer-intent-score.md`�?
### Safety

- V2-C 只做规则评分，不做机器学习，不代表客户一定成交�?- 推荐动作只作为销售建议，不会自动发�?WhatsApp 消息�?- 继续禁止自动群发、批量发送、模拟点�?WhatsApp 发送按钮�?- 涉及价格、库存、交期、运费、付款仍需业务员确认�?
### Tests

- 新增意向评分规则测试，覆盖标签、阶段、报价、最近报价、pending 跟进、逾期跟进、关键词、无效客户、上下限和等级映射�?- 新增意向评分 API 测试，覆�?`/intent`、重新计算跨用户拒绝、客户列表按意向分排序、高意向 dashboard 当前用户隔离�?- 更新安全边界测试，确认插件侧边栏推荐动作不会自动发送消息�?
## Unreleased - V2-B 素材中心

### Added

- 新增 `Material` 数据模型，支持素材标题、类型、URL、描述、语言、可选关联产品、标签和 `ownerId`�?- 新增受保护素�?API：`/api/materials`，覆盖创建、列表、详情、更新、删除、筛选、搜索和素材说明生成�?- 素材按当前登录用�?`ownerId` 隔离，跨用户查看、更新、删除和生成说明返回 `404`�?- 创建或更新素材时，如果传�?`productId`，会校验产品属于当前登录用户�?- Web 后台新增 `素材中心` 页面，支持新�?编辑/删除素材、搜索、按类型/语言/产品筛选、图片预览和链接打开�?- Chrome Extension 侧边栏新�?`发素材` 入口，可搜索、筛选、选择素材并生成配套说明话术�?- 素材说明生成支持 `image`、`video`、`catalog`、`size_chart`、`buyer_show`、`factory_video`、`shipping_proof`、`payment_proof`、`certificate`、`other`�?- 素材说明轻量引用知识库：产品卖点、物流政策、付款方式、公司介绍和 FAQ 可作为草稿上下文�?- 新增 V2-B 素材中心文档：`docs/v2-material-center.md`�?
### Safety

- V2-B 只维�?URL 文本，不做真实文件上传或对象存储�?- 素材说明只生成草稿，不会自动发�?WhatsApp 消息�?- 继续禁止自动群发、批量发送、模拟点�?WhatsApp 发送按钮�?- `payment_proof` 会提醒业务员确认收款账户、付款方式和手续费�?- `shipping_proof` 会提醒业务员确认物流方式、目的地和时效�?- `certificate` 会提醒业务员确认证书/资质真实性，不编造认证范围或有效期�?- 不允许系统编造价格、库存、交期、证书真实性、物流时效、付款账户或售后承诺�?
### Tests

- 新增素材工具函数测试，覆盖表单校验、URL 安全、图片素材说明、付�?物流/证书风险提醒和无自动发送逻辑�?- 新增素材 API 测试，覆盖创建、列表隔离、详�?更新/删除跨用户拒绝、产品归属校验、类�?语言/产品/关键�?标签筛选、素材说明生成、知识库引用和安全提醒�?
## Unreleased - V2-A AI 公司知识�?
### Added

- 新增 `KnowledgeBase` 数据模型，支�?`title`、`category`、`content`、`language`、可�?`productId`、`enabled`、`ownerId`�?- 新增知识�?CRUD API：`/api/knowledge-base`�?- 知识库按当前登录用户 `ownerId` 隔离，跨用户查看、更新、删除返�?`404`�?- 创建或更新知识库时，如果传入 `productId`，会校验产品属于当前登录用户�?- Web 后台新增 `知识库` 页面，支持新增、编辑、删除、启�?禁用、搜索、按分类筛选、按语言筛选、按产品筛选�?- `POST /api/ai/reply` 支持 `customerId`、`productId`、`useKnowledgeBase`，并返回 `knowledgeUsed`�?- AI 回复前会检索当前用户启用的知识库内容，最多引�?5 条，避免 prompt 过长�?- 产品介绍生成轻量集成 `product_selling_points` 知识�?- 报价话术生成轻量集成 `quote_rules` �?`payment_methods` 知识�?- `forbidden_expressions` 作为风险规则，命中禁用表达时加入风险提醒�?- 新增 V2-A 知识库文档：`docs/v2-knowledge-base.md`�?
### Safety

- 知识库只作为 AI 草稿上下文，不会自动发�?WhatsApp 消息�?- 继续禁止自动群发、批量发送、模拟点�?WhatsApp 发送按钮�?- 若未命中知识库，AI 回复会提醒业务员确认公司政策、价格、库存、交期和售后规则�?- 知识库不能让系统编造价格、库存、运费、交期、折扣、付款条件或物流状态�?
### Tests

- 新增知识�?API 测试，覆盖创建、列表隔离、跨用户访问拒绝、产品归属校验、启�?禁用、筛选、搜索、AI 使用知识、未命中知识风险提醒、禁用表达风险提醒�?- 更新 AI 回复、产品介绍、报价测试，覆盖 `knowledgeUsed` 和安全边界�?
## v0.2-alpha - 2026-05-19

V1 内测版，目标是支�?5-10 位真实跨境业务员进行本地试用�?
### Added

- 基础账号体系�?  - `User` 模型、密码哈希、HTTP-only session cookie�?  - 登录、登出、当前用户接�?`/api/auth/me`�?  - Web 后台�?Chrome Extension 侧边栏均可识别登录态�?- 个人账号隔离�?  - Customer �?`ownerId` 隔离�?  - Product �?`ownerId` 隔离�?  - Quote �?`ownerId` / `createdBy` 隔离�?  - FollowUpTask �?`ownerId` 隔离�?  - 跨用户通过 ID 访问、修改、删除数据返�?`404`�?- 客户 CRM 最小闭环：
  - 登录后创建、查看、编辑、删除自己的客户�?  - 支持固定标签、销售阶段、备注、意向产品、下次跟进时间�?  - WhatsApp 侧边栏可保存/更新当前客户�?- 产品资料�?V1�?  - 产品 CRUD API �?Web 后台产品页�?  - 支持按名称、SKU、类目搜索�?  - 侧边栏选择产品，生成客户语言的产品介绍草稿�?  - 优先使用已维护的 `introEn` / `introEs` / `introPt` / `introAr`，否则使用规则模板生成草稿�?- 报价助手 V1�?  - 普通报价和阶梯报价�?  - 报价可保存到客户记录�?  - 客户详情右侧面板可查看报价历史�?  - 侧边栏可生成报价草稿并保存报价�?  - 风险提醒覆盖低于最低价、未填写运费、未填写交期、库存未建模、不可编造库�?运费/交期/折扣/付款条件�?- 跟进提醒 + 首页工作台：
  - FollowUpTask CRUD API�?  - 支持任务类型：报价后跟进、催付款、样品反馈、老客户复购、售后跟进、普通提醒�?  - 支持状态：pending、completed、cancelled�?  - 侧边栏可设置明天�? 天后、下周、自定义时间的跟进提醒�?  - 报价保存后可预填报价后跟进任务�?  - 首页工作台展示今日待跟进、逾期未跟进、未来待跟进、已报价未跟进客户、高意向待跟进客户、最近新增客户�?  - 任务可标记完成，完成后不再显示在待办列表�?- V1 全链路自动化验收�?  - 登录、`/api/auth/me`、AI 回复、客户保存、产品介绍、报价保存、客户报价记录、跟进提醒、首页工作台、标记完成、跨用户隔离�?- 内测文档�?  - `docs/beta-test-guide.md`
  - `docs/beta-test-checklist.md`
  - `docs/beta-feedback-form.md`

### Changed

- README 更新�?v0.2-alpha 内测说明�?- README 增加真实 Chrome 插件登录态验证步骤和排查说明�?- README 增加 V1 全链路验收命令、安全扫描命令和 Known Issues�?- Chrome Extension API 请求统一携带 `credentials: "include"`�?- 后端 CORS 支持 Web 前端 origin �?Chrome extension origin�?
### Safety

- 继续明确产品边界�?  - 不接�?WhatsApp 官方 API�?  - 不自动群发�?  - 不自动发�?WhatsApp 消息�?  - 不模拟用户批量轰炸陌生号码�?  - 不绕�?WhatsApp 风控�?  - AI、产品介绍、报价、跟进话术只生成草稿，最终发送由业务员手动确认�?- 安全扫描未发现自动点�?WhatsApp 发送按钮、自动群发、批量发送或定时发送逻辑�?
### Known Issues

- AI 回复、产品介绍和跟进话术仍为规则识别/模板草稿，未接入真实 LLM�?- Chrome 插件需要手动加�?`apps/extension/dist`，尚未发布到 Chrome Web Store�?- 插件真实登录态依赖浏览器 cookie 策略，跨�?cookie 在部�?Chrome 本地环境可能需要调�?`CHROME_EXTENSION_ORIGIN`、`SESSION_COOKIE_SAMESITE`、`SESSION_COOKIE_SECURE`�?- 产品图片/视频目前使用 URL 文本维护，暂不做文件上传�?- 产品库存字段尚未建模，报价和产品介绍中必须继续提醒业务员确认库存�?- 跟进提醒只做任务提示和话术草稿，暂不做浏览器通知、日历同步或 WhatsApp 自动提醒�?- 首页工作台是基础列表，暂不做分页、复杂筛选和批量操作�?- 当前目录不是 git 仓库，无法在本地创建真实 git tag�?
## v0.1-demo - 2026-05-18

第一阶段可演示原型�?
### Added

- Monorepo 基础结构：`apps/api`、`apps/web`、`apps/extension`、`packages/shared`�?- React + TypeScript + Vite Web 后台�?- Node.js + Express API 服务�?- PostgreSQL + Prisma schema�?- Chrome Extension Manifest V3�?- WhatsApp Web 右侧助手栏原型�?- 复制粘贴降级模式和插件识别状态：
  - 识别正常
  - 识别异常，已切换复制粘贴模式
  - 当前不是聊天窗口
  - WhatsApp 页面未打开
- AI 多语言回复接口 `POST /api/ai/reply`�?- 10 �?V1 高频 AI 场景识别：`price`、`moq`、`shipping`、`discount`、`sample`、`lead_time`、`product_proof`、`follow_up`、`payment`、`order_status`�?- 客户管理、产品资料库、报价助手的第一版原型�?- 安全边界：不接入 WhatsApp 官方 API、不自动群发、不自动发送、不绕过风控、AI 只生成草稿�?- 自动化测试覆�?AI 回复接口�?0 个高频场景、安全边界和基础工具函数�?
### Known Issues

- 尚未完成账号隔离和数据库持久化闭环�?- Chrome 插件需手动加载构建产物�?- AI 回复为规则识别和模板草稿，未接入真实大模型服务�?- 当前目录不是 git 仓库，无法创建真�?git tag�?
