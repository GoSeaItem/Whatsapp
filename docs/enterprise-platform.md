# V5 Enterprise Platform

Current version: `v1.0-enterprise`

V5 upgrades the V4 growth-ops system into an enterprise platform layer for larger cross-border sales teams. It adds centralized organization-unit management, enterprise role overlays, enterprise reporting, enterprise audit logs, and enterprise AI brand context. It does not replace the V4 workflow modules; it coordinates them under stricter organization and permission boundaries.

## Scope

- `OrganizationUnit`: subsidiaries, branches, and business units under an existing organization.
- `EnterpriseRole`: enterprise permission overlays for owner/manager-controlled role matrices.
- `EnterpriseAuditLog`: centralized enterprise activity trail.
- `EnterpriseReport`: enterprise KPI snapshots across customers, orders, brands, suppliers, after-sales, members, and roles.
- `EnterpriseResourceLink`: future-safe cross-organization resource sharing records.
- Web entry: `Enterprise`.
- API entry: `/api/enterprise/*`.

## API

- `GET /api/enterprise/organizations`
- `POST /api/enterprise/organizations`
- `PATCH /api/enterprise/organizations/:id`
- `GET /api/enterprise/members`
- `POST /api/enterprise/members`
- `PATCH /api/enterprise/members/:id`
- `GET /api/enterprise/roles`
- `POST /api/enterprise/roles`
- `PATCH /api/enterprise/roles/:id`
- `GET /api/enterprise/reports`
- `POST /api/enterprise/reports`
- `GET /api/enterprise/audit-logs`
- `POST /api/enterprise/brand-context`

## Safety Boundary

V5 does not connect WhatsApp official APIs, auto-send messages, bulk send, simulate the WhatsApp send button, auto-contact customers or suppliers, auto-pay, auto-refund, auto-ship, auto-procure, or auto-confirm costs. AI output remains draft-only and advisory.

## Known Limits

Enterprise resource links are a foundation for future cross-organization sharing. V5 records the relationship shape but keeps actual sharing conservative and permission-gated.
