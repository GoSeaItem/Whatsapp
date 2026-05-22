# V4-D Advanced Permissions and Audit

Current V4 release target: `v0.6-v4-growth-ops`. All AI outputs remain draft-only; no automatic WhatsApp sending, bulk sending, simulated send-button clicking, real payment, real logistics, full ERP, full finance system, automatic customer/supplier contact, store API sync, or WhatsApp account switching is introduced.

V4-D strengthens organization permissions, confirmation for sensitive actions, export controls, audit logs, and risk-event review. It does not add SSO, external IAM, payment, finance, a full order system, or any WhatsApp sending automation.

V4-G order fulfillment alerts are audited as order-related risk events. Alert recalculation, alert status changes, fulfillment follow-up creation, and fulfillment draft generation keep the same permission and audit boundaries.

## Permission Keys

Permission keys are centralized in shared code and grouped by:

- organization and member management
- customer ownership and assignment
- product and material access
- knowledge and script access
- quote, order, follow-up, sample order, and custom request workflows
- dashboard, report, import, export, and audit
- AI reply, next action, risk check, follow-up plan, sales summary, and organization knowledge/material usage

## Default Role Matrix

- `owner`: all permissions, organization deletion, member management, sensitive exports, full audit visibility.
- `manager`: team data, customer assignment, organization resources, team reports, normal exports, team audit logs. Cannot delete organization, remove owner, modify owner role, or export sensitive fields by default.
- `sales`: own/customer-assigned work only, can create normal sales records, can use shared organization resources, cannot manage members or export organization data.
- `support`: can view authorized customers and create support/follow-up records, cannot quote, delete customers, export data, manage public resources, or view team dashboards.

## Sensitive Confirmation

The following operations require `confirm=true`:

- deleting customers, products, quotes, orders, sample orders, and custom requests
- deleting organizations
- disabling/removing organization members
- changing member roles
- exporting sensitive organization fields

If confirmation is missing, the API returns `CONFIRM_REQUIRED` and writes a high-risk audit log.

## Export Permissions

Organization export supports:

- `fieldsScope=normal`: business overview fields
- `fieldsScope=sensitive`: contact, social, detailed notes, pricing, or payment-related fields

`owner` can export both. `manager` can export normal fields only. `sales/support` cannot create organization export jobs. CSV output keeps formula-injection protection and never exports passwords, tokens, secrets, cookies, sessions, API keys, `.env`, or server passwords.

## Audit Logs

`AuditLog` now supports:

- `metadata`
- `ipAddress`
- `userAgent`
- `riskLevel`

Audit APIs support filters for organization, user, action, entity type, entity ID, risk level, date range, keyword, page, and page size. Owner can view all organization logs. Manager can view team logs with sensitive metadata redacted. Sales/support can view only their own logs.

V4-F order operations are audited: create, update, delete, quote conversion, sample conversion, custom-request conversion, payment/production/shipping/after-sales status changes, follow-up creation and AI order script generation.

## Risk Events

`GET /api/security/risk-events` returns recent medium/high risk logs for owner/manager. Examples:

- delete customer or organization resource
- member role change or removal
- sensitive export attempt
- cross-organization access attempt
- missing confirmation
- permission denied

## Web Pages

The Web backend adds:

- Permission matrix page
- Risk events page
- Enhanced audit log filters and export
- Confirmation prompts for sensitive export and deletion flows where the UI owns the action

## Chrome Extension

The extension does not need new team logic for V4-D. If a protected API returns `403`, it displays a permission-denied message. It still does not auto-send WhatsApp messages, bulk send, or simulate clicking the WhatsApp send button.

## Safety Boundary

V4-D keeps the product boundary:

- no WhatsApp official API
- no automatic WhatsApp sending
- no bulk sending
- no send-button click simulation
- no key or `.env` export
- no online payment, real logistics query, finance, SSO, IAM, or full ERP/order fulfillment system

## Known Limits

- Permission rules are configuration-based, not a custom role builder.
- Confirmation prompts are implemented for the main API/UI paths; any future destructive endpoint must use the same `requireConfirm` utility.
- Risk events are listed in-app only; V4-D does not add email, SMS, or Slack notifications.

## V4-H Profit Permissions

V4-H adds fixed permission keys: `profit.viewOwn`, `profit.viewTeam`, `profit.editCost`, `profit.confirmCost`, `profit.deleteCost`, `profit.export`, and `profit.aiReview`. `support` has no profit access by default; `sales` can view only own accessible order profit; `manager` can edit and confirm costs; `owner` has full profit permissions.

Cost deletion and cost confirmation are audited. Cost deletion requires `confirm=true`.

## V4-J After-sales Permissions and Audit

V4-J adds afterSales permission keys for own/team visibility, creation, updates, close/delete, assignment, responsibility confirmation, solution confirmation, task creation, script generation, and export. Responsibility and solution confirmation are sensitive actions and require confirm=true. Refund/reship/compensation records, case closure, deletion, follow-up creation, optional cost sync, and AI after-sales scripts write audit or AI logs.

## V4-L Supplier / Procurement Permissions and Audit

V4-L adds supplier permission keys for supplier visibility, creation, update, delete, sensitive contact viewing, supplier quote management, quote-to-cost application, purchase notes, supplier risks, supplier links, and AI supplier scripts. Blocked suppliers, high-risk changes, supplier deletion/deactivation, contact deletion, quote deletion, supplier link deletion, and quote-to-cost application require confirmation where destructive or sensitive. Supplier operations write `AuditLog`; supplier draft generation writes `AIActionSuggestionLog`.

## V4-M Brand / Store Permissions and Audit

V4-M adds fixed permission keys: `brand.view`, `brand.create`, `brand.update`, `brand.archive`, `brand.manageProducts`, `brand.manageMaterials`, `brand.manageKnowledge`, `brand.manageScripts`, `brand.manageRules`, `brand.assignEntity`, `brand.useInAI`, and `brand.export`.

Default intent:

- `owner`: full brand permissions.
- `manager`: create/manage brands, resources, rules and brand assignments.
- `sales`: view active brands, use active brands in AI, and select brand context for owned/assigned work where allowed.
- `support`: view active brands and use brand after-sales context in authorized support scenarios.

Brand archival, resource unlinking, rule deletion/disable, and brand reassignment require confirmation where destructive or context-changing. Brand lifecycle, resource links, brand rules, entity assignment and AI brand-context usage write `AuditLog` or `AIActionSuggestionLog`. Brand context must never bypass organization, role, customer ownership, customer assignment, collaborator access, or resource ownership checks.



