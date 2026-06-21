import { z } from 'zod'

export const loginSchema = z.object({
  password: z.string().min(1, 'Password is required'),
})

export const propertyAddressSchema = z.object({
  unitNumber: z.string().min(1, 'Unit number is required'),
  streetAddress: z.string().min(1, 'Street address is required'),
  cityState: z.string().min(1, 'City/State is required'),
})

export const propertyInputSchema = z.object({
  serialNumber: z.string().optional(),
  address: propertyAddressSchema,
  kind: z.enum(['Highrise', 'Landed']),
  ownership: z.enum(['Freehold', 'Leasehold']),
  spaPrice: z.number().min(0, 'SPA Price must be >= 0'),
  bookValue: z.number().min(0, 'Book Value must be >= 0'),
  marketValue: z.number().min(0, 'Market Value must be >= 0'),
  projectName: z.string().min(1, 'Project name is required'),
  developerName: z.string().min(1, 'Developer name is required'),
})

export const tenantInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  nricPassport: z.string().min(1, 'NRIC/Passport is required'),
  email: z.string().email('Invalid email address').or(z.literal('')),
  mobile: z.string().min(1, 'Mobile number is required'),
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactNumber: z.string().optional().nullable(),
})

export const rentalTermsSchema = z.object({
  rentalDeposit: z.number().min(0),
  surcharge: z.number().min(0),
  monthlyGross: z.number().min(0),
  dateOfCollection: z.string().min(1, 'Collection date is required'),
  serviceFeeDeduction: z.number().min(0),
  monthlyNet: z.number().min(0),
  dateOfNetRemitted: z.string().or(z.literal('')),
  cumulativeGross: z.number().min(0),
  cumulativeNet: z.number().min(0),
  lateCollectionFlag: z.boolean(),
})

export const deductionSetSchema = z.object({
  maintenanceCharges: z.number().min(0),
  quitRent: z.number().min(0),
  assessment: z.number().min(0),
  utilityCharges: z.number().min(0),
  fireInsurancePremium: z.number().min(0),
  sinkingFundPayment: z.number().min(0),
  miscellaneousCharges: z.number().min(0),
  bankCostOfFunds: z.number().min(0),
  depreciationCost: z.number().min(0),
})

export const tenancyInputSchema = z.object({
  propertyId: z.string().min(1, 'Property selection is required'),
  tenantId: z.string().min(1, 'Tenant selection is required'),
  rentalTerms: rentalTermsSchema,
  deductions: deductionSetSchema,
  commencementDate: z.string().min(1, 'Commencement date is required'),
  keyCollectionDate: z.string().min(1, 'Key collection date is required'),
  moveInDate: z.string().min(1, 'Move-in date is required'),
  expirationDate: z.string().min(1, 'Expiration date is required'),
  tenure: z.string().min(1, 'Tenure is required'),
  airSelangorAccount: z.string().or(z.literal('')),
  tnbAccount: z.string().or(z.literal('')),
  tmAccount: z.string().or(z.literal('')),
  status: z.enum(['Active', 'Expiring', 'Late Collection', 'Closed Early', 'Expired']),
  closedEarly: z.boolean(),
  agentCommissionAmount: z.number().optional().nullable(),
  specialClauses: z.string().optional().nullable(),
})

export const monthlyRentalIncomeInputSchema = z.object({
  propertyId: z.string().min(1),
  periodMonth: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid period month format (YYYY-MM)'),
  grossRentalAmount: z.number().min(0),
})

export const monthlyExpenseEntryInputSchema = z.object({
  propertyId: z.string().min(1),
  periodMonth: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid period month format (YYYY-MM)'),
  expenseCategoryId: z.string().min(1),
  amount: z.number().min(0),
})

export const rentCollectionInputSchema = z.object({
  tenancyId: z.string().min(1),
  expectedCollectionDate: z.string().min(1),
  actualCollectionDate: z.string().optional().nullable(),
  amountCollected: z.number().min(0),
  serviceAdminFee: z.number().min(0),
  sst: z.number().min(0),
  dateRemitted: z.string().optional().nullable(),
  expectedAmount: z.number().optional().nullable(),
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
  amountPaid: z.number().min(0),
  paymentDate: z.string().min(1),
  invoiceNumber: z.string().min(1),
  description: z.string().min(1),
  depreciationPeriod: z.union([z.literal(1), z.literal(3), z.literal(5), z.literal(10)]),
  attachmentName: z.string().optional().nullable(),
})
