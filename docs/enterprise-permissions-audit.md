# V5 Enterprise Permissions And Audit

Current version: `v1.0-enterprise`

V5 keeps the V4 role model (`owner`, `manager`, `sales`, `support`) and adds enterprise permission overlays through `EnterpriseRole`.

## Default Access

- `owner`: full enterprise access, including organization units, members, enterprise roles, reports, audit logs, and sensitive operations.
- `manager`: can manage organization units, members, role overlays, normal enterprise reports, and enterprise audit review.
- `sales`: can use allowed organization resources but cannot manage enterprise roles, organization units, or enterprise exports.
- `support`: limited to authorized customer/support workflows and cannot manage enterprise resources.

## Confirmation

Sensitive enterprise changes require explicit confirmation:

- Archiving organization units.
- Changing enterprise member roles or disabling members.
- Future sensitive exports or destructive cross-organization resource actions.

## Audit

Enterprise actions are recorded in `EnterpriseAuditLog` and mirrored to `AuditLog` when an organization is available. Risk levels follow V4-D:

- `high`: destructive or sensitive permission changes.
- `medium`: enterprise create/update/report/context actions.
- `low`: ordinary view-style operations.

## Security Boundary

No enterprise permission grants the system permission to auto-send WhatsApp messages, bulk send, simulate clicks, auto-contact suppliers, or bypass human review.
