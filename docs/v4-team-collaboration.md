# V4-A Organization Import / Export

Current V4 release target: `v0.6-v4-growth-ops`. All AI outputs remain draft-only; no automatic WhatsApp sending, bulk sending, simulated send-button clicking, real payment, real logistics, full ERP, full finance system, automatic customer/supplier contact, store API sync, or WhatsApp account switching is introduced.

## V4-C AI Advanced Enhancement

V4-C adds AI next-action suggestions, structured customer sales summaries, multi-scenario sales drafts, risk checks, and follow-up plan generation. These features reuse organization/customer ownership rules and write `AIActionSuggestionLog` plus audit entries. All outputs are drafts or suggestions only and never send WhatsApp messages automatically. See [v4-ai-advanced.md](v4-ai-advanced.md).

## V4-D Advanced Permissions and Audit

V4-D adds a centralized permission matrix, sensitive operation confirmation, normal/sensitive organization export scopes, enhanced audit logs, and risk-event review. Owner has full access, manager can operate team resources with sensitive limits, sales is limited to owned/assigned work, and support is read/support focused. See [v4-permissions-audit.md](v4-permissions-audit.md).

## V4-B Cross-organization Reports

V4-B adds organization reporting APIs and a Web `报表分析` page for owner/manager users.

### Data Sources

Reports use existing data:

- `Organization`
- `OrganizationMember`
- `Customer`
- `Quote`
- `FollowUpTask`
- `KnowledgeBaseOrg`
- `ScriptOrg`
- `OrganizationProduct`
- `OrganizationMaterial`

V4-B adds `ReportJob` for report task tracking.

### ReportJob

- `id`
- `organizationId`
- `type`: `customer_summary`, `quote_summary`, `followup_summary`
- `filters`
- `status`: `pending`, `processing`, `completed`, `failed`
- `result`
- `createdBy`
- `createdAt`
- `updatedAt`

### APIs

- `GET /api/reports/team-summary?organizationId=xxx`
- `GET /api/reports/high-intent-customers?organizationId=xxx`
- `POST /api/reports/generate?organizationId=xxx`
- `GET /api/reports/:id/status`

`GET /api/reports/team-summary` supports:

- `format=csv`
- `format=excel`

The Excel option is an Excel-compatible tabular export from the same report data.

### Metrics

Team KPI:

- Today new customers
- Today follow-up customers
- Overdue follow-up customers
- High-intent customers
- Quoted customers without pending follow-up

Salesperson stats:

- Customer count
- Completed follow-up count
- Quote count

High-intent customers can be filtered by:

- salesperson / assigned user
- stage
- intent level

### Permissions

- `owner` and `manager` can access reports and create report jobs.
- `sales` and `support` receive `403`.
- Cross-organization report status access is rejected.
- High-intent report rows hide WhatsApp number and email.

### Audit Logs

`POST /api/reports/generate` writes an `AuditLog` entry with:

- organization
- actor
- report type
- filters
- status
- result summary

### Web Page

The Web backend adds `报表分析` for selected organization owner/manager users.

The page includes:

- KPI cards
- salesperson statistics
- high-intent customer list
- salesperson / stage / intent filters
- report job generation
- CSV export
- Excel-compatible export

### Known Issues

- Report jobs are generated synchronously in this iteration.
- Multi-organization comparison charts are not implemented yet.
- Excel export is not a styled `.xlsx` workbook.
- Reports are management aids only and do not guarantee customer conversion.

---

V4-A adds organization-level bulk import/export jobs on top of the V3 organization, role, shared resource, audit log, and team dashboard foundation.

## Scope

Supported organization data types:

- `customer`
- `product`
- `material`
- `knowledge`
- `script`

V4-A does not add WhatsApp official API access, automatic WhatsApp sending, bulk sending, simulated send-button clicking, payments, finance, or a full order system.

## Data Models

`ImportJob`

- `id`
- `organizationId`
- `type`
- `filePath`
- `dryRun`
- `status`: `pending`, `processing`, `completed`, `failed`
- `result`
- `createdBy`
- `createdAt`
- `updatedAt`

`ExportJob`

- `id`
- `organizationId`
- `type`
- `filePath`
- `status`: `pending`, `processing`, `completed`, `failed`
- `filters`
- `createdBy`
- `createdAt`
- `updatedAt`

## APIs

Organization import:

- `POST /api/import/:type?organizationId=xxx&dryRun=true`
- `POST /api/import/:type?organizationId=xxx&dryRun=false`
- `GET /api/import/:id/status`

Organization export:

- `POST /api/export/:type?organizationId=xxx`
- `GET /api/export/:id/status`

`type` must be one of:

- `customer`
- `product`
- `material`
- `knowledge`
- `script`

## Permissions

- `owner` and `manager` can create import/export jobs.
- `sales` and `support` are read-only and receive `403` when creating jobs.
- Job status can only be read by active members of the same organization.
- Cross-organization access is rejected.

## Import Behavior

`dryRun=true` validates data without writing to the database.

Formal imports:

- Customers are created with `organizationId`, `ownerId`, `assignedTo`, and optional collaborators.
- Products are created as operator-owned products and shared through `OrganizationProduct`.
- Materials are created as operator-owned materials and shared through `OrganizationMaterial`.
- Knowledge records are created in `KnowledgeBaseOrg`.
- Script records are created in `ScriptOrg`.

Sensitive fields are ignored during import:

- `ownerId`
- `createdBy`
- `organizationId`
- password fields
- token fields
- secret fields
- cookie/session fields
- API key fields

## Export Behavior

Exports are organization-scoped and use CSV-compatible output rules. Formula-like cells are escaped to reduce CSV injection risk.

V4-A records export tasks synchronously. The job stores a generated file path placeholder for later persisted download support.

## Audit Logs

Every organization import/export task writes `AuditLog`:

- `ImportJob`
- `ExportJob`

The log includes organization, actor, job type, status, and summary metadata.

## Web Page

The Web backend `导入/导出` page contains:

- organization selector
- organization data type selector
- CSV upload
- dryRun validation
- formal import
- export job creation
- job status summary

## Known Issues

- Jobs are processed synchronously in the API process; no background queue is used yet.
- CSV is the supported format in this iteration. Excel import/export is not implemented.
- Export file persistence and direct download by job ID are placeholders for a later V4 iteration.
- Duplicate detection remains exact-match only.


