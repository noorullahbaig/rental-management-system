# Rental Management System - Comprehensive User Guide

## 1. System Overview
The Rental Management System is a specialized, end-to-end platform designed for property owners and portfolio managers. It enforces structured data entry for tracking real estate assets, tenant relationships, lease agreements, and daily financial operations. The system eliminates reliance on external spreadsheets and raw files by offering automated accounting (P&L, ledgers) and automated depreciation scheduling.

## 2. Managing Properties
**Purpose:** Maintain a single source of truth for all physical real estate assets, their financial valuations, and capital expenditures (Renovations).

*   **Add/Edit Properties:** Navigate to the Properties tab. Register units by specifying the Type (Highrise/Landed), Ownership (Freehold/Leasehold), and financial markers including SPA Price, Book Value, and Market Value.
*   **Renovations & Depreciation:** Within a property profile, log capital expenditures. Enter the invoice details, the amount paid, and assign a depreciation period (1, 3, 5, or 10 years). The system will automatically amortize this cost across future P&L statements.

## 3. Managing Tenants
**Purpose:** Maintain a structured, centralized database of occupant identity and emergency contact information.

*   **Add/Edit Tenants:** Navigate to the Tenants tab. Input the tenant's legal name, NRIC/Passport identifier, email, and mobile number.
*   **Emergency Contacts:** Record vital operational data by adding the Emergency Contact Name and Emergency Contact Number directly to the tenant's profile.
*   **Tenant Inspector:** Click on any tenant to view their active leases, historical activities, and directly jump to their Statement of Account.

## 4. Managing Tenancies (Leases)
**Purpose:** Define the binding financial and operational parameters between a Property and a Tenant.

*   **Create/Edit Tenancy:** Navigate to Tenancies. Link an active Property to a registered Tenant.
*   **Rental Terms & Deductions:** Define the Monthly Gross Rent, Rental Deposit, Surcharges, and Service Fees. Additionally, log recurring property expenses (e.g., Maintenance, Quit Rent, Assessment, Cost of Funds) which are deducted automatically to calculate Net Remitted amounts.
*   **Critical Dates:** Enforce operational tracking by inputting Commencement, Key Collection, Move-In, and Expiration dates.
*   **Operational Clauses:** Input the Agent Commission Amount paid for securing the lease, and document any Special Clauses to ensure compliance without needing to reference external raw PDF files.
*   **Early Termination:** Execute the "Close Early" function to immediately terminate an active lease prior to its expiration date, logging a termination activity and halting future automated rent expectations.

## 5. Financial Operations & Ledger
**Purpose:** Log daily financial transactions to feed the automated accounting engine.

*   **Rent Collections:** Record actual rent payments. Input the collected amount, Service/Admin fees, SST, and the actual date the net rent was remitted to the owner account.
*   **Deposit Transactions:** Manage the full lifecycle of security deposits. Record deposits as Received (inflow), Refunded (outflow), Applied (used to offset arrears), or Forfeited (converted to income).
*   **Expense Transactions:** Log ad-hoc property expenses (Utility bills, Fire Insurance, Maintenance repairs) to ensure accurate portfolio profitability.

## 6. The Reports Page & Analytics
**Purpose:** The Reports page is the financial engine of the system. It aggregates all structured data into professional, exportable financial statements. 

**Available Actions on the Reports Page:**
1.  **Filter by Period:** Set the "As Of" date or select a specific "Period Month" to dynamically filter the financial data.
2.  **Filter by Property:** Scope the reports to the entire portfolio or drill down into a single property's performance.
3.  **Export Data:** Every report can be instantly exported to CSV for spreadsheet analysis or to PDF for sharing with stakeholders.
4.  **Bulk Export:** Use the "Export All to CSV" function to generate a complete backup of all reports simultaneously.

**Available Reports:**
*   **Statement of Account:** Generates a comprehensive ledger of all charges, payments, and balances for a specific tenancy.
*   **Profit & Loss (P&L):** Calculates gross revenue, subtracts all direct/indirect expenses, and deducts amortized depreciation to yield the true net profit for the portfolio.
*   **Cash Account:** Tracks the actual bank/cash position based on real inflows and outflows.
*   **Monthly Cash Collection:** Contrasts actual cash inflows against expected monthly rent, highlighting collection efficiency.
*   **Arrears / Late Collection Aging:** Identifies overdue rent and ages the debt to prioritize collections.
*   **Rent Roll & Tenancy Status:** Provides a macro snapshot of all active/expiring leases and total monthly rental yields.
*   **Deposit Register:** Reconciles all held security deposits to ensure liabilities are fully funded.
*   **Expense & Depreciation Schedule:** Displays the amortization table for all renovation costs over their selected depreciation periods.
