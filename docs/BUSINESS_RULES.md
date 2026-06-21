# Deferred Business Rules

## Scope
This phase implements interaction, data capture, operational reports, and the Excel-derived Monthly Profit & Loss calculation. Full accounting controls remain pending.

## Reporting Ledger Note (Current Build)
- The reports module now uses a lightweight operational ledger (collections, deposits, expenses) to produce functional management reports.
- This is not a full accounting subledger or GL implementation.
- The next upgrade phase should introduce full accounting controls: posting rules, reconciliation workflows, period close discipline, and audit-grade journal traceability.

## Formulas Pending
- Monthly net rental derivation from gross rental and service/admin/SST deductions.
- Cumulative gross/net rollups across billing periods.
- Late collection rule definition and threshold computation.
- Expiring tenancy rule window and status transitions.
- Monthly cash collection calculations.

## Monthly Profit & Loss Implemented
- Source workbook: `/Users/noorullah/Downloads/Rental Property Profit & Loss.xlsx`.
- Direct Expenses: Maintenance Charges, Sinking Fund Charges, Electricity Charges, Water Charges, Internet Charges, Fire Insurance Charges, Others - Depreciation.
- Indirect Expenses: Assessment monthly, Quit Rent monthly, Bank funding costs.
- `Subtotal of Direct Expenses = sum(Direct Expenses)`.
- `Net Rental Amount = Gross Rental Amount monthly - Subtotal of Direct Expenses`.
- `Subtotal of Indirect Expenses = sum(Indirect Expenses)`.
- `Net Rental Amount Receive = Net Rental Amount - Subtotal of Indirect Expenses`.
- `Others - Depreciation` stays under Direct Expenses and is marked non-cash for future reporting only.
- `Bank funding costs` remains one indirect expense category.

## Report Logic Pending
- Statement of Account generation rules by tenancy period.
- Periodic Cash Account consolidation algorithm for all tenancies.
- Export format/content rules and rounding policy.
- Null/missing value treatment for partial tenancy periods.

## Tenancy Lifecycle Rules Pending
- Exact lapse behavior on expiration when no extension is granted.
- Early closure side effects across reports and cumulative values.
- Backdated edits policy for rental and deduction records.

## File Handling Rules Pending
- Real PDF/invoice storage and retention policy.
- Validation rules for required attachments.
- Versioning/audit trail for replaced documents.

## Excel Dependency Status
The PDF references Excel calculations for:
- `3.4 Monthly cash collection`

- `3.3 Monthly Profit & Loss from rental` is implemented from the provided workbook.
- The monthly cash collection workbook/formula source is still pending.

## Assumptions In Current Build
- SQLite persists operational data through the local API server.
- Monthly P&L inputs are stored per property and period, with totals derived from workbook formulas.
- The current build is still an operational system, not an audit-grade accounting subledger.
- No approvals, multi-user concurrency controls, or accounting reconciliation workflows are implemented.
