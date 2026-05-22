# V5 Enterprise Audit

Current version: `v1.0-enterprise`

`EnterpriseAuditLog` records enterprise-level operations so owner/manager users can review cross-team changes without digging through module-specific logs.

## Recorded Events

- Organization unit create/update/archive.
- Enterprise member assignment and sensitive member updates.
- Enterprise role overlay creation/update.
- Enterprise report generation.
- Enterprise AI brand context checks.

## Fields

- `organizationId`
- `userId`
- `action`
- `entityType`
- `entityId`
- `metadata`
- `riskLevel`
- `createdAt`

## Privacy

Enterprise audit metadata must not include real secrets, `.env` content, server passwords, API keys, session secrets, cookie secrets, or full customer-sensitive message histories.

## Review

Owner and manager users can view organization audit logs through the `Enterprise` Web entry. Sales/support users cannot inspect cross-team enterprise audit trails.
