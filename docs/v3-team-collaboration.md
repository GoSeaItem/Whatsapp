# V3 Team Collaboration

V3-A adds the foundation for multi-salesperson teams. It introduces organizations, organization members, roles, and basic member management. It does not change existing V1/V2 personal account isolation.

V3-B adds role definitions and API-level permission checks for organization-context requests.

V3-C adds customer ownership, assignment, collaborator visibility, duplicate collision checks, and customer assignment logs for organization-context customers.

V3-D extends duplicate collision detection with WhatsApp number, email, and social media links. It blocks same-organization duplicates while allowing cross-organization duplicates.

V3-E adds organization-shared knowledge and script libraries. AI reply generation can reference enabled organization knowledge, while public scripts give teams a shared draft library.

V3-F adds organization-shared product and material libraries. Teams can share existing products and material URLs into an organization library while keeping the underlying personal ownership model.

V3-G upgrades the lightweight audit trail into organization operation logs with before/after snapshots, role-based visibility, filtering, and CSV export.

V3-H adds a manager-only team dashboard for organization KPI, salesperson progress, and high-intent customer prioritization.

## Scope

V3-A includes:

- Organization creation, listing, detail, update, and delete.
- Organization member listing, adding, role/status update, and removal.
- Roles: `owner`, `manager`, `sales`, `support`.
- Member statuses: `active`, `inactive`.
- Web backend page: `Organizations`.
- API tests for ownership, role permissions, and cross-organization rejection.

V3-B includes:

- Organization-scoped `Role` records.
- Default role descriptions for `owner`, `manager`, `sales`, and `support`.
- Role management APIs.
- Web backend `Roles` page.
- API-level organization-context permission middleware for products, materials, and knowledge base.

V3-C includes:

- Organization-aware customer records with `organizationId`, `assignedTo`, `collaborators`, and `email`.
- Customer assignment API and assignment history.
- Role-aware organization customer visibility.
- Duplicate collision checks by WhatsApp number or email within the current personal or organization scope.
- Web backend customer page updates for owner, organization, assigned user, collaborators, email, and assignment logs.

V3-D includes:

- `Customer.socialLinks` for customer Instagram, Facebook, TikTok, LinkedIn, or other profile URLs.
- `CustomerDuplicateEventLog` for recording duplicate pre-check, blocked create/update, and skipped import events.
- Duplicate pre-check API for the Web customer form.
- Customer create/update collision checks by WhatsApp number, email, and social links.
- Customer CSV import duplicate checks in `dryRun` and formal import.
- Web duplicate warning that shows the matched customer, owner, assigned user, and matched fields.

V3-E includes:

- `KnowledgeBaseOrg` for organization-level shared knowledge.
- `ScriptOrg` for organization-level shared scripts.
- `AuditLog` for organization knowledge/script create, update, and delete operations.
- Organization knowledge APIs under `/api/knowledge-base/org`.
- Organization script APIs under `/api/scripts/org`.
- Web backend pages: `Org knowledge` and `Org scripts`.
- AI reply lookup with `organizationId`, returning `[Org]` in `knowledgeUsed` for organization sources.
- Enabled/disabled state for shared records.

V3-F includes:

- `OrganizationProduct` links existing products to an organization shared product library.
- `OrganizationMaterial` links existing materials to an organization shared material library.
- Organization product APIs under `/api/products/org`.
- Organization material APIs under `/api/materials/org`.
- Web backend pages: `Org products` and `Org materials`.
- Quote generation can use organization-shared products when `organizationId` is provided.
- Audit log records for shared product/material create, update, and delete operations.

V3-G includes:

- `AuditLog.userId`, `before`, and `after` fields.
- Audit log APIs under `/api/audit-logs`.
- Web backend page: `Audit logs`.
- Filters by entity type, user, action, and time range.
- CSV export with formula-injection and sensitive-field protection.
- Audit entries for organization-context customer, quote, shared product, shared material, organization knowledge/script, and follow-up task create/update/delete paths.

V3-H includes:

- Team summary API under `/api/dashboard/team-summary`.
- Organization-scoped high-intent customer API under `/api/dashboard/high-intent-customers?organizationId=...`.
- Team KPI cards for today new customers, today follow-ups, overdue follow-ups, high-intent customers, and quoted customers without pending follow-up.
- Salesperson stats by organization member: customer count, completed follow-ups, and quote count.
- Web backend page: `Team dashboard`.
- CSV export for visible team dashboard data.

V3-A does not include:

- Shared customer/product/material/knowledge data.
- Custom role names or a custom permission matrix.
- Team dashboards, departments, or advanced permissions.
- Invitations by email.
- Billing, payments, subscriptions, finance, or order management.
- WhatsApp official API, automatic WhatsApp sending, bulk sending, or simulated send-button clicks.

## Data Model

### Organization

- `id`
- `name`
- `ownerId`
- `createdAt`
- `updatedAt`

`ownerId` references `User.id`.

### OrganizationMember

- `id`
- `organizationId`
- `userId`
- `role`
- `status`
- `createdAt`
- `updatedAt`

`organizationId` references `Organization.id`. `userId` references `User.id`.

### Role

- `id`
- `organizationId`
- `name`
- `description`
- `createdAt`
- `updatedAt`

`organizationId` references `Organization.id`. `name` must be one of `owner`, `manager`, `sales`, or `support`. `(organizationId, name)` is unique.

### Customer V3-C Fields

V3-C and V3-D extend the existing `Customer` model:

- `email`
- `socialLinks`
- `organizationId`
- `assignedTo`
- `collaborators`

`organizationId` remains nullable so existing V1/V2 personal customers continue to work. Organization customers must use members from the same organization for `ownerId`, `assignedTo`, and `collaborators`.

### CustomerAssignmentLog

- `id`
- `customerId`
- `organizationId`
- `fromUserId`
- `toUserId`
- `operatedBy`
- `note`
- `createdAt`

Assignment logs record customer owner/manager assignment operations. They are not a full audit log for every customer edit.

### CustomerDuplicateEventLog

- `id`
- `organizationId`
- `ownerId`
- `attemptedBy`
- `matchedCustomerId`
- `fields`
- `source`
- `action`
- `createdAt`

Duplicate event logs record when duplicate customer checks are detected, blocked, or skipped. They are not a full customer merge history.

### KnowledgeBaseOrg

- `id`
- `organizationId`
- `title`
- `category`
- `content`
- `language`
- `enabled`
- `createdBy`
- `createdAt`
- `updatedAt`

`organizationId` references `Organization.id`. `createdBy` references `User.id`. Categories reuse the V2 knowledge categories: `company_intro`, `product_selling_points`, `logistics`, `after_sales_policy`, `quote_rules`, `payment_methods`, `forbidden_expressions`, and `faq`.

### ScriptOrg

- `id`
- `organizationId`
- `title`
- `category`
- `content`
- `language`
- `enabled`
- `createdBy`
- `createdAt`
- `updatedAt`

Script categories are fixed to: `price`, `moq`, `shipping`, `discount`, `sample`, `payment`, `follow_up`, `product_intro`, `quote`, `after_sales`, `custom`, and `general`.

### AuditLog

- `id`
- `organizationId`
- `actorId`
- `userId`
- `action`
- `entityType`
- `entityId`
- `before`
- `after`
- `metadata`
- `createdAt`

V3-G uses `AuditLog` for organization operation review. `actorId` is retained for compatibility with V3-E/V3-F logs, while new writes also set `userId`. `before` and `after` are JSON snapshots with password, token, secret, cookie, session, and API key fields filtered before storage.

### OrganizationProduct

- `id`
- `organizationId`
- `productId`
- `createdBy`
- `createdAt`
- `updatedAt`

`organizationId` references `Organization.id`. `productId` references `Product.id`. `(organizationId, productId)` is unique so the same product cannot be shared twice into the same organization.

### OrganizationMaterial

- `id`
- `organizationId`
- `materialId`
- `createdBy`
- `createdAt`
- `updatedAt`

`organizationId` references `Organization.id`. `materialId` references `Material.id`. `(organizationId, materialId)` is unique so the same material cannot be shared twice into the same organization.

Constraints:

- `(organizationId, userId)` is unique.
- `role` must be one of `owner`, `manager`, `sales`, `support`.
- `status` must be one of `active`, `inactive`.

## API

All APIs require login.

### Organization APIs

- `GET /api/organizations`: return organizations where current user is owner or active member.
- `GET /api/organizations/:id`: return organization detail and members if current user can see it.
- `POST /api/organizations`: create organization and automatically add current user as owner member.
- `PATCH /api/organizations/:id`: update organization name, owner only.
- `DELETE /api/organizations/:id`: delete organization, owner only.

### Member APIs

- `GET /api/organizations/:id/members`: list members in the organization.
- `POST /api/organizations/:id/members`: add existing user by `userId`, owner or manager only.
- `PATCH /api/organizations/:id/members/:memberId`: update role or status, owner or manager only.
- `DELETE /api/organizations/:id/members/:memberId`: remove member, owner or manager only.

Managers cannot update or remove owner members. The `owner` member role is reserved for the organization creator in V3-A; member management cannot add another owner or promote a member to owner. Adding a member validates that the user exists and rejects duplicate membership.

### Role APIs

- `GET /api/roles?organizationId=...`: list current organization roles. Missing default role descriptions are recreated automatically.
- `GET /api/roles/:id`: role detail.
- `POST /api/roles`: create a role definition for a fixed role name, owner only.
- `PATCH /api/roles/:id`: update role description, owner only.
- `DELETE /api/roles/:id`: delete role definition, owner only.

Role names are fixed: `owner`, `manager`, `sales`, `support`.

### Customer Assignment APIs

- `GET /api/customers?organizationId=...`: list visible organization customers for the current member.
- `GET /api/customers/:id`: return customer detail and assignment logs if the current user can see the customer.
- `POST /api/customers/check-duplicate`: check WhatsApp number, email, and social links before customer save.
- `POST /api/customers`: create a personal or organization customer. Organization customers validate member ownership and duplicate collision rules.
- `PATCH /api/customers/:id`: update customer details when the current user owns or is assigned to the customer.
- `DELETE /api/customers/:id`: delete customer when the current user owns or is assigned to the customer.
- `POST /api/customers/:id/assign`: assign customer to an active organization member, `owner` or `manager` only.

Duplicate collision checks reject or skip duplicate WhatsApp numbers, emails, and social links within the same personal or organization scope. Cross-organization duplicates are allowed.

### Customer Import APIs

- `POST /api/import/customers?dryRun=true`: validates duplicate rows without writing.
- `POST /api/import/customers?skipDuplicates=true`: formally imports and skips duplicate rows by default.
- `POST /api/import/customers?skipDuplicates=false`: returns duplicate rows as row-level errors.
- `organizationId` can be passed in query/body/header for organization-scoped customer import; `support` is read-only and cannot import organization customers.

### Organization Knowledge APIs

- `GET /api/knowledge-base/org?organizationId=...`: list organization knowledge visible to current organization members.
- `GET /api/knowledge-base/org/:id`: detail for a visible organization knowledge item.
- `POST /api/knowledge-base/org`: create organization knowledge, `owner` or `manager` only.
- `PATCH /api/knowledge-base/org/:id`: update organization knowledge or toggle `enabled`, `owner` or `manager` only.
- `DELETE /api/knowledge-base/org/:id`: delete organization knowledge, `owner` or `manager` only.

Filters: `q`, `category`, and `language`.

### Organization Script APIs

- `GET /api/scripts/org?organizationId=...`: list organization scripts visible to current organization members.
- `GET /api/scripts/org/:id`: detail for a visible organization script.
- `POST /api/scripts/org`: create organization script, `owner` or `manager` only.
- `PATCH /api/scripts/org/:id`: update organization script or toggle `enabled`, `owner` or `manager` only.
- `DELETE /api/scripts/org/:id`: delete organization script, `owner` or `manager` only.

Filters: `q`, `category`, and `language`.

### Organization Product APIs

- `GET /api/products/org?organizationId=...`: list organization shared products.
- `GET /api/products/org/:id`: detail for a shared product link and underlying product.
- `POST /api/products/org`: share an owned product to the organization, `owner` or `manager` only.
- `PATCH /api/products/org/:id`: update the underlying shared product, `owner` or `manager` only.
- `DELETE /api/products/org/:id`: remove product from organization shared library, `owner` or `manager` only.

Filters: `q` and `category`.

### Organization Material APIs

- `GET /api/materials/org?organizationId=...`: list organization shared materials.
- `GET /api/materials/org/:id`: detail for a shared material link and underlying material.
- `POST /api/materials/org`: share an owned material to the organization, `owner` or `manager` only.
- `PATCH /api/materials/org/:id`: update the underlying shared material, `owner` or `manager` only.
- `DELETE /api/materials/org/:id`: remove material from organization shared library, `owner` or `manager` only.

Filters: `q`, `type`, and `productSku`.

### Audit Log APIs

- `GET /api/audit-logs?organizationId=...`: list audit logs for the selected organization.
- `GET /api/audit-logs/:id`: read one audit log detail.
- `GET /api/audit-logs?organizationId=...&format=csv`: export visible audit logs as CSV.

Filters: `entityType`, `userId`, `action`, `from`, `to`, `page`, and `pageSize`.

Permissions:

- `owner` / `manager`: can view organization audit logs.
- `sales` / `support`: can only view their own audit logs.
- Cross-organization access is rejected.

### Team Dashboard APIs

- `GET /api/dashboard/team-summary?organizationId=...`: returns team KPI, salesperson stats, and sanitized high-intent customers.
- `GET /api/dashboard/team-summary?organizationId=...&format=csv`: exports visible team summary data as CSV.
- `GET /api/dashboard/high-intent-customers?organizationId=...`: returns sanitized high-intent customers for the selected organization.

Permissions:

- `owner` / `manager`: can access team dashboard data.
- `sales` / `support`: receive `403`.
- Cross-organization access is rejected.
- Contact fields such as WhatsApp number and email are not returned in team high-intent customer rows.

## Web Page

The Web backend navigation includes `Organizations` and `Roles`.

The page supports:

- Creating an organization.
- Selecting an organization.
- Editing organization name.
- Deleting an organization.
- Searching members by name or email.
- Adding a member by userId.
- Updating member role.
- Updating member status.
- Removing a member.

The `Roles` page supports:

- Selecting an organization.
- Searching role names/descriptions.
- Viewing role name and description.
- Creating a role definition for a fixed role name.
- Updating role description.
- Deleting role definition.
- Owner-only action buttons.

The UI disables actions when the current user does not have the required role and shows a short permission note.

The `Customers` page supports V3-C fields:

- Organization filter.
- Social links field.
- Email field.
- Assigned user ID.
- Collaborator user IDs.
- Assignment action button.
- Assignment history in the customer detail panel.
- Owner, assigned user, and collaborator count in the customer list.
- Duplicate warning panel before save, showing owner, assigned user, and matched fields.

The `Import / Export` page supports V3-D customer CSV duplicate checks through the existing customer import flow. Customer templates and exports include `socialLinks`, using `|` for multiple links.

The `Org knowledge` page supports:

- Selecting an organization.
- Searching shared knowledge by title, content, category, or language.
- Filtering by category and language.
- Creating, editing, deleting, enabling, and disabling shared knowledge for `owner` / `manager`.
- Read-only viewing for `sales` / `support`.

The `Org scripts` page supports:

- Selecting an organization.
- Searching shared scripts.
- Filtering by script category and language.
- Creating, editing, deleting, enabling, and disabling shared scripts for `owner` / `manager`.
- Read-only viewing for `sales` / `support`.

The `Org products` page supports:

- Selecting an organization.
- Searching shared products by name, SKU, and category.
- Adding an existing personal product to the organization library.
- Updating shared product fields for `owner` / `manager`.
- Removing a product from the organization library without deleting the underlying personal product.
- Read-only viewing for `sales` / `support`.

The `Org materials` page supports:

- Selecting an organization.
- Searching shared materials by title, type, URL, and product SKU.
- Adding an existing personal material to the organization library.
- Updating shared material URL, type, tags, product link, and description for `owner` / `manager`.
- Removing a material from the organization library without deleting the underlying personal material.
- Read-only viewing for `sales` / `support`.

The `Audit logs` page supports:

- Selecting an organization.
- Filtering by entity type, action, user ID, and time range.
- Viewing operation time, actor, action, entity type, and entity ID.
- Opening before/after JSON snapshots.
- CSV export of visible audit rows.
- Sales/support self-only visibility notice.

The `Team dashboard` page supports:

- Organization KPI cards.
- Salesperson stat rows.
- High-intent customer list without contact fields.
- CSV export.
- Clicking KPI cards to open filtered customer lists where applicable.
- Hidden navigation for `sales` / `support` users.

## Permissions

- Visible organization: current user is `ownerId` or has an active membership.
- Organization update/delete: `owner` only.
- Member add/update/delete: `owner` or `manager`.
- Owner membership cannot be removed or changed in V3-A; ownership transfer is a later TODO.
- Cross-organization access returns not found or forbidden and does not expose another organization members.

Role permissions in V3-B:

- `owner`: full organization access; can manage organization, members, roles, and organization-context resources.
- `manager`: can manage members and organization-context resources, but cannot manage role definitions or delete organization.
- `sales`: read-only access to organization-context resources.
- `support`: read-only access to organization-context resources.

Organization-context permission middleware checks `organizationId` from query/body or `x-organization-id` header. For products, materials, and knowledge base:

- GET/HEAD/OPTIONS are allowed for any active organization member.
- POST/PATCH/DELETE require `owner` or `manager`.
- Without organization context, existing personal-account isolation remains unchanged.

Customer permissions in V3-C are more specific:

- Personal customers without `organizationId` remain visible only to `ownerId`.
- Organization `owner` and `manager` can view, edit, delete, and assign customers in the organization.
- `sales` and `support` can only view customers where they are `ownerId`, `assignedTo`, or listed in `collaborators`.
- Customer create binds `ownerId` to the current user.
- Organization customer create validates `assignedTo` and every collaborator as active organization members.
- `sales` can edit/delete customers they created or are assigned to.
- `support` and collaborators have read-only access to organization customers.
- Customer assignment requires organization `owner` or `manager`.
- Cross-organization access is rejected.

Audit log permissions in V3-G:

- Logs are scoped by `organizationId`.
- `owner` and `manager` can inspect organization logs for audit and operations review.
- `sales` and `support` can only inspect their own logs, even when they pass another `userId` filter.
- Logs are read-only; there is no update or delete API for audit records.
- Audit CSV exports only rows visible to the current user.

Team dashboard permissions in V3-H:

- Requires selected organization and `owner` / `manager` role.
- `sales` and `support` cannot call the API or see the Web entry.
- Statistics are scoped to customers in the selected organization.
- Member stats count customers by `assignedTo` when present, otherwise `ownerId`; completed follow-ups by task owner; quotes by `createdBy` / `ownerId`.

Duplicate collision permissions in V3-D:

- Personal duplicate checks are scoped to `ownerId`.
- Organization duplicate checks are scoped to `organizationId`.
- Cross-organization duplicates are allowed.
- `owner` and `manager` can see and handle organization duplicate prompts.
- `sales` can create and maintain customers they own or are assigned to, but cannot overwrite another member's customer.
- `support` and collaborators remain read-only and cannot create, import, or overwrite organization customers.
- CSV import ignores `ownerId`, `createdBy`, `organizationId`, password, token, secret, API key, session, and cookie fields.

Organization shared content permissions in V3-E:

- All shared knowledge and shared script records must belong to an organization where the current user is an active member.
- `owner` and `manager` can create, update, delete, enable, and disable shared content.
- `sales` and `support` can read shared content but cannot modify it.
- Cross-organization access returns forbidden or not found and does not expose another organization's data.
- Create/update/delete actions write lightweight `AuditLog` records.

Organization shared product/material permissions in V3-F:

- All shared product/material links must belong to an organization where the current user is an active member.
- Adding a shared product/material requires the current user to own the underlying personal record.
- `owner` and `manager` can add, update, and remove shared products/materials.
- `sales` and `support` can read shared products/materials but cannot modify them.
- Cross-organization access is rejected.
- Create/update/delete actions write lightweight `AuditLog` records.

AI knowledge lookup priority in V3-E:

1. Product-specific personal knowledge for the current user.
2. Enabled organization knowledge for the provided `organizationId`.
3. General personal knowledge for the current user.
4. Default prompt/rule behavior.

Organization knowledge is returned in `knowledgeUsed` with a `[Org]` prefix. Disabled organization knowledge is never used by AI lookup.

AI / quote usage in V3-F:

- Quote generation accepts `organizationId` and can use products shared into that organization.
- Product/material organization pages expose only resources shared into the selected organization.
- AI, quote, material, product introduction, and script text remain draft-only. No WhatsApp message is sent automatically.

Existing V1/V2 business data remains personal:

- Customer: `ownerId`
- Product: `ownerId`
- Quote: `createdBy`
- FollowUpTask: `ownerId`
- KnowledgeBase: `ownerId`
- Material: `ownerId`
- SampleOrder: `ownerId`
- CustomRequest: `ownerId`
- Import/export: current user only

## Safety Boundary

V3-A does not add any WhatsApp automation. The product still follows these rules:

- No WhatsApp official API.
- No automatic WhatsApp message sending.
- No automatic bulk sending.
- No simulated clicking of WhatsApp send buttons.
- Generated content remains draft only.
- Salesperson must manually confirm before sending.

## Known Issues / TODO

- Organization-shared customer records are implemented for V3-C/V3-D, but related quotes, follow-up tasks, samples, custom requests, products, knowledge, materials, and most import/export data still largely keep their existing personal ownership rules unless explicitly using organization context.
- Member invite flow by email is not implemented; use existing `userId`.
- V3-G records organization-context business CRUD snapshots, but member-management audit events and personal-only legacy records remain later tasks.
- V3-H is an operational team dashboard only. It is not a full boss dashboard, finance dashboard, order dashboard, or performance-pay system.
- No department hierarchy or advanced role matrix yet.
- No transfer-owner flow yet.
- Organization deletion currently removes only organization and membership records, not personal business data.
- Customer assignment form currently uses raw user IDs; a member picker is a later UX improvement.
- Duplicate detection is exact-match only for WhatsApp number, email, and social links. No fuzzy matching, automatic merge, customer pool, or lead claiming workflow yet.
- V3-E shared script records are managed and searchable, and can be referenced as lightweight AI reply context; full script recommendation/ranking in the sidebar is a later improvement.
- `AuditLog` now covers organization-context customer, quote, shared product/material, organization knowledge/script, and follow-up task create/update/delete paths where an `organizationId` is available. Some legacy personal-only V1/V2 operations intentionally remain outside organization audit logs.
- V3-F organization resources are shared links to personal products/materials. Full organization-owned product/material records, inventory, file upload, object storage, and approval workflows are later tasks.
