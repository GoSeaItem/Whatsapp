# V5 Enterprise Reports

Current version: `v1.0-enterprise`

Enterprise reports provide a lightweight KPI snapshot for owner/manager review. Reports are generated on demand and stored as `EnterpriseReport` rows.

## Included Metrics

- V3/V4 team dashboard KPIs.
- Order count and pending-payment order count.
- Active brand count.
- Supplier count.
- Open after-sales case count.
- Enterprise role count.
- Member statistics.
- High-intent customers.

## Permissions

Only `owner` and `manager` can generate enterprise reports. Sales and support users receive `403` for organization-level report generation.

## Export

V5 records report data and prepares the model for future enterprise CSV/Excel export. Sensitive fields still require V4-D export permissions and audit logging.

## Limits

Reports are synchronous and lightweight in V5. A future queue can generate large multi-organization reports asynchronously.
