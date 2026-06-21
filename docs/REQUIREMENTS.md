# Requirements Coverage

Source: `/Users/noorullah/Downloads/System Requirements for Rental Properties.pdf.pdf`

## 1) Core Objective Coverage
- Prompt rental collection workflows: tenancy + rental terms panels.
- Net rental accuracy scaffolding: gross, service/admin/SST deduction, net, cumulative fields captured.
- Property maintenance cost inputs: dedicated deductions and refurbishment items.
- Periodic profitability view: Excel-derived Monthly P&L workspace with detail, comparison, and portfolio summary views.

## 2) Property Information (3.1)
- `3.1.1` Property serial number (5 digits): system-assigned by the backend, shown read-only in the Add Property panel.
- `3.1.2` Signed tenancy agreement PDF attachment: metadata capture field provided.
- `3.1.3` Address:
- Unit number: covered.
- Street address: covered.
- District/City/State: covered.
- `3.1.4` Property details:
- Highrise/Landed: select input.
- Freehold/Leasehold: select input.
- SPA price: numeric input.
- Book value: numeric input.
- Indicated market value: numeric input.
- Project name: text input.
- Developer name: text input.
- `3.1.5` Refurbishment/Renovation costs:
- Amount paid, payment date, invoice number, description: covered.
- Depreciation period dropdown `1, 3, 5, 10 years`: covered.
- Up to 10 items per property: guarded in UI logic.
- Attachment metadata for invoices: covered.

## 3) Tenant Information (3.2)
- `3.2.1` Tenant details:
- Name, NRIC/Passport, email, mobile: covered in Add Tenant drawer.
- `3.2.2` Monthly rental:
- Rental deposit, surcharge, gross rental, collection date: covered.
- Service/admin/SST deduction: covered.
- Net rental, net remittance date, cumulative gross/net: covered.
- Late collection flag: explicit checkbox/state.
- `3.2.3` Deductions:
- Maintenance, quit rent, assessment, utilities, fire insurance, sinking fund, miscellaneous, bank cost of funds, depreciation cost: covered in tenancy model and detail tab.
- `3.2.4` Tenancy details:
- Commencement date, key collection, move-in, expiration date, tenure: covered.
- Air Selangor, TNB, TM account details: covered.
- Early closure before schedule: covered with Close Early action.

## 4) Reports
- Statement of Account per tenancy: operational report flow covered.
- Monthly P&L: implemented from `/Users/noorullah/Downloads/Rental Property Profit & Loss.xlsx`.
- Monthly P&L calculations: gross monthly rent less direct expenses equals net rental amount; net rental amount less indirect expenses equals net rental amount receive.
- Monthly P&L views: one-property detail, multi-property comparison, and portfolio summary.
- Periodic Cash Account per tenancy and all tenancies: operational report flow covered.
- Monthly Cash Collection: operational report flow covered.

## 5) Deferred Items
- Full accounting subledger, reconciliation workflow, and period close controls are not implemented.
- Additional Excel references beyond Monthly P&L remain documented in `docs/BUSINESS_RULES.md`.
