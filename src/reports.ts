import type {
  DepositTransaction,
  ExpenseCategory,
  MonthlyExpenseEntry,
  RentalSystemState,
  RentCollectionRecord,
  Tenancy,
} from './types'

const MS_PER_DAY = 24 * 60 * 60 * 1000

const num = (value: number | undefined | null) => (Number.isFinite(value) ? Number(value) : 0)
const nonNegative = (value: number | undefined | null) => Math.max(0, num(value))

const toDate = (value?: string) => {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const inRange = (date: string | undefined, from?: string, to?: string) => {
  const d = toDate(date)
  if (!d) return false
  const fromD = toDate(from)
  const toD = toDate(to)
  if (fromD && d < fromD) return false
  if (toD && d > toD) return false
  return true
}

export const calculateGrossAmountDue = (monthlyGross: number, surcharge: number) => num(monthlyGross) + num(surcharge)
export const calculateTotalDeduction = (serviceAdminFee: number, sst: number) => num(serviceAdminFee) + num(sst)
export const calculateNetRental = (grossAmountDue: number, totalDeduction: number) => num(grossAmountDue) - num(totalDeduction)
export const calculateOutstandingAmount = (grossAmountDue: number, amountCollected: number) =>
  num(grossAmountDue) - num(amountCollected)
export const calculateDaysLate = (expectedDate?: string, actualDate?: string, asOfDate?: string) => {
  const expected = toDate(expectedDate)
  if (!expected) return 0
  const actual = toDate(actualDate) || toDate(asOfDate)
  if (!actual) return 0
  return Math.max(0, Math.ceil((actual.getTime() - expected.getTime()) / MS_PER_DAY))
}

export const calculatePaymentStatus = ({
  amountCollected,
  grossAmountDue,
  expectedDate,
  actualDate,
}: {
  amountCollected: number
  grossAmountDue: number
  expectedDate?: string
  actualDate?: string
}) => {
  if (num(amountCollected) <= 0) return 'Unpaid'
  if (num(amountCollected) < num(grossAmountDue)) return 'Partial'
  if (calculateDaysLate(expectedDate, actualDate) > 0) return 'Late'
  return 'Paid'
}

export const calculateAgingBucket = (daysLate: number) => {
  if (daysLate <= 30) return '0-30'
  if (daysLate <= 60) return '31-60'
  if (daysLate <= 90) return '61-90'
  return '>90'
}

export const calculateMonthlyDepreciation = (amountPaid: number, years: number) => {
  if (!years) return 0
  return num(amountPaid) / (years * 12)
}

export const calculateAccumulatedDepreciation = (monthlyDepreciation: number, startDate?: string, asOfDate?: string) => {
  const start = toDate(startDate)
  const asOf = toDate(asOfDate)
  if (!start || !asOf || asOf < start) return 0
  const months = Math.max(
    0,
    (asOf.getFullYear() - start.getFullYear()) * 12 + (asOf.getMonth() - start.getMonth()) + 1,
  )
  return num(monthlyDepreciation) * months
}

export const calculateRemainingUndepreciatedAmount = (amountPaid: number, accumulatedDepreciation: number) =>
  Math.max(0, num(amountPaid) - num(accumulatedDepreciation))

export const calculateDepositBalance = (txs: DepositTransaction[]) =>
  txs.reduce((acc, tx) => {
    if (tx.type === 'Received') return acc + num(tx.amount)
    return acc - num(tx.amount)
  }, 0)

export interface MonthlyProfitLossExpenseLine {
  categoryId: string
  name: string
  groupType: ExpenseCategory['groupType']
  amount: number
  isNonCash?: boolean
}

export interface MonthlyProfitLossPropertyReport {
  propertyId: string
  propertyLabel: string
  periodMonth: string
  grossRentalAmount: number
  directExpenses: MonthlyProfitLossExpenseLine[]
  directExpensesTotal: number
  netRentalAmount: number
  indirectExpenses: MonthlyProfitLossExpenseLine[]
  indirectExpensesTotal: number
  netRentalAmountReceive: number
}

export interface MonthlyProfitLossPortfolioSummary {
  periodMonth: string
  totalGrossRentalAmount: number
  totalDirectExpenses: number
  totalIndirectExpenses: number
  totalNetRentalAmountReceive: number
  bestPerformingProperty: string
  lowestPerformingProperty: string
}

const getPropertyLabel = (state: RentalSystemState, propertyId: string) => {
  const property = state.properties.find((item) => item.id === propertyId)
  if (!property) return propertyId
  return `${property.serialNumber} - ${property.address.streetAddress}`
}

export const calculateMonthlyProfitLossValues = ({
  grossRentalAmount,
  directExpenses,
  indirectExpenses,
}: {
  grossRentalAmount: number
  directExpenses: number[]
  indirectExpenses: number[]
}) => {
  const directExpensesTotal = directExpenses.reduce((acc, value) => acc + nonNegative(value), 0)
  const netRentalAmount = nonNegative(grossRentalAmount) - directExpensesTotal
  const indirectExpensesTotal = indirectExpenses.reduce((acc, value) => acc + nonNegative(value), 0)
  const netRentalAmountReceive = netRentalAmount - indirectExpensesTotal
  return {
    grossRentalAmount: nonNegative(grossRentalAmount),
    directExpensesTotal,
    netRentalAmount,
    indirectExpensesTotal,
    netRentalAmountReceive,
  }
}

const getMonthlyIncome = (state: RentalSystemState, propertyId: string, periodMonth: string) =>
  state.monthlyRentalIncomes.find((item) => item.propertyId === propertyId && item.periodMonth === periodMonth)

const getMonthlyExpenseAmount = (
  entries: MonthlyExpenseEntry[],
  propertyId: string,
  periodMonth: string,
  expenseCategoryId: string,
) =>
  nonNegative(
    entries.find(
      (item) =>
        item.propertyId === propertyId &&
        item.periodMonth === periodMonth &&
        item.expenseCategoryId === expenseCategoryId,
    )?.amount,
  )

export const buildMonthlyProfitLoss = (
  state: RentalSystemState,
  filters: { periodMonth: string; propertyIds?: string[] },
): MonthlyProfitLossPropertyReport[] => {
  const selectedPropertyIds = filters.propertyIds?.length
    ? filters.propertyIds
    : state.properties.map((property) => property.id)
  return selectedPropertyIds.map((propertyId) => {
    const directExpenses = state.expenseCategories
      .filter((category) => category.groupType === 'DIRECT')
      .map((category) => ({
        categoryId: category.id,
        name: category.name,
        groupType: category.groupType,
        isNonCash: category.isNonCash,
        amount: getMonthlyExpenseAmount(state.monthlyExpenseEntries, propertyId, filters.periodMonth, category.id),
      }))
    const indirectExpenses = state.expenseCategories
      .filter((category) => category.groupType === 'INDIRECT')
      .map((category) => ({
        categoryId: category.id,
        name: category.name,
        groupType: category.groupType,
        isNonCash: category.isNonCash,
        amount: getMonthlyExpenseAmount(state.monthlyExpenseEntries, propertyId, filters.periodMonth, category.id),
      }))
    const calculated = calculateMonthlyProfitLossValues({
      grossRentalAmount: getMonthlyIncome(state, propertyId, filters.periodMonth)?.grossRentalAmount || 0,
      directExpenses: directExpenses.map((item) => item.amount),
      indirectExpenses: indirectExpenses.map((item) => item.amount),
    })
    return {
      propertyId,
      propertyLabel: getPropertyLabel(state, propertyId),
      periodMonth: filters.periodMonth,
      grossRentalAmount: calculated.grossRentalAmount,
      directExpenses,
      directExpensesTotal: calculated.directExpensesTotal,
      netRentalAmount: calculated.netRentalAmount,
      indirectExpenses,
      indirectExpensesTotal: calculated.indirectExpensesTotal,
      netRentalAmountReceive: calculated.netRentalAmountReceive,
    }
  })
}

export const buildMonthlyProfitLossComparisonRows = (
  reports: MonthlyProfitLossPropertyReport[],
): Record<string, string | number>[] => {
  const rows: Record<string, string | number>[] = []
  const pushRow = (lineItem: string, values: number[]) => {
    rows.push(
      reports.reduce<Record<string, string | number>>(
        (acc, report, index) => {
          acc[report.propertyLabel] = values[index] || 0
          return acc
        },
        { lineItem },
      ),
    )
  }
  pushRow(
    'Gross Rental Amount monthly',
    reports.map((report) => report.grossRentalAmount),
  )
  const directNames = reports[0]?.directExpenses.map((item) => item.name) || []
  directNames.forEach((name) => {
    pushRow(
      name,
      reports.map((report) => report.directExpenses.find((item) => item.name === name)?.amount || 0),
    )
  })
  pushRow(
    'Subtotal of Direct Expenses',
    reports.map((report) => report.directExpensesTotal),
  )
  pushRow(
    'Net Rental Amount',
    reports.map((report) => report.netRentalAmount),
  )
  const indirectNames = reports[0]?.indirectExpenses.map((item) => item.name) || []
  indirectNames.forEach((name) => {
    pushRow(
      name,
      reports.map((report) => report.indirectExpenses.find((item) => item.name === name)?.amount || 0),
    )
  })
  pushRow(
    'Subtotal of Indirect Expenses',
    reports.map((report) => report.indirectExpensesTotal),
  )
  pushRow(
    'Net Rental Amount Receive',
    reports.map((report) => report.netRentalAmountReceive),
  )
  return rows
}

export const buildMonthlyProfitLossDetailRows = (
  report: MonthlyProfitLossPropertyReport | undefined,
): Record<string, string | number>[] => {
  if (!report) return []
  return [
    { section: 'Rental Income', lineItem: 'Gross Rental Amount monthly', amount: report.grossRentalAmount },
    ...report.directExpenses.map((item) => ({
      section: 'Direct Expenses',
      lineItem: item.name,
      amount: item.amount,
    })),
    { section: 'Direct Expenses', lineItem: 'Subtotal of Direct Expenses', amount: report.directExpensesTotal },
    { section: 'Calculated', lineItem: 'Net Rental Amount', amount: report.netRentalAmount },
    ...report.indirectExpenses.map((item) => ({
      section: 'Indirect Expenses',
      lineItem: item.name,
      amount: item.amount,
    })),
    { section: 'Indirect Expenses', lineItem: 'Subtotal of Indirect Expenses', amount: report.indirectExpensesTotal },
    { section: 'Calculated', lineItem: 'Net Rental Amount Receive', amount: report.netRentalAmountReceive },
  ]
}

export const buildMonthlyProfitLossPortfolioSummary = (
  reports: MonthlyProfitLossPropertyReport[],
): MonthlyProfitLossPortfolioSummary => {
  const best = reports.reduce<MonthlyProfitLossPropertyReport | undefined>(
    (current, report) => (!current || report.netRentalAmountReceive > current.netRentalAmountReceive ? report : current),
    undefined,
  )
  const lowest = reports.reduce<MonthlyProfitLossPropertyReport | undefined>(
    (current, report) => (!current || report.netRentalAmountReceive < current.netRentalAmountReceive ? report : current),
    undefined,
  )
  return {
    periodMonth: reports[0]?.periodMonth || '',
    totalGrossRentalAmount: reports.reduce((acc, report) => acc + report.grossRentalAmount, 0),
    totalDirectExpenses: reports.reduce((acc, report) => acc + report.directExpensesTotal, 0),
    totalIndirectExpenses: reports.reduce((acc, report) => acc + report.indirectExpensesTotal, 0),
    totalNetRentalAmountReceive: reports.reduce((acc, report) => acc + report.netRentalAmountReceive, 0),
    bestPerformingProperty: best?.propertyLabel || '-',
    lowestPerformingProperty: lowest?.propertyLabel || '-',
  }
}

const getCollectionForTenancy = (
  collections: RentCollectionRecord[],
  tenancyId: string,
  from?: string,
  to?: string,
  month?: string,
) => {
  return collections.filter((c) => {
    if (c.tenancyId !== tenancyId) return false
    if (month) return c.expectedCollectionDate.startsWith(month)
    return inRange(c.expectedCollectionDate, from, to)
  })
}

export interface StatementRow {
  tenancyId: string
  propertySerial: string
  propertyAddress: string
  tenantName: string
  tenancyStartDate: string
  tenancyExpiryDate: string
  monthlyGrossRental: number
  surcharge: number
  expectedCollectionDate: string
  actualCollectionDate: string
  amountCollected: number
  serviceAdminFee: number
  sst: number
  netRentalRemitted: number
  dateRemitted: string
  outstandingAmount: number
  daysLate: number
  status: string
  runningBalance: number
}

export const buildStatementOfAccount = (
  state: RentalSystemState,
  filters: { propertyId?: string; tenantId?: string; tenancyId?: string; from?: string; to?: string; status?: string },
) => {
  const rows: StatementRow[] = []
  let runningBalance = 0
  state.tenancies.forEach((tenancy) => {
    if (filters.propertyId && tenancy.propertyId !== filters.propertyId) return
    if (filters.tenantId && tenancy.tenantId !== filters.tenantId) return
    if (filters.tenancyId && tenancy.id !== filters.tenancyId) return
    const property = state.properties.find((p) => p.id === tenancy.propertyId)
    const tenant = state.tenants.find((t) => t.id === tenancy.tenantId)
    if (!property || !tenant) return
    const selected = getCollectionForTenancy(state.rentCollections, tenancy.id, filters.from, filters.to)
    const baseRows = selected.length
      ? selected
      : [
          {
            id: `derived-${tenancy.id}`,
            tenancyId: tenancy.id,
            expectedCollectionDate: tenancy.rentalTerms.dateOfCollection,
            amountCollected: 0,
            serviceAdminFee: tenancy.rentalTerms.serviceFeeDeduction,
            sst: tenancy.rentalTerms.serviceFeeDeduction * 0.08,
          } as RentCollectionRecord,
        ]
    baseRows.forEach((collection) => {
      const grossAmountDue = calculateGrossAmountDue(tenancy.rentalTerms.monthlyGross, tenancy.rentalTerms.surcharge)
      const deductions = calculateTotalDeduction(collection.serviceAdminFee, collection.sst)
      const netRentalRemitted = calculateNetRental(grossAmountDue, deductions)
      const outstanding = calculateOutstandingAmount(grossAmountDue, collection.amountCollected)
      runningBalance += grossAmountDue - num(collection.amountCollected)
      const status = calculatePaymentStatus({
        amountCollected: collection.amountCollected,
        grossAmountDue,
        expectedDate: collection.expectedCollectionDate,
        actualDate: collection.actualCollectionDate,
      })
      if (filters.status && status !== filters.status) return
      rows.push({
        tenancyId: tenancy.id,
        propertySerial: property.serialNumber,
        propertyAddress: `${property.address.streetAddress}, ${property.address.cityState}`,
        tenantName: tenant.name,
        tenancyStartDate: tenancy.commencementDate,
        tenancyExpiryDate: tenancy.expirationDate,
        monthlyGrossRental: tenancy.rentalTerms.monthlyGross,
        surcharge: tenancy.rentalTerms.surcharge,
        expectedCollectionDate: collection.expectedCollectionDate,
        actualCollectionDate: collection.actualCollectionDate || '',
        amountCollected: collection.amountCollected,
        serviceAdminFee: collection.serviceAdminFee,
        sst: collection.sst,
        netRentalRemitted,
        dateRemitted: collection.dateRemitted || '',
        outstandingAmount: outstanding,
        daysLate: calculateDaysLate(collection.expectedCollectionDate, collection.actualCollectionDate),
        status,
        runningBalance,
      })
    })
  })
  return rows
}

export const buildProfitLoss = (
  tenancies: Tenancy[],
  filters: { propertyId?: string; tenantId?: string; tenancyId?: string },
) => {
  const scoped = tenancies.filter((tenancy) => {
    if (filters.propertyId && tenancy.propertyId !== filters.propertyId) return false
    if (filters.tenantId && tenancy.tenantId !== filters.tenantId) return false
    if (filters.tenancyId && tenancy.id !== filters.tenancyId) return false
    return true
  })
  const result = scoped.reduce(
    (acc, tenancy) => {
      const grossRentalIncome = calculateGrossAmountDue(tenancy.rentalTerms.monthlyGross, tenancy.rentalTerms.surcharge)
      const serviceAdminFee = tenancy.rentalTerms.serviceFeeDeduction
      const sst = serviceAdminFee * 0.08
      const netRentalIncome = grossRentalIncome - serviceAdminFee - sst
      const expenses =
        num(tenancy.deductions.maintenanceCharges) +
        num(tenancy.deductions.quitRent) +
        num(tenancy.deductions.assessment) +
        num(tenancy.deductions.utilityCharges) +
        num(tenancy.deductions.fireInsurancePremium) +
        num(tenancy.deductions.sinkingFundPayment) +
        num(tenancy.deductions.miscellaneousCharges) +
        num(tenancy.deductions.bankCostOfFunds) +
        num(tenancy.deductions.depreciationCost)
      acc.grossRentalIncome += tenancy.rentalTerms.monthlyGross
      acc.surchargeIncome += tenancy.rentalTerms.surcharge
      acc.serviceAdminFee += serviceAdminFee
      acc.sst += sst
      acc.netRentalIncome += netRentalIncome
      acc.maintenanceCharges += tenancy.deductions.maintenanceCharges
      acc.quitRent += tenancy.deductions.quitRent
      acc.assessment += tenancy.deductions.assessment
      acc.utilityCharges += tenancy.deductions.utilityCharges
      acc.fireInsurancePremium += tenancy.deductions.fireInsurancePremium
      acc.sinkingFundPayment += tenancy.deductions.sinkingFundPayment
      acc.miscellaneousCharges += tenancy.deductions.miscellaneousCharges
      acc.costOfFunds += tenancy.deductions.bankCostOfFunds
      acc.depreciation += tenancy.deductions.depreciationCost
      acc.totalExpenses += expenses
      return acc
    },
    {
      grossRentalIncome: 0,
      surchargeIncome: 0,
      serviceAdminFee: 0,
      sst: 0,
      netRentalIncome: 0,
      maintenanceCharges: 0,
      quitRent: 0,
      assessment: 0,
      utilityCharges: 0,
      fireInsurancePremium: 0,
      sinkingFundPayment: 0,
      miscellaneousCharges: 0,
      costOfFunds: 0,
      depreciation: 0,
      totalExpenses: 0,
    },
  )
  return { ...result, profitLoss: result.netRentalIncome - result.totalExpenses }
}

export const buildCashAccount = (
  state: RentalSystemState,
  filters: { propertyId?: string; tenancyId?: string; from?: string; to?: string; month?: string },
) => {
  const tx = state.rentCollections.filter((item) => {
    const tenancy = state.tenancies.find((t) => t.id === item.tenancyId)
    if (!tenancy) return false
    if (filters.propertyId && tenancy.propertyId !== filters.propertyId) return false
    if (filters.tenancyId && item.tenancyId !== filters.tenancyId) return false
    if (filters.month) return item.expectedCollectionDate.startsWith(filters.month)
    return inRange(item.expectedCollectionDate, filters.from, filters.to)
  })
  const deposits = state.depositTransactions.filter((item) => {
    const tenancy = state.tenancies.find((t) => t.id === item.tenancyId)
    if (!tenancy) return false
    if (filters.propertyId && tenancy.propertyId !== filters.propertyId) return false
    if (filters.tenancyId && item.tenancyId !== filters.tenancyId) return false
    if (filters.month) return item.date.startsWith(filters.month)
    return inRange(item.date, filters.from, filters.to)
  })
  const expenseTx = state.expenseTransactions.filter((item) => {
    if (filters.propertyId && item.propertyId !== filters.propertyId) return false
    if (filters.tenancyId && item.tenancyId !== filters.tenancyId) return false
    if (filters.month) return item.datePaid.startsWith(filters.month)
    return inRange(item.datePaid, filters.from, filters.to)
  })

  const rentalCollected = tx.reduce((acc, item) => acc + num(item.amountCollected), 0)
  const surchargeCollected = state.tenancies
    .filter((tenancy) => tx.some((c) => c.tenancyId === tenancy.id))
    .reduce((acc, tenancy) => acc + num(tenancy.rentalTerms.surcharge), 0)
  const depositCollected = deposits
    .filter((item) => item.type === 'Received')
    .reduce((acc, item) => acc + num(item.amount), 0)

  const serviceAdminFee = tx.reduce((acc, item) => acc + num(item.serviceAdminFee), 0)
  const sst = tx.reduce((acc, item) => acc + num(item.sst), 0)
  const expenseOutflows = expenseTx.reduce((acc, item) => acc + num(item.amount), 0)
  const netRentalRemitted = tx.reduce(
    (acc, item) => acc + (num(item.amountCollected) - num(item.serviceAdminFee) - num(item.sst)),
    0,
  )

  const totalCashInflow = rentalCollected + surchargeCollected + depositCollected
  const totalCashOutflow = serviceAdminFee + sst + expenseOutflows + netRentalRemitted
  const netCashMovement = totalCashInflow - totalCashOutflow
  const openingCashBalance = 0
  const closingCashBalance = openingCashBalance + netCashMovement

  return {
    openingCashBalance,
    rentalCollected,
    surchargeCollected,
    depositCollected,
    serviceAdminFee,
    sst,
    expenseOutflows,
    netRentalRemitted,
    totalCashInflow,
    totalCashOutflow,
    netCashMovement,
    closingCashBalance,
    transactionCount: tx.length + deposits.length + expenseTx.length,
  }
}

export const rowsToCsv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const escape = (value: unknown) => {
    const text = String(value ?? '')
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replaceAll('"', '""')}"`
    }
    return text
  }
  const lines = [headers.join(',')]
  rows.forEach((row) => {
    lines.push(headers.map((header) => escape(row[header])).join(','))
  })
  return lines.join('\n')
}

export const triggerCsvDownload = (fileName: string, rows: Record<string, unknown>[]) => {
  const csv = rowsToCsv(rows)
  if (!csv) return
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export const triggerPdfPrint = (title: string, rows: Record<string, unknown>[]) => {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const tableHead = headers.map((header) => `<th>${header}</th>`).join('')
  const tableRows = rows
    .map((row) => {
      const cols = headers.map((header) => `<td>${String(row[header] ?? '-')}</td>`).join('')
      return `<tr>${cols}</tr>`
    })
    .join('')
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>
  body { font-family: Arial, sans-serif; padding: 16px; }
  h1 { font-size: 16px; margin: 0 0 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #d1d5db; padding: 6px; text-align: left; }
  th { background: #f8fafc; }
  </style></head><body><h1>${title}</h1><table><thead><tr>${tableHead}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`
  const win = window.open('', '_blank', 'noopener,noreferrer')
  if (!win) return
  win.document.open()
  win.document.write(html)
  win.document.close()
  win.focus()
  win.print()
}

export const buildPropertyTimeSeries = (
  state: RentalSystemState,
  propertyId: string,
  fromMonth: string,
  toMonth: string,
) => {
  const startYear = parseInt(fromMonth.slice(0, 4), 10)
  const startMonth = parseInt(fromMonth.slice(5, 7), 10)
  const endYear = parseInt(toMonth.slice(0, 4), 10)
  const endMonth = parseInt(toMonth.slice(5, 7), 10)

  const months: string[] = []
  let currentYear = startYear
  let currentMonth = startMonth

  while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
    const monthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`
    months.push(monthStr)
    currentMonth++
    if (currentMonth > 12) {
      currentMonth = 1
      currentYear++
    }
  }

  return months.map((month) => {
    const directExpenses = state.expenseCategories
      .filter((category) => category.groupType === 'DIRECT')
      .map((category) => ({
        categoryId: category.id,
        amount: getMonthlyExpenseAmount(state.monthlyExpenseEntries, propertyId, month, category.id),
      }))

    const indirectExpenses = state.expenseCategories
      .filter((category) => category.groupType === 'INDIRECT')
      .map((category) => ({
        categoryId: category.id,
        amount: getMonthlyExpenseAmount(state.monthlyExpenseEntries, propertyId, month, category.id),
      }))

    const grossRental = getMonthlyIncome(state, propertyId, month)?.grossRentalAmount || 0
    const calculated = calculateMonthlyProfitLossValues({
      grossRentalAmount: grossRental,
      directExpenses: directExpenses.map((item) => item.amount),
      indirectExpenses: indirectExpenses.map((item) => item.amount),
    })

    const result: Record<string, string | number> = {
      month,
      grossRental: calculated.grossRentalAmount,
      directExpensesTotal: calculated.directExpensesTotal,
      indirectExpensesTotal: calculated.indirectExpensesTotal,
      netRentalAmount: calculated.netRentalAmount,
      netRentalAmountReceive: calculated.netRentalAmountReceive,
    }

    state.expenseCategories.forEach((cat) => {
      result[cat.id] = getMonthlyExpenseAmount(state.monthlyExpenseEntries, propertyId, month, cat.id)
    })

    return result
  })
}

export const buildPortfolioRanking = (
  state: RentalSystemState,
  periodMonth: string,
) => {
  const reports = buildMonthlyProfitLoss(state, { periodMonth })
  return reports
    .map((report) => ({
      propertyId: report.propertyId,
      propertyLabel: report.propertyLabel,
      grossRental: report.grossRentalAmount,
      directExpensesTotal: report.directExpensesTotal,
      indirectExpensesTotal: report.indirectExpensesTotal,
      netRentalAmountReceive: report.netRentalAmountReceive,
    }))
    .sort((a, b) => b.netRentalAmountReceive - a.netRentalAmountReceive)
}

