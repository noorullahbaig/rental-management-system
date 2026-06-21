import assert from 'node:assert/strict'
import {
  getLastTenantActivity,
  getNextTenantAction,
  getOutstandingCollectionAmount,
  getTenancyActionStatus,
} from './selectors.ts'
import type { RentalSystemState } from './types.ts'

const state = {
  properties: [
    {
      id: 'property-1',
      serialNumber: '00001',
      address: { unitNumber: 'A-1-1', streetAddress: 'Property # 1', cityState: 'Kuala Lumpur' },
      kind: 'Highrise',
      ownership: 'Freehold',
      spaPrice: 0,
      bookValue: 0,
      marketValue: 0,
      projectName: 'Property # 1',
      developerName: '',
      renovations: [],
    },
  ],
  tenants: [
    {
      id: 'tenant-1',
      name: 'Tenant 1',
      nricPassport: 'A123',
      email: 'tenant@example.com',
      mobile: '+60 12-345 6789',
    },
  ],
  tenancies: [
    {
      id: 'tenancy-late',
      propertyId: 'property-1',
      tenantId: 'tenant-1',
      commencementDate: '2026-01-01',
      keyCollectionDate: '2026-01-01',
      moveInDate: '2026-01-01',
      expirationDate: '2026-12-31',
      tenure: '12 months',
      airSelangorAccount: '',
      tnbAccount: '',
      tmAccount: '',
      status: 'Late Collection',
      closedEarly: false,
      rentalTerms: {
        rentalDeposit: 3000,
        surcharge: 0,
        monthlyGross: 2000,
        dateOfCollection: '2026-05-01',
        serviceFeeDeduction: 20,
        monthlyNet: 1980,
        dateOfNetRemitted: '',
        cumulativeGross: 0,
        cumulativeNet: 0,
        lateCollectionFlag: true,
      },
      deductions: {
        maintenanceCharges: 0,
        quitRent: 0,
        assessment: 0,
        utilityCharges: 0,
        fireInsurancePremium: 0,
        sinkingFundPayment: 0,
        miscellaneousCharges: 0,
        bankCostOfFunds: 0,
        depreciationCost: 0,
      },
    },
    {
      id: 'tenancy-renewal',
      propertyId: 'property-1',
      tenantId: 'tenant-1',
      commencementDate: '2026-01-01',
      keyCollectionDate: '2026-01-01',
      moveInDate: '2026-01-01',
      expirationDate: '2026-06-20',
      tenure: '6 months',
      airSelangorAccount: '',
      tnbAccount: '',
      tmAccount: '',
      status: 'Active',
      closedEarly: false,
      rentalTerms: {
        rentalDeposit: 3000,
        surcharge: 0,
        monthlyGross: 1500,
        dateOfCollection: '2026-05-01',
        serviceFeeDeduction: 20,
        monthlyNet: 1480,
        dateOfNetRemitted: '',
        cumulativeGross: 0,
        cumulativeNet: 0,
        lateCollectionFlag: false,
      },
      deductions: {
        maintenanceCharges: 0,
        quitRent: 0,
        assessment: 0,
        utilityCharges: 0,
        fireInsurancePremium: 0,
        sinkingFundPayment: 0,
        miscellaneousCharges: 0,
        bankCostOfFunds: 0,
        depreciationCost: 0,
      },
    },
  ],
  rentCollections: [
    {
      id: 'collection-late',
      tenancyId: 'tenancy-late',
      expectedCollectionDate: '2026-05-01',
      actualCollectionDate: '2026-05-14',
      amountCollected: 1200,
      serviceAdminFee: 20,
      sst: 1.6,
      dateRemitted: '',
    },
    {
      id: 'collection-renewal',
      tenancyId: 'tenancy-renewal',
      expectedCollectionDate: '2026-05-01',
      actualCollectionDate: '2026-05-01',
      amountCollected: 1500,
      serviceAdminFee: 20,
      sst: 1.6,
      dateRemitted: '2026-05-02',
    },
  ],
  depositTransactions: [],
  expenseTransactions: [],
  expenseCategories: [],
  monthlyRentalIncomes: [],
  monthlyExpenseEntries: [],
  tenantActivities: [
    { id: 'activity-1', tenancyId: 'tenancy-late', date: '2026-05-10', type: 'Reminder', notes: 'Sent reminder.' },
    { id: 'activity-2', tenancyId: 'tenancy-late', date: '2026-05-15', type: 'Collection', notes: 'Partial payment recorded.' },
  ],
} satisfies RentalSystemState

assert.equal(getOutstandingCollectionAmount(state, state.tenancies[0], '2026-05'), 800)
assert.equal(getTenancyActionStatus(state, state.tenancies[0], '2026-05'), 'Late Collection')
assert.equal(getNextTenantAction(state, state.tenancies[0], '2026-05'), 'Collect balance')
assert.equal(getTenancyActionStatus(state, state.tenancies[1], '2026-05', new Date('2026-06-06T00:00:00')), 'Renewal')
assert.equal(getNextTenantAction(state, state.tenancies[1], '2026-05', new Date('2026-06-06T00:00:00')), 'Prepare renewal')
assert.equal(getLastTenantActivity(state, 'tenancy-late')?.id, 'activity-2')

console.log('Tenant desk selectors derive action states and latest activity correctly.')
