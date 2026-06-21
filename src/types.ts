export type PropertyKind = 'Highrise' | 'Landed'
export type OwnershipKind = 'Freehold' | 'Leasehold'
export type DepreciationPeriod = 1 | 3 | 5 | 10

export interface DocumentAttachment {
  id: string
  label: string
  fileName: string
  uploadedAt: string
  notes?: string
}

export interface RenovationItem {
  id: string
  amountPaid: number
  paymentDate: string
  invoiceNumber: string
  description: string
  depreciationPeriod: DepreciationPeriod
  attachmentName?: string
}

export interface PropertyAddress {
  unitNumber: string
  streetAddress: string
  cityState: string
}

export interface Property {
  id: string
  serialNumber: string
  address: PropertyAddress
  unitLabel?: string
  kind: PropertyKind
  ownership: OwnershipKind
  spaPrice: number
  bookValue: number
  marketValue: number
  projectName: string
  developerName: string
  renovations: RenovationItem[]
}

export interface Tenant {
  id: string
  name: string
  nricPassport: string
  email: string
  mobile: string
  emergencyContactName?: string
  emergencyContactNumber?: string
}

export interface RentalTerms {
  rentalDeposit: number
  surcharge: number
  monthlyGross: number
  dateOfCollection: string
  serviceFeeDeduction: number
  monthlyNet: number
  dateOfNetRemitted: string
  cumulativeGross: number
  cumulativeNet: number
  lateCollectionFlag: boolean
}

export interface DeductionSet {
  maintenanceCharges: number
  quitRent: number
  assessment: number
  utilityCharges: number
  fireInsurancePremium: number
  sinkingFundPayment: number
  miscellaneousCharges: number
  bankCostOfFunds: number
  depreciationCost: number
}

export interface Tenancy {
  id: string
  propertyId: string
  tenantId: string
  rentalTerms: RentalTerms
  deductions: DeductionSet
  commencementDate: string
  keyCollectionDate: string
  moveInDate: string
  expirationDate: string
  tenure: string
  airSelangorAccount: string
  tnbAccount: string
  tmAccount: string
  status: 'Active' | 'Expiring' | 'Late Collection' | 'Closed Early' | 'Expired'
  closedEarly: boolean
  agentCommissionAmount?: number
  specialClauses?: string
}

export type ReportType =
  | 'Statement of Account'
  | 'Profit & Loss'
  | 'Cash Account'
  | 'Monthly Cash Collection'
  | 'Arrears / Late Collection Aging'
  | 'Rent Roll & Tenancy Status'
  | 'Deposit Register'
  | 'Expense & Depreciation Schedule'
  | 'Monthly P&L'

export interface RentCollectionRecord {
  id: string
  tenancyId: string
  expectedCollectionDate: string
  actualCollectionDate?: string
  amountCollected: number
  serviceAdminFee: number
  sst: number
  dateRemitted?: string
  expectedAmount?: number
  notes?: string
}

export type DepositTransactionType = 'Received' | 'Refunded' | 'Applied' | 'Forfeited'

export interface DepositTransaction {
  id: string
  tenancyId: string
  date: string
  type: DepositTransactionType
  amount: number
  notes?: string
}

export interface ExpenseTransaction {
  id: string
  tenancyId?: string
  propertyId: string
  datePaid: string
  expenseType:
    | 'Maintenance'
    | 'Quit Rent'
    | 'Assessment'
    | 'Utility'
    | 'Fire Insurance'
    | 'Sinking Fund'
    | 'Miscellaneous'
    | 'Cost of Funds'
    | 'Renovation'
  amount: number
  invoiceNumber?: string
  description?: string
}

export type ExpenseGroupType = 'DIRECT' | 'INDIRECT'

export interface ExpenseCategory {
  id: string
  name: string
  groupType: ExpenseGroupType
  isNonCash?: boolean
  sortOrder?: number
}

export interface MonthlyRentalIncome {
  id: string
  propertyId: string
  periodMonth: string
  grossRentalAmount: number
}

export interface MonthlyExpenseEntry {
  id: string
  propertyId: string
  periodMonth: string
  expenseCategoryId: string
  amount: number
  notes?: string
}

export type TenantActivityType = 'Collection' | 'Reminder' | 'Renewal' | 'Note' | 'Termination'

export interface TenantActivity {
  id: string
  tenancyId: string
  date: string
  type: TenantActivityType
  notes: string
}

export interface RentalSystemState {
  properties: Property[]
  tenants: Tenant[]
  tenancies: Tenancy[]
  rentCollections: RentCollectionRecord[]
  depositTransactions: DepositTransaction[]
  expenseTransactions: ExpenseTransaction[]
  expenseCategories: ExpenseCategory[]
  monthlyRentalIncomes: MonthlyRentalIncome[]
  monthlyExpenseEntries: MonthlyExpenseEntry[]
  tenantActivities: TenantActivity[]
}

export interface BootstrapResponse {
  state: RentalSystemState
}

export interface PropertyInput {
  serialNumber?: string
  address: PropertyAddress
  kind: PropertyKind
  ownership: OwnershipKind
  spaPrice: number
  bookValue: number
  marketValue: number
  projectName: string
  developerName: string
}

export interface TenantInput {
  name: string
  nricPassport: string
  email: string
  mobile: string
  emergencyContactName?: string
  emergencyContactNumber?: string
}

export interface TenancyInput {
  propertyId: string
  tenantId: string
  rentalTerms: RentalTerms
  deductions: DeductionSet
  commencementDate: string
  keyCollectionDate: string
  moveInDate: string
  expirationDate: string
  tenure: string
  airSelangorAccount: string
  tnbAccount: string
  tmAccount: string
  status: Tenancy['status']
  closedEarly: boolean
  agentCommissionAmount?: number
  specialClauses?: string
}

export interface MonthlyRentalIncomeInput {
  propertyId: string
  periodMonth: string
  grossRentalAmount: number
}

export interface MonthlyExpenseEntryInput {
  propertyId: string
  periodMonth: string
  expenseCategoryId: string
  amount: number
}

export interface RentCollectionInput {
  tenancyId: string
  expectedCollectionDate: string
  actualCollectionDate?: string
  amountCollected: number
  serviceAdminFee: number
  sst: number
  dateRemitted?: string
  expectedAmount?: number
  notes?: string
}

export interface TenantActivityInput {
  tenancyId: string
  date: string
  type: TenantActivityType
  notes: string
}

export interface RenovationInput {
  propertyId: string
  amountPaid: number
  paymentDate: string
  invoiceNumber: string
  description: string
  depreciationPeriod: DepreciationPeriod
  attachmentName?: string
}
