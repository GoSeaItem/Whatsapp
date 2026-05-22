# V4-M Brand / Store Management

Current V4 release target: `v0.6-v4-growth-ops`. All AI outputs remain draft-only; no automatic WhatsApp sending, bulk sending, simulated send-button clicking, real payment, real logistics, full ERP, full finance system, automatic customer/supplier contact, store API sync, or WhatsApp account switching is introduced.

V4-M lets one organization manage multiple brands, stores, product lines, or business lines. Brand context helps salespeople use the right products, materials, knowledge, scripts, quote rules, payment notes, logistics wording, and after-sales policy when drafting WhatsApp replies.

## Scope

- Manage brands/stores under an organization.
- Link products, materials, organization knowledge, and scripts to a brand.
- Maintain brand-level quote rules, payment methods, after-sales policies, logistics notes, forbidden expressions, and FAQ.
- Assign a brand to customers, quotes, orders, after-sales cases, reorder opportunities, suppliers, sample orders, and custom requests.
- Let the Chrome extension choose a brand context before generating drafts.

V4-M does not connect store APIs, switch WhatsApp accounts, sync store orders, auto-send WhatsApp messages, bulk send, or simulate WhatsApp send-button clicks.

## Models

- `Brand`: brand/store profile, default language/currency, country, status, and notes.
- `BrandProduct`: links one product to one brand.
- `BrandMaterial`: links one material to one brand.
- `BrandKnowledgeBase`: links organization knowledge to one brand.
- `BrandScript`: links organization scripts or script variants to one brand.
- `BrandRule`: brand rules for quote, payment, after-sales, logistics, forbidden expression, and FAQ.
- `BrandAssignment`: records manual brand assignment for business entities.

`Brand.name` is unique inside one organization. Deleting a brand archives it instead of removing history.

## Status

- `active`: shown in Web and extension selectors.
- `inactive`: visible in Web but not recommended.
- `archived`: hidden by default and retained for audit/history.

Archiving requires `confirm=true`.

## API

- `GET /api/brands`
- `POST /api/brands`
- `GET /api/brands/:id`
- `PATCH /api/brands/:id`
- `DELETE /api/brands/:id`
- `POST /api/brands/:id/products`
- `DELETE /api/brand-products/:id`
- `POST /api/brands/:id/materials`
- `DELETE /api/brand-materials/:id`
- `POST /api/brands/:id/knowledge-bases`
- `DELETE /api/brand-knowledge-bases/:id`
- `POST /api/brands/:id/scripts`
- `DELETE /api/brand-scripts/:id`
- `GET /api/brands/:id/rules`
- `POST /api/brands/:id/rules`
- `PATCH /api/brand-rules/:id`
- `DELETE /api/brand-rules/:id`
- `POST /api/brands/:id/assign`
- `GET /api/brands/context`

All APIs validate organization membership and role permissions.

## AI Context Priority

When `brandId` is provided, AI context priority is:

1. Current customer context.
2. Brand rules.
3. Brand-linked knowledge.
4. Brand-linked products/materials.
5. Organization public knowledge.
6. Personal knowledge.
7. Default safety rules.

AI responses include `brandUsed` and `brandRulesUsed` where supported. If brand rules are missing, the response includes a warning to confirm policy manually.

## Permissions

- `owner`: full brand management.
- `manager`: create/update/archive brands, link resources, manage rules, assign entities.
- `sales`: view active brands and use brand context in AI drafts.
- `support`: view active brands and use brand after-sales context where permitted.

Permission keys include `brand.view`, `brand.create`, `brand.update`, `brand.archive`, `brand.manageProducts`, `brand.manageMaterials`, `brand.manageKnowledge`, `brand.manageScripts`, `brand.manageRules`, `brand.assignEntity`, `brand.useInAI`, and `brand.export`.

## Chrome Extension

The sidebar has a Brand / Store selector. Selecting a brand:

- Filters product and material choices by brand where links exist.
- Passes `brandId` into AI draft calls.
- Does not switch WhatsApp account.
- Does not send or insert messages automatically without user action.

## Safety Boundaries

- Do not invent price, inventory, lead time, shipping cost, payment method, or after-sales policy.
- Do not mix policies across brands without warning.
- Do not promise brand authorization, free returns, or guaranteed delivery.
- All AI content is draft-only and must be manually reviewed before sending.

## Known Limits

- Full brand import/export is a future V4-A follow-up.
- Deep brand context is wired for AI reply, order scripts, fulfillment scripts, after-sales scripts, reorder operation scripts, supplier drafts, and A/B script variant generation. Some V4-C advanced decision endpoints still need a later hardening pass for full brand rule merging.
- Brand assignment is manual and may need a future one-brand-per-entity workflow if operations require strict exclusivity.


