import type {
  BootstrapResponse,
  MonthlyExpenseEntryInput,
  MonthlyRentalIncomeInput,
  PropertyInput,
  RentCollectionInput,
  RenovationInput,
  RentalSystemState,
  TenantActivityInput,
  TenantInput,
  TenancyInput,
} from './types'
import type { MonthlyProfitLossPortfolioSummary, MonthlyProfitLossPropertyReport } from './reports'

const API_BASE = '/api'

export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized')
    this.name = 'UnauthorizedError'
  }
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new UnauthorizedError()
    }
    const message = await response.text()
    throw new Error(message || `Request failed: ${response.status}`)
  }

  return (await response.json()) as T
}

export const fetchBootstrap = () => request<BootstrapResponse>('/bootstrap')
export const fetchProperties = () => request<{ properties: RentalSystemState['properties'] }>('/properties')
export const fetchTenants = () => request<{ tenants: RentalSystemState['tenants'] }>('/tenants')
export const fetchTenancies = () => request<{ tenancies: RentalSystemState['tenancies'] }>('/tenancies')

export const createPropertyRecord = (payload: PropertyInput) =>
  request<BootstrapResponse>('/properties', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const createTenantRecord = (payload: TenantInput) =>
  request<BootstrapResponse>('/tenants', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const createTenancyRecord = (payload: TenancyInput) =>
  request<BootstrapResponse>('/tenancies', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const closeTenancyEarlyRecord = (tenancyId: string) =>
  request<BootstrapResponse>(`/tenancies/${tenancyId}/close-early`, {
    method: 'POST',
  })

export const fetchMonthlyProfitLoss = (periodMonth: string, propertyIds: string[]) =>
  request<{
    reports: MonthlyProfitLossPropertyReport[]
    summary: MonthlyProfitLossPortfolioSummary
  }>(
    `/monthly-profit-loss?periodMonth=${encodeURIComponent(periodMonth)}&propertyIds=${encodeURIComponent(propertyIds.join(','))}`,
  )

export const saveMonthlyRentalIncome = (payload: MonthlyRentalIncomeInput) =>
  request<BootstrapResponse>('/monthly-rental-income', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })

export const saveMonthlyExpenseEntry = (payload: MonthlyExpenseEntryInput) =>
  request<BootstrapResponse>('/monthly-expense-entry', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })

export const createRentCollectionRecord = (payload: RentCollectionInput) =>
  request<BootstrapResponse>('/rent-collections', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const createTenantActivityRecord = (payload: TenantActivityInput) =>
  request<BootstrapResponse>('/tenant-activities', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const createRenovationRecord = (payload: RenovationInput) =>
  request<BootstrapResponse>('/renovations', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const updatePropertyRecord = (id: string, payload: PropertyInput) =>
  request<BootstrapResponse>(`/properties/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })

export const deletePropertyRecord = (id: string) =>
  request<BootstrapResponse>(`/properties/${id}`, {
    method: 'DELETE',
  })

export const updateTenantRecord = (id: string, payload: TenantInput) =>
  request<BootstrapResponse>(`/tenants/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })

export const deleteTenantRecord = (id: string) =>
  request<BootstrapResponse>(`/tenants/${id}`, {
    method: 'DELETE',
  })

export const updateTenancyRecord = (id: string, payload: TenancyInput) =>
  request<BootstrapResponse>(`/tenancies/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })

export const deleteTenancyRecord = (id: string) =>
  request<BootstrapResponse>(`/tenancies/${id}`, {
    method: 'DELETE',
  })

export const restoreStarterData = () =>
  request<BootstrapResponse>('/admin/restore-starter-data', {
    method: 'POST',
    body: JSON.stringify({}),
  })

