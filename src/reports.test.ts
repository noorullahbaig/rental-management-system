import assert from 'node:assert/strict'
import {
  buildMonthlyProfitLoss,
  buildMonthlyProfitLossComparisonRows,
  calculateMonthlyProfitLossValues,
} from './reports.ts'
import type { RentalSystemState } from './types.ts'

const categories = [
  { id: 'maintenance', name: 'Maintenance Charges', groupType: 'DIRECT' as const },
  { id: 'sinking', name: 'Sinking Fund Charges', groupType: 'DIRECT' as const },
  { id: 'electricity', name: 'Electricity Charges', groupType: 'DIRECT' as const },
  { id: 'water', name: 'Water Charges', groupType: 'DIRECT' as const },
  { id: 'internet', name: 'Internet Charges', groupType: 'DIRECT' as const },
  { id: 'fire', name: 'Fire Insurance Charges', groupType: 'DIRECT' as const },
  { id: 'depreciation', name: 'Others - Depreciation', groupType: 'DIRECT' as const, isNonCash: true },
  { id: 'assessment', name: 'Assessment monthly', groupType: 'INDIRECT' as const },
  { id: 'quit-rent', name: 'Quit Rent monthly', groupType: 'INDIRECT' as const },
  { id: 'bank', name: 'Bank funding costs', groupType: 'INDIRECT' as const },
]

const state = {
  properties: [
    {
      id: 'property-1',
      serialNumber: '00001',
      address: { unitNumber: '# 1', streetAddress: 'Property # 1', cityState: 'Kuala Lumpur' },
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
  tenants: [],
  tenancies: [],
  rentCollections: [],
  depositTransactions: [],
  expenseTransactions: [],
  expenseCategories: categories,
  monthlyRentalIncomes: [
    { id: 'income-1', propertyId: 'property-1', periodMonth: '2026-05', grossRentalAmount: 2000 },
  ],
  monthlyExpenseEntries: [
    { id: 'expense-maintenance', propertyId: 'property-1', periodMonth: '2026-05', expenseCategoryId: 'maintenance', amount: 400 },
    { id: 'expense-sinking', propertyId: 'property-1', periodMonth: '2026-05', expenseCategoryId: 'sinking', amount: 10 },
    { id: 'expense-electricity', propertyId: 'property-1', periodMonth: '2026-05', expenseCategoryId: 'electricity', amount: 200 },
    { id: 'expense-water', propertyId: 'property-1', periodMonth: '2026-05', expenseCategoryId: 'water', amount: 30 },
    { id: 'expense-internet', propertyId: 'property-1', periodMonth: '2026-05', expenseCategoryId: 'internet', amount: 50 },
    { id: 'expense-fire', propertyId: 'property-1', periodMonth: '2026-05', expenseCategoryId: 'fire', amount: 50 },
    { id: 'expense-depreciation', propertyId: 'property-1', periodMonth: '2026-05', expenseCategoryId: 'depreciation', amount: 100 },
    { id: 'expense-assessment', propertyId: 'property-1', periodMonth: '2026-05', expenseCategoryId: 'assessment', amount: 50 },
    { id: 'expense-quit-rent', propertyId: 'property-1', periodMonth: '2026-05', expenseCategoryId: 'quit-rent', amount: 20 },
    { id: 'expense-bank', propertyId: 'property-1', periodMonth: '2026-05', expenseCategoryId: 'bank', amount: 900 },
  ],
  tenantActivities: [],
} satisfies RentalSystemState

const workbookEquivalent = buildMonthlyProfitLoss(state, {
  periodMonth: '2026-05',
  propertyIds: ['property-1'],
})[0]

assert.equal(workbookEquivalent.grossRentalAmount, 2000)
assert.equal(workbookEquivalent.directExpensesTotal, 840)
assert.equal(workbookEquivalent.netRentalAmount, 1160)
assert.equal(workbookEquivalent.indirectExpensesTotal, 970)
assert.equal(workbookEquivalent.netRentalAmountReceive, 190)
assert.equal(workbookEquivalent.directExpenses.find((item) => item.name === 'Others - Depreciation')?.isNonCash, true)

const blankAndNegative = calculateMonthlyProfitLossValues({
  grossRentalAmount: 1000,
  directExpenses: [undefined as unknown as number, -50, 25],
  indirectExpenses: [undefined as unknown as number, -10, 5],
})

assert.equal(blankAndNegative.directExpensesTotal, 25)
assert.equal(blankAndNegative.netRentalAmount, 975)
assert.equal(blankAndNegative.indirectExpensesTotal, 5)
assert.equal(blankAndNegative.netRentalAmountReceive, 970)

const fivePropertyState = {
  ...state,
  properties: [
    ...state.properties,
    {
      ...state.properties[0],
      id: 'property-2',
      serialNumber: '00002',
      address: { ...state.properties[0].address, streetAddress: 'Property # 2' },
    },
    {
      ...state.properties[0],
      id: 'property-3',
      serialNumber: '00003',
      address: { ...state.properties[0].address, streetAddress: 'Property # 3' },
    },
    {
      ...state.properties[0],
      id: 'property-4',
      serialNumber: '00004',
      address: { ...state.properties[0].address, streetAddress: 'Property # 4' },
    },
    {
      ...state.properties[0],
      id: 'property-5',
      serialNumber: '00005',
      address: { ...state.properties[0].address, streetAddress: 'Property # 5' },
    },
  ],
} satisfies RentalSystemState

const fivePropertyReports = buildMonthlyProfitLoss(fivePropertyState, { periodMonth: '2026-05' })
const comparisonRows = buildMonthlyProfitLossComparisonRows(fivePropertyReports)

assert.equal(fivePropertyReports.length, 5)
assert.equal(Object.keys(comparisonRows[0]).length, 6)
assert.equal(Object.keys(comparisonRows[0]).includes('00005 - Property # 5'), true)

console.log('Monthly P&L calculations match the workbook rules and validation checks.')
