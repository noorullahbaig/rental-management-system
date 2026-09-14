import { z } from 'zod'

const num = (name: string) => z.number({ invalid_type_error: `${name} must be a valid number, characters are not allowed` })

export const loginSchema = z.object({
  email: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
})

export const userInputSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['ADMIN', 'EMPLOYEE', 'TENANT']),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING']).optional(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  tenantId: z.string().optional(), // For linking to existing tenant
})

export const userUpdateSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  username: z.string().min(3).optional(),
  role: z.enum(['ADMIN', 'EMPLOYEE', 'TENANT']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING']).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
})

export const maintenanceRequestSchema = z.object({
  tenancyId: z.string().min(1),
  category: z.enum(['PLUMBING', 'ELECTRICAL', 'AC', 'APPLIANCES', 'OTHER']),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY']),
})

export const maintenanceUpdateSchema = z.object({
  status: z.enum(['SUBMITTED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  assignedTo: z.string().optional().nullable(),
  estimatedCost: num('Estimated Cost').optional().nullable(),
  actualCost: num('Actual Cost').optional().nullable(),
})

export const maintenanceCommentSchema = z.object({
  comment: z.string().min(1, 'Comment is required'),
})

export const paymentReceiptSchema = z.object({
  tenancyId: z.string().min(1),
  paymentDate: z.string().min(1),
  amount: num('Amount').min(0),
  paymentMethod: z.enum(['BANK_TRANSFER', 'CASH', 'CHEQUE', 'ONLINE']),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
  fileName: z.string().min(1),
})

export const paymentVerificationSchema = z.object({
  verificationStatus: z.enum(['VERIFIED', 'REJECTED']),
  rejectionReason: z.string().optional(),
})

export const utilityBillSchema = z.object({
  tenancyId: z.string().min(1),
  billType: z.enum(['ELECTRICITY', 'WATER', 'GAS', 'INTERNET']),
  billMonth: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid month format (YYYY-MM)'),
  amount: num('Amount').min(0),
  dueDate: z.string().min(1),
  fileName: z.string().min(1),
  notes: z.string().optional(),
})

export const propertyAddressSchema = z.object({
  unitNumber: z.string().optional().or(z.literal('')),
  streetAddress: z.string().min(1, 'Street address is required'),
  cityState: z.string().min(1, 'City/State is required'),
})

export const propertyInputSchema = z.object({
  serialNumber: z.string().optional(),
  address: propertyAddressSchema,
  kind: z.enum(['Highrise', 'Landed']),
  ownership: z.enum(['Freehold', 'Leasehold']),
  spaPrice: num('SPA Price').min(0, 'SPA Price must be >= 0'),
  bookValue: num('Book Value').min(0, 'Book Value must be >= 0'),
  marketValue: num('Market Value').min(0, 'Market Value must be >= 0'),
  projectName: z.string().optional().or(z.literal('')),
  developerName: z.string().optional().or(z.literal('')),
  numberOfRooms: num('Number of Rooms').optional(),
  carParks: num('Car Parks').optional(),
  squareFeet: num('Square Feet').optional(),
  otherAppliances: z.string().optional().or(z.literal('')),
  ceilingFans: num('Ceiling Fans').optional(),
})

export const tenantInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  nricPassport: z.string().optional().or(z.literal('')),
  email: z.string().email('Invalid email address').or(z.literal('')).optional(),
  mobile: z.string().optional().or(z.literal('')),
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactNumber: z.string().optional().nullable(),
})

export const rentalTermsSchema = z.object({
  rentalDeposit: num('Rental Deposit').min(0),
  surcharge: num('Surcharge').min(0),
  monthlyGross: num('Monthly Gross').min(0),
  dateOfCollection: z.string().min(1, 'Collection date is required'),
  serviceFeeDeduction: num('Service Fee Deduction').min(0),
  monthlyNet: num('Monthly Net').min(0),
  dateOfNetRemitted: z.string().or(z.literal('')),
  cumulativeGross: num('Cumulative Gross').min(0),
  cumulativeNet: num('Cumulative Net').min(0),
  lateCollectionFlag: z.boolean(),
})

export const deductionSetSchema = z.object({
  maintenanceCharges: num('Maintenance Charges').min(0),
  quitRent: num('Quit Rent').min(0),
  assessment: num('Assessment').min(0),
  utilityCharges: num('Utility Charges').min(0),
  fireInsurancePremium: num('Fire Insurance Premium').min(0),
  sinkingFundPayment: num('Sinking Fund Payment').min(0),
  miscellaneousCharges: num('Miscellaneous Charges').min(0),
  bankCostOfFunds: num('Bank Cost of Funds').min(0),
  depreciationCost: num('Depreciation Cost').min(0),
})

export const tenancyInputSchema = z.object({
  propertyId: z.string().min(1, 'Property selection is required'),
  tenantId: z.string().min(1, 'Tenant selection is required'),
  rentalTerms: rentalTermsSchema,
  deductions: deductionSetSchema,
  commencementDate: z.string().optional().or(z.literal('')),
  keyCollectionDate: z.string().optional().or(z.literal('')),
  moveInDate: z.string().optional().or(z.literal('')),
  expirationDate: z.string().optional().or(z.literal('')),
  tenure: z.string().optional().or(z.literal('')),
  airSelangorAccount: z.string().or(z.literal('')),
  tnbAccount: z.string().or(z.literal('')),
  tmAccount: z.string().or(z.literal('')),
  status: z.enum(['Active', 'Expiring', 'Late Collection', 'Closed Early', 'Expired']),
  closedEarly: z.boolean(),
  agentCommissionAmount: num('Agent Commission').optional().nullable(),
  specialClauses: z.string().optional().nullable(),
  signedAgreementUrl: z.string().optional().or(z.literal('')),
  moveInPicturesUrl: z.string().optional().or(z.literal('')),
  moveOutPicturesUrl: z.string().optional().or(z.literal('')),
})

export const monthlyRentalIncomeInputSchema = z.object({
  propertyId: z.string().min(1),
  periodMonth: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid period month format (YYYY-MM)'),
  grossRentalAmount: num('Gross Rental Amount').min(0),
})

export const monthlyExpenseEntryInputSchema = z.object({
  propertyId: z.string().min(1),
  periodMonth: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid period month format (YYYY-MM)'),
  expenseCategoryId: z.string().min(1),
  amount: num('Expense Amount').min(0),
})

export const rentCollectionInputSchema = z.object({
  tenancyId: z.string().min(1),
  expectedCollectionDate: z.string().min(1),
  actualCollectionDate: z.string().optional().nullable(),
  amountCollected: num('Amount Collected').min(0),
  serviceAdminFee: num('Service Admin Fee').min(0),
  sst: num('SST').min(0),
  dateRemitted: z.string().optional().nullable(),
  expectedAmount: num('Expected Amount').optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const tenantActivityInputSchema = z.object({
  tenancyId: z.string().min(1),
  date: z.string().min(1),
  type: z.enum(['Collection', 'Reminder', 'Renewal', 'Note', 'Termination']),
  notes: z.string().min(1),
})

export const renovationInputSchema = z.object({
  propertyId: z.string().min(1),
  amountPaid: num('Amount Paid').min(0),
  paymentDate: z.string().min(1),
  invoiceNumber: z.string().min(1),
  description: z.string().min(1),
  depreciationPeriod: z.union([z.literal(1), z.literal(3), z.literal(5), z.literal(10)]),
  attachmentName: z.string().optional().nullable(),
})
