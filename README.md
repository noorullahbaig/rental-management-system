# Rental System UI

Rental properties administration workspace built with Vite + React + TypeScript.

## What this build includes
- Responsive admin workspace for property, tenant, tenancy, deduction, and report workflows.
- SQLite-backed persistence through a local Node + Prisma API.
- Seeded starter operational portfolio aligned to the workbook model.
- Dedicated tenant workspace with filters, tenancy status table, and right-side inspector.
- Pop-out drawer interactions for major data entry flows.
- Excel-derived Monthly P&L workspace based on `/Users/noorullah/Downloads/Rental Property Profit & Loss.xlsx`.
- Monthly P&L detail, property comparison, and portfolio summary views with API-backed editable inputs.
- Operational reports for Statement of Account, cash account, monthly cash collection, arrears aging, rent roll, deposit register, and expense/depreciation schedule.

## What this build does not include
- No real file upload storage (metadata only).
- No full accounting subledger, period close, or audit-grade reconciliation.

Deferred logic is documented in [docs/BUSINESS_RULES.md](docs/BUSINESS_RULES.md).

## Commands
- `npm install`
- `npm run dev`
- `npm run dev:api`
- `npm run dev:web`
- `npm run db:push`
- `npm run db:seed`
- `npm run lint`
- `npm run build`
- `npm run test:api`
- `npm run test:pl`
- `npm run test:selectors`
- `npm run preview`

## Starter data
The backend seeds a starter operational portfolio on first run. Use `npm run db:seed` to restore the workbook-aligned baseline dataset during maintenance or local setup.

## Product docs
- [PRODUCT.md](PRODUCT.md)
- [DESIGN.md](DESIGN.md)
- [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md)
- [docs/BUSINESS_RULES.md](docs/BUSINESS_RULES.md)
