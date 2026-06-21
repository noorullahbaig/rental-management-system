import type { Property, RentCollectionRecord, RentalSystemState, Tenancy, Tenant } from './types'

const MS_PER_DAY = 24 * 60 * 60 * 1000

export const getTenantForTenancy = (state: RentalSystemState, tenancy: Tenancy): Tenant | undefined =>
  state.tenants.find((tenant) => tenant.id === tenancy.tenantId)

export const getPropertyForTenancy = (state: RentalSystemState, tenancy: Tenancy): Property | undefined =>
  state.properties.find((property) => property.id === tenancy.propertyId)

export const getExpiringWithinDays = (tenancy: Tenancy, days: number, now = new Date()): boolean => {
  const expiry = new Date(`${tenancy.expirationDate}T00:00:00`)
  if (Number.isNaN(expiry.getTime())) return false
  const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / MS_PER_DAY)
  return daysUntilExpiry >= 0 && daysUntilExpiry <= days
}

export const getTenancyDisplayStatus = (tenancy: Tenancy, now = new Date()): 'Late' | 'Closed' | 'Expiring' | 'Paid' => {
  if (tenancy.closedEarly || tenancy.status === 'Closed Early') return 'Closed'
  if (tenancy.rentalTerms.lateCollectionFlag || tenancy.status === 'Late Collection') return 'Late'
  if (tenancy.status === 'Expiring' || getExpiringWithinDays(tenancy, 30, now)) return 'Expiring'
  return 'Paid'
}

const getCollectionForMonth = (collections: RentCollectionRecord[], tenancyId: string, periodMonth: string) =>
  collections.find((collection) => collection.tenancyId === tenancyId && collection.expectedCollectionDate.startsWith(periodMonth))

export const getOutstandingCollectionAmount = (
  state: RentalSystemState,
  tenancy: Tenancy,
  periodMonth: string,
) => {
  const collection = getCollectionForMonth(state.rentCollections, tenancy.id, periodMonth)
  const expected = tenancy.rentalTerms.monthlyGross + tenancy.rentalTerms.surcharge
  return Math.max(0, expected - (collection?.amountCollected || 0))
}

export const getTenantLedgerSnapshot = (state: RentalSystemState, tenancy: Tenancy, periodMonth: string) => {
  const collection = getCollectionForMonth(state.rentCollections, tenancy.id, periodMonth)
  const expected = tenancy.rentalTerms.monthlyGross + tenancy.rentalTerms.surcharge
  const amountCollected = collection?.amountCollected || 0
  const outstandingAmount = Math.max(0, expected - amountCollected)
  const expectedDate = collection?.expectedCollectionDate || tenancy.rentalTerms.dateOfCollection
  const actualDate = collection?.actualCollectionDate || ''
  const daysLate = actualDate
    ? Math.max(
        0,
        Math.ceil(
          (new Date(`${actualDate}T00:00:00`).getTime() - new Date(`${expectedDate}T00:00:00`).getTime()) / MS_PER_DAY,
        ),
      )
    : 0
  return {
    expectedAmount: expected,
    amountCollected,
    outstandingAmount,
    expectedDate,
    actualDate,
    daysLate,
    remittedDate: collection?.dateRemitted || tenancy.rentalTerms.dateOfNetRemitted || '',
  }
}

export const getTenancyActionStatus = (
  state: RentalSystemState,
  tenancy: Tenancy,
  periodMonth: string,
  now = new Date(),
): 'Needs Action' | 'Late Collection' | 'Renewal' | 'Closed' | 'Current' => {
  if (tenancy.closedEarly || tenancy.status === 'Closed Early') return 'Closed'
  const outstanding = getOutstandingCollectionAmount(state, tenancy, periodMonth)
  if (tenancy.rentalTerms.lateCollectionFlag || tenancy.status === 'Late Collection' || outstanding > 0) {
    return 'Late Collection'
  }
  if (tenancy.status === 'Expiring' || getExpiringWithinDays(tenancy, 90, now)) return 'Renewal'
  return 'Current'
}

export const getNextTenantAction = (
  state: RentalSystemState,
  tenancy: Tenancy,
  periodMonth: string,
  now = new Date(),
) => {
  const status = getTenancyActionStatus(state, tenancy, periodMonth, now)
  if (status === 'Late Collection') return 'Collect balance'
  if (status === 'Renewal') return 'Prepare renewal'
  if (status === 'Closed') return 'Closed'
  return 'Monitor'
}

export const getLastTenantActivity = (state: RentalSystemState, tenancyId: string) => {
  const activities = state.tenantActivities
    .filter((activity) => activity.tenancyId === tenancyId)
    .sort((a, b) => b.date.localeCompare(a.date))
  return activities[0]
}
