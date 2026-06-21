import type { RentalSystemState } from './types'
import { createStarterState } from './starterData'

export const STORAGE_KEY = 'rental-system:v1'

export const createInitialState = (): RentalSystemState => createStarterState()

export const loadState = (): RentalSystemState => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return createInitialState()
    const parsed = JSON.parse(raw) as Partial<RentalSystemState>
    const seeded = createStarterState()
    return {
      ...seeded,
      ...parsed,
      rentCollections: parsed.rentCollections || seeded.rentCollections,
      depositTransactions: parsed.depositTransactions || seeded.depositTransactions,
      expenseTransactions: parsed.expenseTransactions || seeded.expenseTransactions,
      expenseCategories: parsed.expenseCategories || seeded.expenseCategories,
      monthlyRentalIncomes: parsed.monthlyRentalIncomes || seeded.monthlyRentalIncomes,
      monthlyExpenseEntries: parsed.monthlyExpenseEntries || seeded.monthlyExpenseEntries,
      tenantActivities: parsed.tenantActivities || seeded.tenantActivities,
    } as RentalSystemState
  } catch {
    return createInitialState()
  }
}

export const saveState = (state: RentalSystemState) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}
