import { useEffect, useMemo, useState, type ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Select from '@radix-ui/react-select'
import * as Tabs from '@radix-ui/react-tabs'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  AlertTriangle,
  BadgeDollarSign,
  Bell,
  Building2,
  CalendarClock,
  Check,
  ChevronDown,
  FileText,
  Menu,
  Plus,
  Search,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import {
  createPropertyRecord,
  createRentCollectionRecord,
  createRenovationRecord,
  createTenantActivityRecord,
  createTenantRecord,
  createTenancyRecord,
  closeTenancyEarlyRecord,
  fetchBootstrap,
  saveMonthlyExpenseEntry,
  saveMonthlyRentalIncome,
  UnauthorizedError,
} from './api'
import { Login } from './components/Login'
import {
  getExpiringWithinDays,
  getLastTenantActivity,
  getNextTenantAction,
  getPropertyForTenancy,
  getTenancyActionStatus,
  getTenancyDisplayStatus,
  getTenantLedgerSnapshot,
  getTenantForTenancy,
} from './selectors'
import {
  buildMonthlyProfitLoss,
  buildMonthlyProfitLossComparisonRows,
  buildMonthlyProfitLossDetailRows,
  buildMonthlyProfitLossPortfolioSummary,
  calculateMonthlyProfitLossValues,
  buildCashAccount,
  buildStatementOfAccount,
  calculateAccumulatedDepreciation,
  calculateAgingBucket,
  calculateDaysLate,
  calculateDepositBalance,
  calculateMonthlyDepreciation,
  calculateRemainingUndepreciatedAmount,
  triggerCsvDownload,
  triggerPdfPrint,
  buildPropertyTimeSeries,
} from './reports'

import type {
  DeductionSet,
  DepositTransaction,
  DepreciationPeriod,
  Property,
  PropertyKind,
  RentalSystemState,
  RentalTerms,
  TenantActivityType,
  Tenancy,
} from './types'

type Section = 'overview' | 'properties' | 'tenants' | 'reports'
type TenancyStatus = Tenancy['status']
type TenantDeskQueue = 'Needs action' | 'Late collection' | 'Renewals' | 'All tenancies'

interface PropertyDraft {
  address: Property['address']
  kind: PropertyKind
  ownership: Property['ownership']
  spaPrice: number
  bookValue: number
  marketValue: number
  projectName: string
  developerName: string
  agreementFileName: string
}

interface TenantDraft {
  name: string
  nricPassport: string
  email: string
  mobile: string
}

interface RenovationDraft {
  amountPaid: number
  paymentDate: string
  invoiceNumber: string
  description: string
  depreciationPeriod: DepreciationPeriod
  attachmentName: string
}

interface TenancyDraft {
  tenantId: string
  commencementDate: string
  keyCollectionDate: string
  moveInDate: string
  expirationDate: string
  tenure: string
  airSelangorAccount: string
  tnbAccount: string
  tmAccount: string
  rentalTerms: RentalTerms
  deductions: DeductionSet
}

type ReportKey =
  | 'Statement of Account'
  | 'Monthly P&L'
  | 'Cash Account'
  | 'Monthly Cash Collection'
  | 'Arrears / Late Collection Aging'
  | 'Rent Roll & Tenancy Status'
  | 'Deposit Register'
  | 'Expense & Depreciation Schedule'
type ReportTab = 'analytics' | 'portfolio' | 'library'



const getPreceding12Months = (endMonth: string): string[] => {
  const year = parseInt(endMonth.slice(0, 4), 10)
  const month = parseInt(endMonth.slice(5, 7), 10)
  const list: string[] = []
  for (let i = 11; i >= 0; i--) {
    let y = year
    let m = month - i
    while (m <= 0) {
      m += 12
      y -= 1
    }
    list.push(`${y}-${String(m).padStart(2, '0')}`)
  }
  return list
}


const navItems: { id: Section; label: string; icon: typeof Building2 }[] = [
  { id: 'overview', label: 'Overview', icon: Wallet },
  { id: 'properties', label: 'Properties', icon: Building2 },
  { id: 'tenants', label: 'Tenants', icon: Users },
  { id: 'reports', label: 'Reports', icon: FileText },
]

const emptyDeductions = (): DeductionSet => ({
  maintenanceCharges: 0,
  quitRent: 0,
  assessment: 0,
  utilityCharges: 0,
  fireInsurancePremium: 0,
  sinkingFundPayment: 0,
  miscellaneousCharges: 0,
  bankCostOfFunds: 0,
  depreciationCost: 0,
})

const emptyRentalTerms = (): RentalTerms => ({
  rentalDeposit: 0,
  surcharge: 0,
  monthlyGross: 0,
  dateOfCollection: '',
  serviceFeeDeduction: 0,
  monthlyNet: 0,
  dateOfNetRemitted: '',
  cumulativeGross: 0,
  cumulativeNet: 0,
  lateCollectionFlag: false,
})

const emptyPropertyDraft = (): PropertyDraft => ({
  address: { unitNumber: '', streetAddress: '', cityState: '' },
  kind: 'Highrise',
  ownership: 'Freehold',
  spaPrice: 0,
  bookValue: 0,
  marketValue: 0,
  projectName: '',
  developerName: '',
  agreementFileName: '',
})

const emptyTenantDraft = (): TenantDraft => ({
  name: '',
  nricPassport: '',
  email: '',
  mobile: '',
})

const emptyRenovationDraft = (): RenovationDraft => ({
  amountPaid: 0,
  paymentDate: '',
  invoiceNumber: '',
  description: '',
  depreciationPeriod: 1,
  attachmentName: '',
})

const emptyTenancyDraft = (): TenancyDraft => ({
  tenantId: '',
  commencementDate: '',
  keyCollectionDate: '',
  moveInDate: '',
  expirationDate: '',
  tenure: '',
  airSelangorAccount: '',
  tnbAccount: '',
  tmAccount: '',
  rentalTerms: emptyRentalTerms(),
  deductions: emptyDeductions(),
})

const createEmptyState = (): RentalSystemState => ({
  properties: [],
  tenants: [],
  tenancies: [],
  rentCollections: [],
  depositTransactions: [],
  expenseTransactions: [],
  expenseCategories: [],
  monthlyRentalIncomes: [],
  monthlyExpenseEntries: [],
  tenantActivities: [],
})

const currency = (value: number) =>
  new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    maximumFractionDigits: 2,
  }).format(value || 0)

const sanitizeMoney = (value: number) => Math.max(0, Number.isFinite(value) ? value : 0)
const EMPTY_SELECT_VALUE = '__empty__'

const getNextPropertySerialNumber = (properties: Property[]) => {
  const highest = properties.reduce((acc, property) => {
    const parsed = Number.parseInt(property.serialNumber, 10)
    return Number.isFinite(parsed) && parsed > acc ? parsed : acc
  }, 0)
  return String(highest + 1).padStart(5, '0')
}

const deriveTenancyStatus = (draft: TenancyDraft): TenancyStatus => {
  if (draft.rentalTerms.lateCollectionFlag) return 'Late Collection'
  return 'Active'
}

function Drawer({
  title,
  subtitle,
  open,
  onOpenChange,
  footer,
  children,
  widthClassName = 'max-w-2xl',
}: {
  title: string
  subtitle?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  footer?: ReactNode
  children: ReactNode
  widthClassName?: string
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm" />
        <Dialog.Content
          className={`fixed inset-0 z-50 flex w-full flex-col overflow-hidden bg-white shadow-2xl focus:outline-none sm:inset-y-5 sm:right-5 sm:left-auto sm:w-[min(100vw-2.5rem,48rem)] sm:rounded-[28px] sm:border sm:border-slate-200/80 ${widthClassName}`}
        >
          <div className="border-b border-slate-200/80 bg-gradient-to-b from-white via-white to-slate-50 px-5 py-5 sm:px-7">
            <div className="flex items-start justify-between gap-4">
              <div className="max-w-[80%]">
                <Dialog.Title className="text-xl font-semibold tracking-tight text-slate-950">{title}</Dialog.Title>
                {subtitle && <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>}
              </div>
              <Dialog.Close className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:bg-slate-100 hover:text-slate-800">
                <X size={18} />
              </Dialog.Close>
            </div>
          </div>
          <div className="flex-1 overflow-auto px-5 py-5 sm:px-7">{children}</div>
          {footer && (
            <div className="sticky bottom-0 border-t border-slate-200/80 bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function App() {
  const reduceMotion = useReducedMotion()
  const [isAuthenticated, setIsAuthenticated] = useState(true)
  const [state, setState] = useState<RentalSystemState>(() => createEmptyState())
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [bootstrapError, setBootstrapError] = useState('')
  const [query, setQuery] = useState('')
  const [section, setSection] = useState<Section>('overview')
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null)
  const [selectedTenancyId, setSelectedTenancyId] = useState<string | null>(null)
  const [tenantDeskQueue, setTenantDeskQueue] = useState<TenantDeskQueue>('Needs action')
  const [tenantDeskMonth, setTenantDeskMonth] = useState('2026-05')
  const [tenantActivityType, setTenantActivityType] = useState<TenantActivityType>('Reminder')
  const [tenantActivityNotes, setTenantActivityNotes] = useState('')
  const [collectionAmountInput, setCollectionAmountInput] = useState('')
  const [collectionDateInput, setCollectionDateInput] = useState('2026-05-01')
  const [showMobileNav, setShowMobileNav] = useState(false)
  const [propertyDrawer, setPropertyDrawer] = useState(false)
  const [tenantDrawer, setTenantDrawer] = useState(false)
  const [tenancyDrawer, setTenancyDrawer] = useState(false)
  const [renovationDrawer, setRenovationDrawer] = useState(false)
  const [propertyCreateSaving, setPropertyCreateSaving] = useState(false)
  const [tenantCreateSaving, setTenantCreateSaving] = useState(false)
  const [tenancyCreateSaving, setTenancyCreateSaving] = useState(false)
  const [renovationCreateSaving, setRenovationCreateSaving] = useState(false)
  const [propertyCreateError, setPropertyCreateError] = useState('')
  const [tenantCreateError, setTenantCreateError] = useState('')
  const [tenancyCreateError, setTenancyCreateError] = useState('')
  const [renovationCreateError, setRenovationCreateError] = useState('')
  const [reportViewerOpen, setReportViewerOpen] = useState(false)
  const [activeReport, setActiveReport] = useState<ReportKey>('Statement of Account')
  const [reportPropertyId, setReportPropertyId] = useState('')
  const [reportTenantId, setReportTenantId] = useState('')
  const [reportTenancyId, setReportTenancyId] = useState('')
  const [reportFrom, setReportFrom] = useState('')
  const [reportTo, setReportTo] = useState('')
  const [reportMonth, setReportMonth] = useState('')
  const [reportStatus, setReportStatus] = useState('')
  const [reportPropertyType, setReportPropertyType] = useState('')
  const [reportTenancyStatus, setReportTenancyStatus] = useState('')
  const [reportAgingBucket, setReportAgingBucket] = useState('')
  const [reportAsOfDate, setReportAsOfDate] = useState('')
  const [includePaidAccounts, setIncludePaidAccounts] = useState(false)
  const [reportFiltersExpanded, setReportFiltersExpanded] = useState(false)
  const [reportTab, setReportTab] = useState<ReportTab>('analytics')
  const [analyticsPropertyId, setAnalyticsPropertyId] = useState('')
  const [analyticsView, setAnalyticsView] = useState<'overview' | 'ledger' | 'editor'>('overview')
  const [analyticsEndMonth, setAnalyticsEndMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [activeEditMonth, setActiveEditMonth] = useState<string | null>(null)
  const [editorDraft, setEditorDraft] = useState<Record<string, number>>({})
  const [editorSavedBadge, setEditorSavedBadge] = useState(false)
  const [libraryView, setLibraryView] = useState<'cards' | 'runner'>('cards')
  const [monthlyProfitLossPeriod, setMonthlyProfitLossPeriod] = useState(() => new Date().toISOString().slice(0, 7))
  const [portfolioViewMode, setPortfolioViewMode] = useState<'single' | 'ttm'>('single')


  const [propertyDraft, setPropertyDraft] = useState<PropertyDraft>(() => emptyPropertyDraft())
  const [tenantDraft, setTenantDraft] = useState<TenantDraft>(() => emptyTenantDraft())
  const [renovationDraft, setRenovationDraft] = useState<RenovationDraft>(() => emptyRenovationDraft())
  const [tenancyDraft, setTenancyDraft] = useState<TenancyDraft>(() => emptyTenancyDraft())

  useEffect(() => {
    let cancelled = false

    const bootstrap = async () => {
      try {
        const response = await fetchBootstrap()
        if (cancelled) return
        setState(response.state)
        setSelectedPropertyId(response.state.properties[0]?.id || null)
        setSelectedTenancyId(response.state.tenancies[0]?.id || null)
        setBootstrapError('')
        setIsAuthenticated(true)
      } catch (error) {
        if (cancelled) return
        if (error instanceof UnauthorizedError) {
          setIsAuthenticated(false)
        } else {
          setBootstrapError(error instanceof Error ? error.message : 'Unable to load rental operations data.')
        }
      } finally {
        if (!cancelled) setIsBootstrapping(false)
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated])

  const filteredProperties = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return state.properties
    return state.properties.filter((property) =>
      [
        property.serialNumber,
        property.address.unitNumber,
        property.address.streetAddress,
        property.address.cityState,
        property.projectName,
        property.developerName,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }, [query, state.properties])

  const selectedProperty = state.properties.find((property) => property.id === selectedPropertyId) || null
  const selectedTenancy = state.tenancies.find((tenancy) => tenancy.id === selectedTenancyId) || state.tenancies[0] || null
  const effectiveSelectedTenancyId = selectedTenancy?.id || null
  const nextPropertySerial = useMemo(() => getNextPropertySerialNumber(state.properties), [state.properties])
  const selectedPropertyTenancies = state.tenancies.filter((tenancy) => tenancy.propertyId === selectedPropertyId)
  const lateCount = state.tenancies.filter((tenancy) => tenancy.rentalTerms.lateCollectionFlag).length
  const expiringCount = state.tenancies.filter((tenancy) => getExpiringWithinDays(tenancy, 30)).length
  const totalGross = state.tenancies.reduce((acc, tenancy) => acc + tenancy.rentalTerms.cumulativeGross, 0)
  const totalNet = state.tenancies.reduce((acc, tenancy) => acc + tenancy.rentalTerms.cumulativeNet, 0)
  const activeTenancies = state.tenancies.filter((tenancy) => !tenancy.closedEarly && tenancy.status !== 'Expired')
  const needsActionCount = state.tenancies.filter((tenancy) => {
    const actionStatus = getTenancyActionStatus(state, tenancy, tenantDeskMonth)
    return actionStatus === 'Late Collection' || actionStatus === 'Renewal'
  }).length

  const tenantDeskTenancies = useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.tenancies.filter((tenancy) => {
      const tenant = getTenantForTenancy(state, tenancy)
      const property = getPropertyForTenancy(state, tenancy)
      const actionStatus = getTenancyActionStatus(state, tenancy, tenantDeskMonth)
      const matchesQueue =
        tenantDeskQueue === 'All tenancies' ||
        (tenantDeskQueue === 'Needs action' &&
          (actionStatus === 'Late Collection' || actionStatus === 'Renewal')) ||
        (tenantDeskQueue === 'Late collection' && actionStatus === 'Late Collection') ||
        (tenantDeskQueue === 'Renewals' && actionStatus === 'Renewal')
      const matchesQuery =
        !q ||
        [
          tenant?.name,
          tenant?.email,
          tenant?.mobile,
          property?.serialNumber,
          property?.projectName,
          property?.address.unitNumber,
          property?.address.streetAddress,
          property?.address.cityState,
        ]
          .join(' ')
          .toLowerCase()
          .includes(q)
      return matchesQueue && matchesQuery
    })
  }, [query, state, tenantDeskMonth, tenantDeskQueue])

  const reportPropertyOptions = state.properties.map((property) => ({
    label: `${property.serialNumber} - ${property.address.streetAddress}`,
    value: property.id,
  }))

  const reportTenantOptions = state.tenants.map((tenant) => ({
    label: tenant.name,
    value: tenant.id,
  }))

  const reportTenancyOptions = state.tenancies
    .filter((tenancy) => (!reportPropertyId ? true : tenancy.propertyId === reportPropertyId))
    .filter((tenancy) => (!reportTenantId ? true : tenancy.tenantId === reportTenantId))
    .map((tenancy) => {
      const tenant = state.tenants.find((item) => item.id === tenancy.tenantId)
      return {
        label: `${tenant?.name || 'Unknown'} (${tenancy.id.slice(0, 6)})`,
        value: tenancy.id,
      }
    })

  const selectedMonthlyProfitLossPropertyIds = useMemo(
    () => state.properties.map((property) => property.id),
    [state.properties],
  )

  const monthlyProfitLossReports = useMemo(
    () =>
      buildMonthlyProfitLoss(state, {
        periodMonth: monthlyProfitLossPeriod,
        propertyIds: selectedMonthlyProfitLossPropertyIds,
      }),
    [monthlyProfitLossPeriod, selectedMonthlyProfitLossPropertyIds, state],
  )

  const monthlyProfitLossDetailRows = useMemo(
    () => buildMonthlyProfitLossDetailRows(monthlyProfitLossReports[0]),
    [monthlyProfitLossReports],
  )



  const monthlyProfitLossReportRows = monthlyProfitLossDetailRows


  const applyServerState = (
    nextState: RentalSystemState,
    options?: { selectedPropertyId?: string | null; selectedTenancyId?: string | null },
  ) => {
    setState(nextState)
    setSelectedPropertyId((current) => {
      if (options?.selectedPropertyId !== undefined) return options.selectedPropertyId
      if (current && nextState.properties.some((property) => property.id === current)) return current
      return nextState.properties[0]?.id || null
    })
    setSelectedTenancyId((current) => {
      if (options?.selectedTenancyId !== undefined) return options.selectedTenancyId
      if (current && nextState.tenancies.some((tenancy) => tenancy.id === current)) return current
      return nextState.tenancies[0]?.id || null
    })
  }

  const createProperty = async () => {
    if (!propertyDraft.address.streetAddress) {
      setPropertyCreateError('Street address is required.')
      return
    }
    setPropertyCreateError('')
    setPropertyCreateSaving(true)
    try {
      const response = await createPropertyRecord({
        address: propertyDraft.address,
        kind: propertyDraft.kind,
        ownership: propertyDraft.ownership,
        spaPrice: Number(propertyDraft.spaPrice || 0),
        bookValue: Number(propertyDraft.bookValue || 0),
        marketValue: Number(propertyDraft.marketValue || 0),
        projectName: propertyDraft.projectName,
        developerName: propertyDraft.developerName,
        agreementFileName: propertyDraft.agreementFileName || undefined,
      })
      const createdProperty = response.state.properties.reduce<Property | null>((current, property) => {
        if (!current) return property
        return property.serialNumber > current.serialNumber ? property : current
      }, null)
      applyServerState(response.state, { selectedPropertyId: createdProperty?.id || null })
      setPropertyDraft(emptyPropertyDraft())
      setPropertyDrawer(false)
    } catch (error) {
      setPropertyCreateError(error instanceof Error ? error.message : 'Unable to save property.')
    } finally {
      setPropertyCreateSaving(false)
    }
  }

  const createTenant = async () => {
    if (!tenantDraft.name || !tenantDraft.nricPassport) {
      setTenantCreateError('Name and NRIC / passport number are required.')
      return
    }
    setTenantCreateError('')
    setTenantCreateSaving(true)
    try {
      const response = await createTenantRecord({
        name: tenantDraft.name,
        nricPassport: tenantDraft.nricPassport,
        email: tenantDraft.email,
        mobile: tenantDraft.mobile,
      })
      applyServerState(response.state)
      setTenantDraft(emptyTenantDraft())
      setTenantDrawer(false)
    } catch (error) {
      setTenantCreateError(error instanceof Error ? error.message : 'Unable to save tenant.')
    } finally {
      setTenantCreateSaving(false)
    }
  }

  const createTenancy = async () => {
    if (!selectedPropertyId || !tenancyDraft.tenantId || !tenancyDraft.expirationDate) {
      setTenancyCreateError('Select a tenant and set an expiration date before saving.')
      return
    }
    setTenancyCreateError('')
    setTenancyCreateSaving(true)
    try {
      const response = await createTenancyRecord({
        propertyId: selectedPropertyId,
        tenantId: tenancyDraft.tenantId,
        commencementDate: tenancyDraft.commencementDate,
        keyCollectionDate: tenancyDraft.keyCollectionDate,
        moveInDate: tenancyDraft.moveInDate,
        expirationDate: tenancyDraft.expirationDate,
        tenure: tenancyDraft.tenure,
        airSelangorAccount: tenancyDraft.airSelangorAccount,
        tnbAccount: tenancyDraft.tnbAccount,
        tmAccount: tenancyDraft.tmAccount,
        closedEarly: false,
        status: deriveTenancyStatus(tenancyDraft),
        rentalTerms: tenancyDraft.rentalTerms,
        deductions: tenancyDraft.deductions,
      })
      const createdTenancy = response.state.tenancies.find(
        (tenancy) =>
          tenancy.propertyId === selectedPropertyId &&
          tenancy.tenantId === tenancyDraft.tenantId &&
          tenancy.expirationDate === tenancyDraft.expirationDate,
      )
      applyServerState(response.state, { selectedTenancyId: createdTenancy?.id || null })
      setTenancyDraft(emptyTenancyDraft())
      setTenancyDrawer(false)
    } catch (error) {
      setTenancyCreateError(error instanceof Error ? error.message : 'Unable to save tenancy.')
    } finally {
      setTenancyCreateSaving(false)
    }
  }

  const createRenovationItem = async () => {
    if (!selectedPropertyId || !renovationDraft.description) {
      setRenovationCreateError('Description is required.')
      return
    }
    const selectedProperty = state.properties.find((property) => property.id === selectedPropertyId)
    if (selectedProperty && selectedProperty.renovations.length >= 10) {
      setRenovationCreateError('This property already has the maximum of 10 renovation items.')
      return
    }
    setRenovationCreateError('')
    setRenovationCreateSaving(true)
    try {
      const response = await createRenovationRecord({
        propertyId: selectedPropertyId,
        amountPaid: Number(renovationDraft.amountPaid || 0),
        paymentDate: renovationDraft.paymentDate,
        invoiceNumber: renovationDraft.invoiceNumber,
        description: renovationDraft.description,
        depreciationPeriod: renovationDraft.depreciationPeriod,
        attachmentName: renovationDraft.attachmentName || undefined,
      })
      applyServerState(response.state, { selectedPropertyId })
      setRenovationDraft(emptyRenovationDraft())
      setRenovationDrawer(false)
    } catch (error) {
      setRenovationCreateError(error instanceof Error ? error.message : 'Unable to save renovation item.')
    } finally {
      setRenovationCreateSaving(false)
    }
  }

  const closeTenancyEarly = async (tenancyId: string) => {
    if (!window.confirm("Are you sure you want to close this tenancy early? This action is irreversible.")) return
    const response = await closeTenancyEarlyRecord(tenancyId)
    applyServerState(response.state, { selectedTenancyId: tenancyId })
    alert("Tenancy has been closed early successfully.")
  }

  const appendTenantActivity = async (tenancyId: string, type: TenantActivityType, notes: string) => {
    const trimmed = notes.trim()
    if (!trimmed) return
    const response = await createTenantActivityRecord({
      tenancyId,
      date: new Date().toISOString().slice(0, 10),
      type,
      notes: trimmed,
    })
    applyServerState(response.state, { selectedTenancyId: tenancyId })
    setTenantActivityNotes('')
    alert(`Successfully logged ${type} activity notes.`)
  }

  const recordCollection = async (tenancy: Tenancy | null) => {
    if (!tenancy) return
    const amountCollected = sanitizeMoney(Number(collectionAmountInput || 0))
    const actualCollectionDate = collectionDateInput || `${tenantDeskMonth}-01`
    const expectedCollectionDate = tenancy.rentalTerms.dateOfCollection.startsWith(tenantDeskMonth)
      ? tenancy.rentalTerms.dateOfCollection
      : `${tenantDeskMonth}-${tenancy.rentalTerms.dateOfCollection.slice(-2) || '01'}`
    const response = await createRentCollectionRecord({
      tenancyId: tenancy.id,
      expectedCollectionDate,
      actualCollectionDate,
      amountCollected,
      serviceAdminFee: tenancy.rentalTerms.serviceFeeDeduction,
      sst: tenancy.rentalTerms.serviceFeeDeduction * 0.08,
      dateRemitted: actualCollectionDate,
      notes: `Recorded collection of ${currency(amountCollected)} for ${tenantDeskMonth}.`,
    })
    applyServerState(response.state, { selectedTenancyId: tenancy.id })
    setCollectionAmountInput('')
    alert(`Successfully recorded collection of ${currency(amountCollected)} for period ${tenantDeskMonth}.`)
  }

  const prepareRenewal = async (tenancy: Tenancy | null) => {
    if (!tenancy) return
    const response = await createTenantActivityRecord({
      tenancyId: tenancy.id,
      date: new Date().toISOString().slice(0, 10),
      type: 'Renewal',
      notes: `Renewal review opened for expiry on ${tenancy.expirationDate}.`,
    })
    applyServerState(response.state, { selectedTenancyId: tenancy.id })
    alert(`Renewal process prepared successfully. Recorded renewal review under activity history for expiry ${tenancy.expirationDate}.`)
  }

  const openTenantReport = (report: ReportKey, tenancy: Tenancy | null) => {
    if (!tenancy) return
    setSection('reports')
    setReportTab('library')
    setActiveReport(report)
    setReportPropertyId(tenancy.propertyId)
    setReportTenantId(tenancy.tenantId)
    setReportTenancyId(tenancy.id)
    setReportMonth(tenantDeskMonth)
    setReportAsOfDate(collectionDateInput || `${tenantDeskMonth}-28`)
    setReportViewerOpen(true)
  }

  const updateMonthlyRentalIncome = async (
    propertyId: string,
    grossRentalAmount: number,
    periodMonth: string = monthlyProfitLossPeriod,
  ) => {
    const safeAmount = sanitizeMoney(grossRentalAmount)
    const response = await saveMonthlyRentalIncome({
      propertyId,
      periodMonth,
      grossRentalAmount: safeAmount,
    })
    applyServerState(response.state)
  }

  const updateMonthlyExpenseEntry = async (
    propertyId: string,
    expenseCategoryId: string,
    amount: number,
    periodMonth: string = monthlyProfitLossPeriod,
  ) => {
    const safeAmount = sanitizeMoney(amount)
    const response = await saveMonthlyExpenseEntry({
      propertyId,
      periodMonth,
      expenseCategoryId,
      amount: safeAmount,
    })
    applyServerState(response.state)
  }




  const statementRows = useMemo(
    () =>
      buildStatementOfAccount(state, {
        propertyId: reportPropertyId || undefined,
        tenantId: reportTenantId || undefined,
        tenancyId: reportTenancyId || undefined,
        from: reportFrom || undefined,
        to: reportTo || undefined,
        status: reportStatus || undefined,
      }),
    [reportFrom, reportPropertyId, reportStatus, reportTenantId, reportTenancyId, reportTo, state],
  )

  const cashAccount = useMemo(
    () =>
      buildCashAccount(state, {
        propertyId: reportPropertyId || undefined,
        tenancyId: reportTenancyId || undefined,
        from: reportFrom || undefined,
        to: reportTo || undefined,
        month: reportMonth || undefined,
      }),
    [reportFrom, reportMonth, reportPropertyId, reportTenancyId, reportTo, state],
  )

  const monthlyCollectionRows = useMemo(
    () =>
      buildStatementOfAccount(state, {
        propertyId: reportPropertyId || undefined,
        tenantId: reportTenantId || undefined,
        from: reportMonth ? `${reportMonth}-01` : reportFrom || undefined,
        to: reportMonth ? `${reportMonth}-31` : reportTo || undefined,
      }),
    [reportFrom, reportMonth, reportPropertyId, reportTenantId, reportTo, state],
  )

  const arrearsRows = useMemo(() => {
    const asOf = reportAsOfDate || new Date().toISOString().slice(0, 10)
    return buildStatementOfAccount(state, {
      propertyId: reportPropertyId || undefined,
      tenantId: reportTenantId || undefined,
      tenancyId: reportTenancyId || undefined,
    })
      .map((row) => {
        const daysLate = calculateDaysLate(row.expectedCollectionDate, row.actualCollectionDate, asOf)
        const outstanding = Math.max(0, row.outstandingAmount)
        return {
          tenant: row.tenantName,
          property: row.propertyAddress,
          dueDate: row.expectedCollectionDate,
          expectedAmount: row.monthlyGrossRental + row.surcharge,
          amountCollected: row.amountCollected,
          outstandingAmount: outstanding,
          daysLate,
          agingBucket: calculateAgingBucket(daysLate),
          lastPaymentDate: row.actualCollectionDate || '-',
          contactInfo: state.tenants.find((t) => t.name === row.tenantName)?.mobile || '-',
          status: row.status,
        }
      })
      .filter((row) => (includePaidAccounts ? true : row.outstandingAmount > 0 || row.daysLate > 0))
      .filter((row) => (reportStatus ? row.status === reportStatus : true))
      .filter((row) => (reportAgingBucket ? row.agingBucket === reportAgingBucket : true))
  }, [
    includePaidAccounts,
    reportAgingBucket,
    reportAsOfDate,
    reportPropertyId,
    reportStatus,
    reportTenantId,
    reportTenancyId,
    state,
  ])

  const rentRollRows = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return state.tenancies
      .filter((tenancy) => (!reportPropertyId ? true : tenancy.propertyId === reportPropertyId))
      .filter((tenancy) => (!reportTenantId ? true : tenancy.tenantId === reportTenantId))
      .filter((tenancy) => (!reportTenancyStatus ? true : tenancy.status === reportTenancyStatus))
      .map((tenancy) => {
        const property = state.properties.find((p) => p.id === tenancy.propertyId)
        const tenant = state.tenants.find((t) => t.id === tenancy.tenantId)
        if (reportPropertyType && property?.kind !== reportPropertyType) return null
        const daysToExpiry = calculateDaysLate(today, tenancy.expirationDate) * -1
        return {
          propertySerial: property?.serialNumber || '-',
          propertyAddress: property ? `${property.address.streetAddress}, ${property.address.cityState}` : '-',
          propertyType: property?.kind || '-',
          tenantName: tenant?.name || '-',
          tenancyStartDate: tenancy.commencementDate,
          moveInDate: tenancy.moveInDate,
          expiryDate: tenancy.expirationDate,
          tenure: tenancy.tenure,
          monthlyGrossRental: tenancy.rentalTerms.monthlyGross,
          netRental: tenancy.rentalTerms.monthlyNet,
          depositHeld: tenancy.rentalTerms.rentalDeposit,
          collectionDate: tenancy.rentalTerms.dateOfCollection,
          tenancyStatus: tenancy.status,
          daysToExpiry,
          utilityAccounts: [tenancy.airSelangorAccount, tenancy.tnbAccount, tenancy.tmAccount].filter(Boolean).length,
        }
      })
      .filter(Boolean) as Record<string, unknown>[]
  }, [
    reportPropertyId,
    reportPropertyType,
    reportTenantId,
    reportTenancyStatus,
    state.properties,
    state.tenancies,
    state.tenants,
  ])

  const depositRows = useMemo(() => {
    const grouped = state.depositTransactions.reduce<Record<string, DepositTransaction[]>>((acc, tx) => {
      if (!acc[tx.tenancyId]) acc[tx.tenancyId] = []
      acc[tx.tenancyId].push(tx)
      return acc
    }, {})
    return Object.entries(grouped)
      .map(([tenancyId, txs]) => {
        const tenancy = state.tenancies.find((t) => t.id === tenancyId)
        if (!tenancy) return null
        const property = state.properties.find((p) => p.id === tenancy.propertyId)
        const tenant = state.tenants.find((t) => t.id === tenancy.tenantId)
        if (reportPropertyId && tenancy.propertyId !== reportPropertyId) return null
        if (reportTenantId && tenancy.tenantId !== reportTenantId) return null
        if (reportTenancyId && tenancy.id !== reportTenancyId) return null
        const received = txs.filter((tx) => tx.type === 'Received').reduce((acc, tx) => acc + tx.amount, 0)
        const refunded = txs.filter((tx) => tx.type === 'Refunded').reduce((acc, tx) => acc + tx.amount, 0)
        const applied = txs.filter((tx) => tx.type === 'Applied').reduce((acc, tx) => acc + tx.amount, 0)
        const forfeited = txs.filter((tx) => tx.type === 'Forfeited').reduce((acc, tx) => acc + tx.amount, 0)
        const balanceHeld = calculateDepositBalance(txs)
        return {
          tenant: tenant?.name || '-',
          property: property?.address.streetAddress || '-',
          tenancy: tenancy.id,
          depositReceived: received,
          amountRefunded: refunded,
          amountApplied: applied,
          amountForfeited: forfeited,
          balanceHeld,
          status: balanceHeld > 0 ? 'Active' : 'Settled',
        }
      })
      .filter(Boolean) as Record<string, unknown>[]
  }, [reportPropertyId, reportTenantId, reportTenancyId, state.depositTransactions, state.properties, state.tenancies, state.tenants])

  const expenseRows = useMemo(() => {
    const asOf = reportAsOfDate || new Date().toISOString().slice(0, 10)
    const baseRows = state.expenseTransactions
      .filter((tx) => (!reportPropertyId ? true : tx.propertyId === reportPropertyId))
      .filter((tx) => (!reportTenancyId ? true : tx.tenancyId === reportTenancyId))
      .filter((tx) => (!reportFrom ? true : tx.datePaid >= reportFrom))
      .filter((tx) => (!reportTo ? true : tx.datePaid <= reportTo))
      .map((tx) => ({
        propertySerial: state.properties.find((p) => p.id === tx.propertyId)?.serialNumber || '-',
        tenancyId: tx.tenancyId || '-',
        expenseType: tx.expenseType,
        amountPaid: tx.amount,
        datePaid: tx.datePaid,
        invoiceNumber: tx.invoiceNumber || '-',
        description: tx.description || '-',
        depreciationPeriod: '-',
        monthlyDepreciation: 0,
        accumulatedDepreciation: 0,
        remainingUndepreciatedAmount: 0,
      }))
    const renovationRows = state.properties
      .filter((property) => (!reportPropertyId ? true : property.id === reportPropertyId))
      .flatMap((property) =>
        property.renovations.map((renovation) => {
          const monthlyDepreciation = calculateMonthlyDepreciation(renovation.amountPaid, renovation.depreciationPeriod)
          const accumulatedDepreciation = calculateAccumulatedDepreciation(
            monthlyDepreciation,
            renovation.paymentDate,
            asOf,
          )
          return {
            propertySerial: property.serialNumber,
            tenancyId: '-',
            expenseType: 'Renovation',
            amountPaid: renovation.amountPaid,
            datePaid: renovation.paymentDate,
            invoiceNumber: renovation.invoiceNumber,
            description: renovation.description,
            depreciationPeriod: `${renovation.depreciationPeriod} years`,
            monthlyDepreciation,
            accumulatedDepreciation,
            remainingUndepreciatedAmount: calculateRemainingUndepreciatedAmount(
              renovation.amountPaid,
              accumulatedDepreciation,
            ),
          }
        }),
      )
    return [...baseRows, ...renovationRows]
  }, [reportAsOfDate, reportFrom, reportPropertyId, reportTenancyId, reportTo, state.expenseTransactions, state.properties])

  const runReport = (report: ReportKey) => {
    setActiveReport(report)
    if (report === 'Monthly P&L') {
      setReportMonth(monthlyProfitLossPeriod)
    }
    setReportViewerOpen(true)
  }

  const exportReportCsv = (report: ReportKey) => {
    setActiveReport(report)
    exportActiveReportCsv(
      report,
      statementRows.map((row) => ({ ...row })),
      monthlyCollectionRows.map((row) => ({ ...row })),
      arrearsRows,
      rentRollRows,
      depositRows,
      expenseRows,
      cashAccount,
      monthlyProfitLossReportRows,
    )
  }

  const exportReportPdf = (report: ReportKey) => {
    setActiveReport(report)
    exportActiveReportPdf(
      report,
      statementRows.map((row) => ({ ...row })),
      monthlyCollectionRows.map((row) => ({ ...row })),
      arrearsRows,
      rentRollRows,
      depositRows,
      expenseRows,
      cashAccount,
      monthlyProfitLossReportRows,
    )
  }

  const exportOwnerPacket = () => {
    ;([
      'Statement of Account',
      'Monthly P&L',
      'Cash Account',
      'Rent Roll & Tenancy Status',
      'Deposit Register',
    ] as ReportKey[]).forEach((report) => exportReportCsv(report))
  }

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />
  }

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Loading...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 border-r border-slate-200/80 bg-[var(--surface)] p-5 lg:block">
          <h1 className="mb-1 text-xl font-semibold">Rental Operations</h1>
          <p className="mb-8 text-sm text-[var(--muted)]">Properties and tenancies cockpit</p>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${section === item.id ? 'bg-[var(--primary)] text-white' : 'text-slate-700 hover:bg-slate-100'}`}
              >
                <item.icon size={16} />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>
        <main className="w-full">
          <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur">
            <div className="flex items-center gap-3 px-4 py-3 lg:px-8">
              <button className="rounded-md p-2 hover:bg-slate-100 lg:hidden" onClick={() => setShowMobileNav(true)}>
                <Menu size={18} />
              </button>
              <div className="hidden items-center gap-2 text-sm text-slate-600 md:flex">
                <Bell size={16} />
                <span>{lateCount} late</span>
              </div>
              <div className="relative max-w-xl flex-1">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search serial, address, project, developer"
                  className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none ring-[var(--primary)] focus:ring-2"
                />
              </div>
              <button
                onClick={() => setPropertyDrawer(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary-dark)]"
              >
                <Plus size={15} />
                Add Property
              </button>
            </div>
          </header>

          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="px-4 py-6 lg:px-8"
            >
              {bootstrapError && (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  {bootstrapError}
                </div>
              )}
              {isBootstrapping ? (
                <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-[var(--muted)]">
                  Loading operational portfolio...
                </section>
              ) : (
                <>
              {section === 'overview' && (
                <section className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Metric label="Properties" value={String(state.properties.length)} icon={Building2} />
                    <Metric label="Active Tenancies" value={String(state.tenancies.length)} icon={Users} />
                    <Metric label="Late Collections" value={String(lateCount)} icon={AlertTriangle} />
                    <Metric label="Expiring Soon" value={String(expiringCount)} icon={CalendarClock} />
                  </div>
                  <div className="grid gap-4 xl:grid-cols-3">
                    <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-5">
                      <h2 className="mb-1 text-base font-semibold">Portfolio Cash Snapshot</h2>
                      <p className="mb-4 text-sm text-[var(--muted)]">
                        Current cumulative rent position from the operational record.
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <DataBlock label="Cumulative Gross Rental" value={currency(totalGross)} />
                        <DataBlock label="Cumulative Net Rental" value={currency(totalNet)} />
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                      <h2 className="mb-4 text-base font-semibold">Quick Actions</h2>
                      <div className="space-y-2">
                        <QuickButton text="Create Tenant" onClick={() => setTenantDrawer(true)} />
                        <QuickButton text="Open Property Reports" onClick={() => setSection('reports')} />
                        <QuickButton
                          text="Setup Tenancy"
                          onClick={() => setTenancyDrawer(true)}
                        />
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {section === 'properties' && (
                <section className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
                  <div className="rounded-2xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-200 px-4 py-3">
                      <h2 className="text-base font-semibold">Properties</h2>
                    </div>
                    <div className="max-h-[65vh] overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-slate-50 text-left">
                          <tr>
                            <th className="px-4 py-2">Serial</th>
                            <th className="px-4 py-2">Address</th>
                            <th className="px-4 py-2">Type</th>
                            <th className="px-4 py-2">Book / Market</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredProperties.map((property) => (
                            <tr
                              key={property.id}
                              onClick={() => setSelectedPropertyId(property.id)}
                              className={`cursor-pointer border-t border-slate-100 hover:bg-slate-50 ${selectedPropertyId === property.id ? 'bg-cyan-50' : ''}`}
                            >
                              <td className="px-4 py-3 font-medium">{property.serialNumber}</td>
                              <td className="px-4 py-3">
                                {property.address.unitNumber}, {property.address.streetAddress}
                              </td>
                              <td className="px-4 py-3">
                                {property.kind} / {property.ownership}
                              </td>
                              <td className="px-4 py-3">
                                {currency(property.bookValue)} / {currency(property.marketValue)}
                              </td>
                            </tr>
                          ))}
                          {!filteredProperties.length && (
                            <tr>
                              <td colSpan={4} className="px-4 py-8 text-center text-[var(--muted)]">
                                No properties yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <h2 className="mb-3 text-base font-semibold">Property Detail</h2>
                    {!selectedProperty ? (
                      <p className="text-sm text-[var(--muted)]">Select a property to view tabs and interactions.</p>
                    ) : (
                      <Tabs.Root defaultValue="property">
                        <Tabs.List className="mb-4 flex gap-1 rounded-xl bg-slate-100 p-1">
                          {['property', 'tenants', 'deductions', 'reports'].map((tab) => (
                            <Tabs.Trigger
                              key={tab}
                              value={tab}
                              className="rounded-lg px-3 py-1.5 text-sm data-[state=active]:bg-white"
                            >
                              {tab[0].toUpperCase() + tab.slice(1)}
                            </Tabs.Trigger>
                          ))}
                        </Tabs.List>
                        <Tabs.Content value="property" className="space-y-3 text-sm">
                          <DataLine label="Project">{selectedProperty.projectName || '-'}</DataLine>
                          <DataLine label="Developer">{selectedProperty.developerName || '-'}</DataLine>
                          <DataLine label="SPA Price">{currency(selectedProperty.spaPrice)}</DataLine>
                          <DataLine label="Agreement PDF">
                            {selectedProperty.tenancyAgreement?.fileName || 'Not attached'}
                          </DataLine>
                          <div className="pt-2">
                            <button
                              onClick={() => setRenovationDrawer(true)}
                              className="rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50"
                            >
                              Add Renovation / Refurbishment Item
                            </button>
                          </div>
                          <div className="space-y-2">
                            {selectedProperty.renovations.map((renovation) => (
                              <div key={renovation.id} className="rounded-lg border border-slate-200 p-3">
                                <p className="font-medium">{renovation.description}</p>
                                <p className="text-xs text-[var(--muted)]">
                                  {currency(renovation.amountPaid)} | {renovation.paymentDate || 'No date'} |{' '}
                                  {renovation.depreciationPeriod} years
                                </p>
                              </div>
                            ))}
                            {!selectedProperty.renovations.length && (
                              <p className="text-xs text-[var(--muted)]">No renovation items yet (max 10).</p>
                            )}
                          </div>
                        </Tabs.Content>
                        <Tabs.Content value="tenants" className="space-y-3 text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setTenantDrawer(true)}
                              className="rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50"
                            >
                              Create Tenant
                            </button>
                            <button
                              onClick={() => setTenancyDrawer(true)}
                              className="rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50"
                            >
                              Create Tenancy
                            </button>
                          </div>
                          <div className="space-y-2">
                            {selectedPropertyTenancies.map((tenancy) => {
                              const tenant = state.tenants.find((item) => item.id === tenancy.tenantId)
                              return (
                                <div key={tenancy.id} className="rounded-lg border border-slate-200 p-3">
                                  <p className="font-medium">{tenant?.name || 'Unknown tenant'}</p>
                                  <p className="text-xs text-[var(--muted)]">
                                    Status: {tenancy.status} | Net: {currency(tenancy.rentalTerms.monthlyNet)}
                                  </p>
                                  {!tenancy.closedEarly && (
                                    <button
                                      onClick={() => closeTenancyEarly(tenancy.id)}
                                      className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-800"
                                    >
                                      Close Early
                                    </button>
                                  )}
                                </div>
                              )
                            })}
                            {!selectedPropertyTenancies.length && (
                              <p className="text-xs text-[var(--muted)]">No tenancy records yet.</p>
                            )}
                          </div>
                        </Tabs.Content>
                        <Tabs.Content value="deductions" className="space-y-2 text-sm">
                          {selectedPropertyTenancies.map((tenancy) => (
                            <div key={tenancy.id} className="rounded-lg border border-slate-200 p-3">
                              <p className="mb-2 font-medium">Tenancy {tenancy.id.slice(0, 6)}</p>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <DataTile label="Maintenance" value={currency(tenancy.deductions.maintenanceCharges)} />
                                <DataTile label="Quit Rent" value={currency(tenancy.deductions.quitRent)} />
                                <DataTile label="Assessment" value={currency(tenancy.deductions.assessment)} />
                                <DataTile label="Utility" value={currency(tenancy.deductions.utilityCharges)} />
                                <DataTile
                                  label="Fire Insurance"
                                  value={currency(tenancy.deductions.fireInsurancePremium)}
                                />
                                <DataTile label="Sinking Fund" value={currency(tenancy.deductions.sinkingFundPayment)} />
                                <DataTile label="Misc Charges" value={currency(tenancy.deductions.miscellaneousCharges)} />
                                <DataTile label="Cost of Funds" value={currency(tenancy.deductions.bankCostOfFunds)} />
                                <DataTile label="Depreciation" value={currency(tenancy.deductions.depreciationCost)} />
                              </div>
                            </div>
                          ))}
                          {!selectedPropertyTenancies.length && (
                            <p className="text-xs text-[var(--muted)]">
                              Deductions will appear once tenancies are created.
                            </p>
                          )}
                        </Tabs.Content>
                        <Tabs.Content value="reports" className="space-y-2 text-sm">
                          <button
                            onClick={() => {
                              setSection('reports')
                              setReportPropertyId(selectedProperty.id)
                            }}
                            className="rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50"
                          >
                            Open Property Reports
                          </button>
                          <p className="text-xs text-[var(--muted)]">
                            Report module includes Statement of Account, P&L, Cash Account, collections, arrears,
                            rent roll, deposit register, and depreciation schedule.
                          </p>
                        </Tabs.Content>
                      </Tabs.Root>
                    )}
                  </div>
                </section>
              )}

              {section === 'tenants' && (
                <TenantWorkspace
                  state={state}
                  tenancies={tenantDeskTenancies}
                  selectedTenancy={selectedTenancy}
                  selectedTenancyId={effectiveSelectedTenancyId}
                  activeCount={activeTenancies.length}
                  needsActionCount={needsActionCount}
                  lateCount={lateCount}
                  expiringCount={expiringCount}
                  queue={tenantDeskQueue}
                  periodMonth={tenantDeskMonth}
                  collectionAmount={collectionAmountInput}
                  collectionDate={collectionDateInput}
                  activityType={tenantActivityType}
                  activityNotes={tenantActivityNotes}
                  onQueueChange={setTenantDeskQueue}
                  onPeriodMonthChange={setTenantDeskMonth}
                  onCollectionAmountChange={setCollectionAmountInput}
                  onCollectionDateChange={setCollectionDateInput}
                  onActivityTypeChange={setTenantActivityType}
                  onActivityNotesChange={setTenantActivityNotes}
                  onSelectTenancy={setSelectedTenancyId}
                  onCloseEarly={closeTenancyEarly}
                  onRecordCollection={recordCollection}
                  onLogActivity={appendTenantActivity}
                  onPrepareRenewal={prepareRenewal}
                  onOpenTenantReport={openTenantReport}
                />
              )}

              {section === 'reports' && (
                <section className="mx-auto flex w-full max-w-[1680px] flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* Top Tab Navigation Card */}
                  <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                      <div className="max-w-3xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Property Intelligence Hub
                        </p>
                        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                          Real-time Analytics & Operational Reporting
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                          Analyze property financial trends, edit monthly ledger entries directly, or generate custom compliance reports.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {([
                          { id: 'analytics', label: 'Property Analytics' },
                          { id: 'portfolio', label: 'Portfolio Overview' },
                          { id: 'library', label: 'Report Library' },
                        ] as const).map((tab) => (
                          <button
                            key={tab.id}
                            onClick={() => setReportTab(tab.id)}
                            className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                              reportTab === tab.id
                                ? 'border-[var(--primary)] bg-cyan-50 text-cyan-900 shadow-sm'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {(!state.properties.length || !state.tenancies.length) && (
                    <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      Add at least one property and tenancy before generating reports.
                    </p>
                  )}

                  {state.properties.length > 0 && state.tenancies.length > 0 && (
                    <>
                      {/* TAB 1: PROPERTY ANALYTICS */}
                      {reportTab === 'analytics' && (() => {
                        const directCategories = state.expenseCategories.filter((c) => c.groupType === 'DIRECT')
                        const indirectCategories = state.expenseCategories.filter((c) => c.groupType === 'INDIRECT')
                        const analyticsProperties = state.properties

                        // No auto-select — user must pick from Screen 0
                        const selectedAnalyticsProperty = analyticsProperties.find(p => p.id === analyticsPropertyId)

                        const precedingMonths = getPreceding12Months(analyticsEndMonth)
                        const fromMonth = precedingMonths[0]
                        const toMonth = precedingMonths[precedingMonths.length - 1]

                        const chartData = selectedAnalyticsProperty
                          ? buildPropertyTimeSeries(state, selectedAnalyticsProperty.id, fromMonth, toMonth)
                          : []

                        const totalGrossRental = chartData.reduce((acc, row) => acc + Number(row.grossRental || 0), 0)
                        const totalDirectExpenses = chartData.reduce((acc, row) => acc + Number(row.directExpensesTotal || 0), 0)
                        const totalIndirectExpenses = chartData.reduce((acc, row) => acc + Number(row.indirectExpensesTotal || 0), 0)
                        const totalNetReceived = chartData.reduce((acc, row) => acc + Number(row.netRentalAmountReceive || 0), 0)

                        // ── Editor helpers ──
                        const getDraftValue = (key: string, savedVal: number) =>
                          key in editorDraft ? editorDraft[key] : savedVal

                        const getSavedIncome = (month: string) =>
                          state.monthlyRentalIncomes.find(r => r.propertyId === selectedAnalyticsProperty?.id && r.periodMonth === month)?.grossRentalAmount || 0

                        const getSavedExpense = (month: string, catId: string) =>
                          state.monthlyExpenseEntries.find(e => e.propertyId === selectedAnalyticsProperty?.id && e.periodMonth === month && e.expenseCategoryId === catId)?.amount || 0

                        const liveEditorPL = activeEditMonth && selectedAnalyticsProperty ? (() => {
                          const grossIncome = getDraftValue('income', getSavedIncome(activeEditMonth))
                          const directAmounts = directCategories.map(cat => getDraftValue(cat.id, getSavedExpense(activeEditMonth, cat.id)))
                          const indirectAmounts = indirectCategories.map(cat => getDraftValue(cat.id, getSavedExpense(activeEditMonth, cat.id)))
                          return calculateMonthlyProfitLossValues({
                            grossRentalAmount: grossIncome,
                            directExpenses: directAmounts,
                            indirectExpenses: indirectAmounts,
                          })
                        })() : null

                        const openMonthEditor = (month: string) => {
                          if (!selectedAnalyticsProperty) return
                          const draft: Record<string, number> = { income: getSavedIncome(month) }
                          directCategories.forEach(cat => { draft[cat.id] = getSavedExpense(month, cat.id) })
                          indirectCategories.forEach(cat => { draft[cat.id] = getSavedExpense(month, cat.id) })
                          setEditorDraft(draft)
                          setActiveEditMonth(month)
                          setEditorSavedBadge(false)
                          setAnalyticsView('editor')
                        }

                        const saveEditor = async () => {
                          if (!selectedAnalyticsProperty || !activeEditMonth) return
                          const savedIncome = getSavedIncome(activeEditMonth)
                          const draftIncome = getDraftValue('income', savedIncome)
                          if (draftIncome !== savedIncome) {
                            await updateMonthlyRentalIncome(selectedAnalyticsProperty.id, draftIncome, activeEditMonth)
                          }
                          for (const cat of [...directCategories, ...indirectCategories]) {
                            const savedExp = getSavedExpense(activeEditMonth, cat.id)
                            const draftExp = getDraftValue(cat.id, savedExp)
                            if (draftExp !== savedExp) {
                              await updateMonthlyExpenseEntry(selectedAnalyticsProperty.id, cat.id, draftExp, activeEditMonth)
                            }
                          }
                          setEditorSavedBadge(true)
                          setTimeout(() => setEditorSavedBadge(false), 2500)
                        }

                        // ── Month nav in editor ──
                        const currentMonthIndex = activeEditMonth ? precedingMonths.indexOf(activeEditMonth) : -1
                        const prevEditorMonth = currentMonthIndex > 0 ? precedingMonths[currentMonthIndex - 1] : null
                        const nextEditorMonth = currentMonthIndex < precedingMonths.length - 1 ? precedingMonths[currentMonthIndex + 1] : null

                        const navigateEditorMonth = async (month: string) => {
                          if (activeEditMonth) {
                            let hasUnsaved = false
                            const savedIncome = getSavedIncome(activeEditMonth)
                            if (getDraftValue('income', savedIncome) !== savedIncome) hasUnsaved = true
                            if (!hasUnsaved) {
                              for (const cat of [...directCategories, ...indirectCategories]) {
                                const savedExp = getSavedExpense(activeEditMonth, cat.id)
                                if (getDraftValue(cat.id, savedExp) !== savedExp) {
                                  hasUnsaved = true
                                  break
                                }
                              }
                            }
                            if (hasUnsaved) {
                              await saveEditor()
                            }
                          }

                          const draft: Record<string, number> = { income: getSavedIncome(month) }
                          directCategories.forEach(cat => { draft[cat.id] = getSavedExpense(month, cat.id) })
                          indirectCategories.forEach(cat => { draft[cat.id] = getSavedExpense(month, cat.id) })
                          setEditorDraft(draft)
                          setActiveEditMonth(month)
                          setEditorSavedBadge(false)
                        }

                        const fmtLong = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                        const fmtShort = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

                        return (
                          <div className="flex flex-col gap-4">

                            {/* ══════════════════════════════════════════════════════════ */}
                            {/* TOP FILTER BAR                                           */}
                            {/* ══════════════════════════════════════════════════════════ */}
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 bg-white border border-slate-200 rounded-2xl px-5 py-3.5 shadow-sm">

                              {analyticsPropertyId && (
                                <>
                                  <button
                                    onClick={() => {
                                      setAnalyticsPropertyId('')
                                      setAnalyticsView('overview')
                                      setActiveEditMonth(null)
                                      setEditorDraft({})
                                    }}
                                    className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                    Back to Portfolio
                                  </button>
                                  <div className="h-4 w-px bg-slate-200" />
                                </>
                              )}

                              {/* Property dropdown */}
                              <div className="flex items-center gap-2.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Property</span>
                                <select
                                  value={analyticsPropertyId}
                                  onChange={e => {
                                    setAnalyticsPropertyId(e.target.value)
                                    setAnalyticsView('overview')
                                    setActiveEditMonth(null)
                                    setEditorDraft({})
                                  }}
                                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-cyan-400 cursor-pointer min-w-[200px] max-w-[280px]"
                                >
                                  <option value="">All Properties</option>
                                  {analyticsProperties.map(p => (
                                    <option key={p.id} value={p.id}>{p.serialNumber} – {p.address.streetAddress}</option>
                                  ))}
                                </select>
                              </div>

                              <div className="h-4 w-px bg-slate-200" />

                              {/* Period end month */}
                              <div className="flex items-center gap-2.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Period End</span>
                                <input
                                  type="month"
                                  value={analyticsEndMonth}
                                  onChange={e => setAnalyticsEndMonth(e.target.value)}
                                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-400"
                                />
                              </div>

                              {/* View toggle — only when property selected + not in editor */}
                              {selectedAnalyticsProperty && analyticsView !== 'editor' && (
                                <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 ml-auto">
                                  {([
                                    { id: 'overview' as const, label: 'Overview' },
                                    { id: 'ledger' as const, label: 'Monthly Ledger' },
                                  ] as const).map(v => (
                                    <button
                                      key={v.id}
                                      onClick={() => setAnalyticsView(v.id)}
                                      className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                        analyticsView === v.id
                                          ? 'bg-white text-slate-900 shadow-sm'
                                          : 'text-slate-500 hover:text-slate-700'
                                      }`}
                                    >
                                      {v.label}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* Editor breadcrumb */}
                              {selectedAnalyticsProperty && analyticsView === 'editor' && activeEditMonth && (
                                <div className="flex items-center gap-2 ml-auto text-xs">
                                  <button
                                    onClick={() => { setAnalyticsView('ledger'); setActiveEditMonth(null); setEditorDraft({}) }}
                                    className="text-slate-400 hover:text-cyan-700 font-medium transition-colors"
                                  >
                                    ‹ Ledger
                                  </button>
                                  <span className="text-slate-300">›</span>
                                  <span className="font-semibold text-slate-800">{fmtLong(activeEditMonth)}</span>
                                </div>
                              )}
                            </div>


                            {/* ══════════════════════════════════════════════════════════ */}
                            {/* SCREEN 0: Portfolio Property Grid (no property selected) */}
                            {/* ══════════════════════════════════════════════════════════ */}
                            {!selectedAnalyticsProperty && (() => {
                              const portfolioTotals = analyticsProperties.reduce((acc, prop) => {
                                const d = buildPropertyTimeSeries(state, prop.id, fromMonth, toMonth)
                                acc.gross += d.reduce((s, r) => s + Number(r.grossRental || 0), 0)
                                acc.direct += d.reduce((s, r) => s + Number(r.directExpensesTotal || 0), 0)
                                acc.indirect += d.reduce((s, r) => s + Number(r.indirectExpensesTotal || 0), 0)
                                acc.net += d.reduce((s, r) => s + Number(r.netRentalAmountReceive || 0), 0)
                                return acc
                              }, { gross: 0, direct: 0, indirect: 0, net: 0 })

                              return (
                                <div className="space-y-5">
                                  {/* Portfolio KPI summary */}
                                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    {[
                                      { label: 'Portfolio Gross', value: portfolioTotals.gross, valueColor: 'text-slate-900', bg: 'bg-white border-slate-200' },
                                      { label: 'Total Direct Exp.', value: portfolioTotals.direct, valueColor: 'text-rose-600', bg: 'bg-rose-50/60 border-rose-100' },
                                      { label: 'Total Indirect Exp.', value: portfolioTotals.indirect, valueColor: 'text-orange-600', bg: 'bg-orange-50/60 border-orange-100' },
                                      { label: 'Portfolio Net Received', value: portfolioTotals.net, valueColor: portfolioTotals.net >= 0 ? 'text-emerald-700' : 'text-rose-700', bg: portfolioTotals.net >= 0 ? 'bg-emerald-50/60 border-emerald-100' : 'bg-rose-50/60 border-rose-100' },
                                    ].map(kpi => (
                                      <div key={kpi.label} className={`rounded-2xl border p-5 ${kpi.bg}`}>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{kpi.label}</div>
                                        <div className={`mt-2.5 text-2xl font-bold ${kpi.valueColor}`}>{currency(kpi.value)}</div>
                                        <div className="text-[10px] text-slate-400 mt-1">12 months ending {analyticsEndMonth}</div>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Property cards grid */}
                                  <div>
                                    <div className="flex items-center justify-between mb-3">
                                      <p className="text-sm font-semibold text-slate-700">Select a property to drill into its analytics</p>
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{analyticsProperties.length} Properties</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                      {analyticsProperties.map(prop => {
                                        const propData = buildPropertyTimeSeries(state, prop.id, fromMonth, toMonth)
                                        const propGross = propData.reduce((s, r) => s + Number(r.grossRental || 0), 0)
                                        const propNet = propData.reduce((s, r) => s + Number(r.netRentalAmountReceive || 0), 0)
                                        const hasData = propGross > 0
                                        const operatingMargin = propGross > 0 ? ((propNet / propGross) * 100).toFixed(0) : null

                                        return (
                                          <button
                                            key={prop.id}
                                            onClick={() => { setAnalyticsPropertyId(prop.id); setAnalyticsView('overview') }}
                                            className="text-left rounded-2xl border border-slate-200 bg-white p-5 hover:border-cyan-300 hover:shadow-md hover:-translate-y-0.5 transition-all group"
                                          >
                                            <div className="flex items-start justify-between gap-2">
                                              <div className="min-w-0">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{prop.serialNumber}</div>
                                                <div className="mt-1 text-sm font-semibold text-slate-900 leading-snug truncate">{prop.address.streetAddress}</div>
                                                <div className="mt-0.5 text-xs text-slate-400 truncate">{prop.address.cityState}</div>
                                              </div>
                                              <span className="text-slate-300 group-hover:text-cyan-400 transition-colors text-xl shrink-0 mt-0.5">›</span>
                                            </div>
                                            <div className="mt-4 pt-3 border-t border-slate-100">
                                              {hasData ? (
                                                <div className="flex justify-between text-xs">
                                                  <div>
                                                    <div className="text-slate-400 mb-0.5">12M Gross</div>
                                                    <div className="font-semibold text-slate-700">{currency(propGross)}</div>
                                                  </div>
                                                  <div className="text-right">
                                                    <div className="text-slate-400 mb-0.5">12M Net</div>
                                                    <div className={`font-semibold ${propNet >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{currency(propNet)}</div>
                                                  </div>
                                                  {operatingMargin && (
                                                    <div className="text-right">
                                                      <div className="text-slate-400 mb-0.5">Margin</div>
                                                      <div className={`font-bold ${Number(operatingMargin) >= 30 ? 'text-emerald-600' : Number(operatingMargin) >= 10 ? 'text-orange-500' : 'text-rose-600'}`}>{operatingMargin}%</div>
                                                    </div>
                                                  )}
                                                </div>
                                              ) : (
                                                <div className="text-[11px] text-slate-400 italic">No data entered yet</div>
                                              )}
                                            </div>
                                          </button>
                                        )
                                      })}
                                    </div>
                                  </div>
                                </div>
                              )
                            })()}


                            {/* ══════════════════════════════════════════════════════════ */}
                            {/* SCREEN 1: Property Overview (chart + KPIs)               */}
                            {/* ══════════════════════════════════════════════════════════ */}
                            {selectedAnalyticsProperty && analyticsView === 'overview' && (
                              <div className="space-y-4">
                                {/* Property header + annual KPIs */}
                                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
                                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-5 border-b border-slate-100 mb-5">
                                    <div>
                                      <h3 className="text-xl font-bold text-slate-900">{selectedAnalyticsProperty.address.streetAddress}</h3>
                                      <p className="text-xs text-slate-400 mt-1">{selectedAnalyticsProperty.serialNumber} · {selectedAnalyticsProperty.address.cityState} · 12-month review ending {analyticsEndMonth}</p>
                                    </div>
                                    <button
                                      onClick={() => setAnalyticsView('ledger')}
                                      className="self-start shrink-0 text-xs font-semibold text-cyan-700 bg-cyan-50 border border-cyan-200 px-4 py-2 rounded-xl hover:bg-cyan-100 transition-colors"
                                    >
                                      View Monthly Ledger →
                                    </button>
                                  </div>
                                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                                    {[
                                      { label: '12M Gross Rental', value: totalGrossRental, color: 'text-slate-900' },
                                      { label: '12M Direct Expenses', value: totalDirectExpenses, color: 'text-rose-600' },
                                      { label: '12M Indirect Expenses', value: totalIndirectExpenses, color: 'text-orange-600' },
                                      { label: '12M Net Received', value: totalNetReceived, color: totalNetReceived >= 0 ? 'text-emerald-700' : 'text-rose-700' },
                                    ].map((kpi, i) => (
                                      <div key={kpi.label} className={i > 0 ? 'border-l border-slate-100 pl-5' : ''}>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">{kpi.label}</div>
                                        <div className={`mt-2 text-2xl font-bold ${kpi.color}`}>{currency(kpi.value)}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Area chart — click a data point → editor for that month */}
                                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
                                  <div className="flex items-start justify-between mb-1">
                                    <div>
                                      <h4 className="text-base font-semibold text-slate-900">Financial Trend</h4>
                                      <p className="text-xs text-slate-400 mt-0.5">Gross Rental · Net Rental · Net Received — <span className="font-medium text-cyan-600">Click any data point to view that month in the ledger</span></p>
                                    </div>
                                  </div>
                                  {chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={320}>
                                      <AreaChart
                                        data={chartData}
                                        margin={{ top: 16, right: 12, left: -15, bottom: 0 }}
                                        onClick={(data) => {
                                          if (data?.activeLabel) {
                                            setAnalyticsView('ledger')
                                            setTimeout(() => {
                                              const row = document.getElementById(`ledger-row-${data.activeLabel}`)
                                              if (row) {
                                                row.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                                row.classList.add('bg-cyan-100', 'transition-all', 'duration-500')
                                                setTimeout(() => row.classList.remove('bg-cyan-100'), 1500)
                                              }
                                            }, 100)
                                          }
                                        }}
                                        style={{ cursor: 'pointer' }}
                                      >
                                        <defs>
                                          <linearGradient id="cgGross2" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                                          </linearGradient>
                                          <linearGradient id="cgNetRental2" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                          </linearGradient>
                                          <linearGradient id="cgNetReceived2" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                          </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickFormatter={val => fmtShort(val)} />
                                        <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={val => `RM${(val / 1000).toFixed(0)}k`} />
                                        <Tooltip
                                          formatter={(value, name) => [currency(Number(value)), name]}
                                          contentStyle={{ background: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '12px', border: 'none' }}
                                          labelFormatter={label => `${fmtLong(label)} — click to edit`}
                                        />
                                        <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} />
                                        <Area type="monotone" dataKey="grossRental" name="Gross Rental" stroke="#06b6d4" strokeWidth={2.5} fillOpacity={1} fill="url(#cgGross2)" dot={false} activeDot={{ r: 6, cursor: 'pointer' }} />
                                        <Area type="monotone" dataKey="netRentalAmount" name="Net Rental" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#cgNetRental2)" dot={false} activeDot={{ r: 5, cursor: 'pointer' }} />
                                        <Area type="monotone" dataKey="netRentalAmountReceive" name="Net Received" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#cgNetReceived2)" dot={false} activeDot={{ r: 6, cursor: 'pointer' }} />
                                      </AreaChart>
                                    </ResponsiveContainer>
                                  ) : (
                                    <div className="h-[320px] flex flex-col items-center justify-center gap-4 text-center">
                                      <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-2xl">📊</div>
                                      <div>
                                        <div className="text-sm font-semibold text-slate-600">No data for this period yet</div>
                                        <div className="text-xs text-slate-400 mt-1">Enter monthly figures to see the trend appear</div>
                                      </div>
                                      <button
                                        onClick={() => openMonthEditor(toMonth)}
                                        className="text-xs font-semibold text-cyan-700 bg-cyan-50 border border-cyan-200 px-4 py-2 rounded-xl hover:bg-cyan-100 transition-colors"
                                      >
                                        + Enter data for {fmtShort(toMonth)}
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {/* Efficiency ratios — compact horizontal row */}
                                {totalGrossRental > 0 && (
                                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-6 py-4">
                                    <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Efficiency Ratios</span>
                                      {[
                                        {
                                          label: 'Operating Margin',
                                          pct: (totalNetReceived / totalGrossRental) * 100,
                                          color: (totalNetReceived / totalGrossRental) >= 0.4 ? 'text-emerald-700' : (totalNetReceived / totalGrossRental) >= 0.1 ? 'text-orange-600' : 'text-rose-700',
                                        },
                                        { label: 'Direct Cost Ratio', pct: (totalDirectExpenses / totalGrossRental) * 100, color: 'text-rose-600' },
                                        { label: 'Indirect Cost Ratio', pct: (totalIndirectExpenses / totalGrossRental) * 100, color: 'text-orange-600' },
                                      ].map(r => (
                                        <div key={r.label} className="flex items-baseline gap-2.5">
                                          <span className="text-xs text-slate-500">{r.label}</span>
                                          <span className={`text-lg font-bold ${r.color}`}>{r.pct.toFixed(1)}%</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}


                            {/* ══════════════════════════════════════════════════════════ */}
                            {/* SCREEN 2: Monthly Ledger table                          */}
                            {/* ══════════════════════════════════════════════════════════ */}
                            {selectedAnalyticsProperty && analyticsView === 'ledger' && (
                              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between gap-4">
                                  <div>
                                    <h4 className="text-sm font-semibold text-slate-900">Monthly Summary Ledger</h4>
                                    <p className="text-xs text-slate-400 mt-0.5">{selectedAnalyticsProperty.address.streetAddress} · 12 months ending {analyticsEndMonth}</p>
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Click ✏ to edit a month</span>
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="w-full border-collapse text-sm">
                                    <thead>
                                      <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                                        <th className="px-6 py-3.5 text-left">Period</th>
                                        <th className="px-6 py-3.5 text-right">Gross Rental</th>
                                        <th className="px-6 py-3.5 text-right text-rose-500 bg-rose-50/30">Direct Exp.</th>
                                        <th className="px-6 py-3.5 text-right">Net Rental</th>
                                        <th className="px-6 py-3.5 text-right text-orange-500 bg-orange-50/30">Indirect Exp.</th>
                                        <th className="px-6 py-3.5 text-right">Net Received</th>
                                        <th className="px-4 py-3.5 text-center w-24"></th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {precedingMonths.map(m => {
                                        const incomeVal = getSavedIncome(m)
                                        const directAmounts = directCategories.map(cat => getSavedExpense(m, cat.id))
                                        const indirectAmounts = indirectCategories.map(cat => getSavedExpense(m, cat.id))
                                        const calculated = calculateMonthlyProfitLossValues({
                                          grossRentalAmount: incomeVal,
                                          directExpenses: directAmounts,
                                          indirectExpenses: indirectAmounts,
                                        })
                                        const hasData = incomeVal > 0 || calculated.directExpensesTotal > 0 || calculated.indirectExpensesTotal > 0

                                        return (
                                          <tr id={`ledger-row-${m}`} key={m} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors group">
                                            <td className="px-6 py-3 text-left font-semibold text-slate-700 whitespace-nowrap">{fmtShort(m)}</td>
                                            <td className="px-6 py-3 text-right text-slate-600 whitespace-nowrap">
                                              {hasData ? currency(incomeVal) : <span className="text-slate-300">—</span>}
                                            </td>
                                            <td className="px-6 py-3 text-right text-rose-600 bg-rose-50/20 whitespace-nowrap">
                                              {calculated.directExpensesTotal > 0 ? `-${currency(calculated.directExpensesTotal)}` : <span className="text-slate-300">—</span>}
                                            </td>
                                            <td className="px-6 py-3 text-right text-slate-700 font-medium whitespace-nowrap">
                                              {hasData ? currency(calculated.netRentalAmount) : <span className="text-slate-300">—</span>}
                                            </td>
                                            <td className="px-6 py-3 text-right text-orange-600 bg-orange-50/20 whitespace-nowrap">
                                              {calculated.indirectExpensesTotal > 0 ? `-${currency(calculated.indirectExpensesTotal)}` : <span className="text-slate-300">—</span>}
                                            </td>
                                            <td className={`px-6 py-3 text-right font-bold whitespace-nowrap ${
                                              !hasData ? 'text-slate-300' : calculated.netRentalAmountReceive >= 0 ? 'text-emerald-700' : 'text-rose-700'
                                            }`}>
                                              {hasData ? currency(calculated.netRentalAmountReceive) : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                              <button
                                                onClick={() => openMonthEditor(m)}
                                                className="text-[11px] font-semibold text-slate-400 hover:text-cyan-700 hover:bg-cyan-50 px-2.5 py-1.5 rounded-lg transition-all border border-transparent hover:border-cyan-200 opacity-0 group-hover:opacity-100"
                                              >
                                                ✏ Edit
                                              </button>
                                            </td>
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                    <tfoot>
                                      <tr className="bg-slate-50 border-t-2 border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                                        <td className="px-6 py-3.5 text-left">12M Total</td>
                                        <td className="px-6 py-3.5 text-right text-slate-800">{currency(totalGrossRental)}</td>
                                        <td className="px-6 py-3.5 text-right text-rose-700 bg-rose-50/20">-{currency(totalDirectExpenses)}</td>
                                        <td className="px-6 py-3.5 text-right text-slate-800">{currency(totalGrossRental - totalDirectExpenses)}</td>
                                        <td className="px-6 py-3.5 text-right text-orange-700 bg-orange-50/20">-{currency(totalIndirectExpenses)}</td>
                                        <td className={`px-6 py-3.5 text-right ${totalNetReceived >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{currency(totalNetReceived)}</td>
                                        <td />
                                      </tr>
                                      <tr className="bg-slate-100/50 border-t border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                                        <td className="px-6 py-2 text-left">12M Average / Mo</td>
                                        <td className="px-6 py-2 text-right">{currency(totalGrossRental / 12)}</td>
                                        <td className="px-6 py-2 text-right text-rose-600/70">-{currency(totalDirectExpenses / 12)}</td>
                                        <td className="px-6 py-2 text-right">{currency((totalGrossRental - totalDirectExpenses) / 12)}</td>
                                        <td className="px-6 py-2 text-right text-orange-600/70">-{currency(totalIndirectExpenses / 12)}</td>
                                        <td className={`px-6 py-2 text-right ${totalNetReceived >= 0 ? 'text-emerald-600/80' : 'text-rose-600/80'}`}>{currency(totalNetReceived / 12)}</td>
                                        <td />
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              </div>
                            )}


                            {/* ══════════════════════════════════════════════════════════ */}
                            {/* SCREEN 3: Month Editor (focused data entry)             */}
                            {/* ══════════════════════════════════════════════════════════ */}
                            {selectedAnalyticsProperty && analyticsView === 'editor' && activeEditMonth && (
                              <div className="space-y-4">

                                {/* Month navigation header */}
                                <div className="flex items-center bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                                  <button
                                    onClick={() => prevEditorMonth && navigateEditorMonth(prevEditorMonth)}
                                    disabled={!prevEditorMonth}
                                    className="flex items-center gap-2 px-5 py-4 text-sm font-medium text-slate-500 hover:text-cyan-700 hover:bg-cyan-50/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all border-r border-slate-100 min-w-[140px]"
                                  >
                                    <span className="text-lg leading-none">‹</span>
                                    <span className="text-xs">{prevEditorMonth ? fmtShort(prevEditorMonth) : ''}</span>
                                  </button>
                                  <div className="flex-1 text-center py-4">
                                    <div className="text-base font-bold text-slate-900">{fmtLong(activeEditMonth)}</div>
                                    <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">Monthly Data Entry</div>
                                  </div>
                                  <button
                                    onClick={() => nextEditorMonth && navigateEditorMonth(nextEditorMonth)}
                                    disabled={!nextEditorMonth}
                                    className="flex items-center justify-end gap-2 px-5 py-4 text-sm font-medium text-slate-500 hover:text-cyan-700 hover:bg-cyan-50/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all border-l border-slate-100 min-w-[140px]"
                                  >
                                    <span className="text-xs">{nextEditorMonth ? fmtShort(nextEditorMonth) : ''}</span>
                                    <span className="text-lg leading-none">›</span>
                                  </button>
                                </div>

                                {/* Two-column editor body */}
                                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4 items-start">

                                  {/* LEFT: Form inputs */}
                                  <div className="space-y-4">

                                    {/* Income */}
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                      <div className="px-5 py-3 bg-slate-50/60 border-b border-slate-100">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Income</span>
                                      </div>
                                      <div className="p-5">
                                        <div className="flex items-center gap-4">
                                          <label className="text-sm font-medium text-slate-700 flex-1">Gross Rental Amount</label>
                                          <input
                                            type="number" min={0} step="0.01"
                                            value={getDraftValue('income', getSavedIncome(activeEditMonth)) || ''}
                                            onChange={e => setEditorDraft(prev => ({ ...prev, income: parseFloat(e.target.value) || 0 }))}
                                            placeholder="0.00"
                                            className="w-40 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-right font-semibold bg-white outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition"
                                          />
                                        </div>
                                      </div>
                                    </div>

                                    {/* Direct Expenses */}
                                    {directCategories.length > 0 && (
                                      <div className="bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden">
                                        <div className="px-5 py-3 bg-rose-50/50 border-b border-rose-100">
                                          <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Direct Expenses</span>
                                          <span className="ml-2 text-[10px] text-slate-400">— Costs directly attributable to this property</span>
                                        </div>
                                        <div className="p-5 space-y-4">
                                          {directCategories.map(cat => (
                                            <div key={cat.id} className="flex items-center gap-4">
                                              <label className="text-sm font-medium text-slate-600 min-w-0 flex-1">{cat.name}</label>
                                              <input
                                                type="number" min={0} step="0.01"
                                                value={getDraftValue(cat.id, getSavedExpense(activeEditMonth, cat.id)) || ''}
                                                onChange={e => setEditorDraft(prev => ({ ...prev, [cat.id]: parseFloat(e.target.value) || 0 }))}
                                                placeholder="0.00"
                                                className="w-40 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-right font-semibold bg-white outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300 transition"
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Indirect Expenses */}
                                    {indirectCategories.length > 0 && (
                                      <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden">
                                        <div className="px-5 py-3 bg-orange-50/50 border-b border-orange-100">
                                          <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Indirect Expenses</span>
                                          <span className="ml-2 text-[10px] text-slate-400">— Shared or overhead costs allocated to this property</span>
                                        </div>
                                        <div className="p-5 space-y-4">
                                          {indirectCategories.map(cat => (
                                            <div key={cat.id} className="flex items-center gap-4">
                                              <label className="text-sm font-medium text-slate-600 min-w-0 flex-1">{cat.name}</label>
                                              <input
                                                type="number" min={0} step="0.01"
                                                value={getDraftValue(cat.id, getSavedExpense(activeEditMonth, cat.id)) || ''}
                                                onChange={e => setEditorDraft(prev => ({ ...prev, [cat.id]: parseFloat(e.target.value) || 0 }))}
                                                placeholder="0.00"
                                                className="w-40 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-right font-semibold bg-white outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 transition"
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {directCategories.length === 0 && indirectCategories.length === 0 && (
                                      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                                        <p className="text-sm text-slate-400">No expense categories configured yet.</p>
                                      </div>
                                    )}
                                  </div>

                                  {/* RIGHT: Live P&L + actions */}
                                  <div className="space-y-3 lg:sticky lg:top-4">

                                    {/* Live P&L card */}
                                    {liveEditorPL && (
                                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                        <div className="px-5 py-3 bg-slate-50/60 border-b border-slate-100">
                                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live P&L Preview</span>
                                        </div>
                                        <div className="p-5 space-y-2.5">
                                          <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-500">Gross Rental</span>
                                            <span className="text-sm font-semibold text-slate-900">{currency(liveEditorPL.grossRentalAmount)}</span>
                                          </div>
                                          <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-500">Direct Expenses</span>
                                            <span className="text-sm font-semibold text-rose-600">-{currency(liveEditorPL.directExpensesTotal)}</span>
                                          </div>
                                          <div className="flex justify-between items-center border-t border-slate-100 pt-2.5">
                                            <span className="text-sm text-slate-700 font-medium">Net Rental</span>
                                            <span className="text-sm font-bold text-slate-800">{currency(liveEditorPL.netRentalAmount)}</span>
                                          </div>
                                          <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-500">Indirect Expenses</span>
                                            <span className="text-sm font-semibold text-orange-600">-{currency(liveEditorPL.indirectExpensesTotal)}</span>
                                          </div>
                                          <div className="flex justify-between items-center border-t-2 border-slate-200 pt-3 mt-1">
                                            <span className="text-sm font-bold text-slate-900">Net Received</span>
                                            <span className={`text-2xl font-bold ${liveEditorPL.netRentalAmountReceive >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                              {currency(liveEditorPL.netRentalAmountReceive)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Save button */}
                                    <button
                                      onClick={saveEditor}
                                      className={`w-full rounded-2xl py-3.5 text-sm font-bold shadow-sm transition-all ${
                                        editorSavedBadge
                                          ? 'bg-emerald-500 text-white'
                                          : 'bg-cyan-600 hover:bg-cyan-700 text-white'
                                      }`}
                                    >
                                      {editorSavedBadge ? '✓ Saved!' : 'Save Changes'}
                                    </button>

                                    {/* Back to ledger */}
                                    <button
                                      onClick={() => { setAnalyticsView('ledger'); setActiveEditMonth(null); setEditorDraft({}) }}
                                      className="w-full rounded-2xl py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 transition-all"
                                    >
                                      ← Back to Ledger
                                    </button>

                                    <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                                      Unsaved changes are shown live in the P&L preview above but won't be persisted until you click Save.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                          </div>
                        )
                      })()}





                      {/* TAB 2: PORTFOLIO OVERVIEW */}
                      {reportTab === 'portfolio' && (() => {
                        let portfolioReports = buildMonthlyProfitLoss(state, { periodMonth: monthlyProfitLossPeriod })
                        
                        if (portfolioViewMode === 'ttm') {
                          const months = getPreceding12Months(monthlyProfitLossPeriod)
                          const aggregated: Record<string, any> = {}
                          
                          months.forEach(m => {
                            const mReports = buildMonthlyProfitLoss(state, { periodMonth: m })
                            mReports.forEach(r => {
                              if (!aggregated[r.propertyId]) {
                                aggregated[r.propertyId] = JSON.parse(JSON.stringify(r))
                                aggregated[r.propertyId].periodMonth = `TTM ending ${monthlyProfitLossPeriod}`
                              } else {
                                const agg = aggregated[r.propertyId]
                                agg.grossRentalAmount += r.grossRentalAmount
                                agg.directExpensesTotal += r.directExpensesTotal
                                agg.indirectExpensesTotal += r.indirectExpensesTotal
                                agg.netRentalAmount += r.netRentalAmount
                                agg.netRentalAmountReceive += r.netRentalAmountReceive
                                
                                r.directExpenses.forEach((exp: any) => {
                                  const aggExp = agg.directExpenses.find((e: any) => e.categoryId === exp.categoryId)
                                  if (aggExp) aggExp.amount += exp.amount
                                })
                                r.indirectExpenses.forEach((exp: any) => {
                                  const aggExp = agg.indirectExpenses.find((e: any) => e.categoryId === exp.categoryId)
                                  if (aggExp) aggExp.amount += exp.amount
                                })
                              }
                            })
                          })
                          portfolioReports = Object.values(aggregated)
                        }

                        const portfolioSummary = buildMonthlyProfitLossPortfolioSummary(portfolioReports)
                        const comparisonRows = buildMonthlyProfitLossComparisonRows(portfolioReports)
                        const rankingData = portfolioReports.map(r => ({
                          propertyId: r.propertyId,
                          propertyLabel: r.propertyLabel,
                          grossRental: r.grossRentalAmount,
                          directExpensesTotal: r.directExpensesTotal,
                          indirectExpensesTotal: r.indirectExpensesTotal,
                          netRentalAmountReceive: r.netRentalAmountReceive,
                        })).sort((a, b) => b.netRentalAmountReceive - a.netRentalAmountReceive)

                        return (
                          <div className="flex flex-col gap-6">
                            {/* Top Bar with Month Selector */}
                            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                              <div>
                                <h3 className="text-xl font-semibold text-slate-950">Portfolio-Wide Overview</h3>
                                <p className="text-sm text-[var(--muted)]">Track comparative performance and ranked profitability across all properties.</p>
                              </div>
                              <div className="flex flex-wrap items-center gap-4">
                                <div className="flex bg-slate-100 p-1 rounded-xl">
                                  <button
                                    onClick={() => setPortfolioViewMode('single')}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${portfolioViewMode === 'single' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                  >
                                    Single Month
                                  </button>
                                  <button
                                    onClick={() => setPortfolioViewMode('ttm')}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${portfolioViewMode === 'ttm' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                  >
                                    Trailing 12 Months
                                  </button>
                                </div>
                                <div className="hidden sm:block h-6 w-px bg-slate-200" />
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-medium text-slate-600">Period end:</span>
                                  <input
                                    type="month"
                                    value={monthlyProfitLossPeriod}
                                    onChange={(e) => setMonthlyProfitLossPeriod(e.target.value)}
                                    className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-cyan-500"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Portfolio KPIs */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Gross Income</div>
                                <div className="mt-2 text-2xl font-bold text-slate-900">{currency(portfolioSummary.totalGrossRentalAmount)}</div>
                              </div>
                              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Direct Expenses</div>
                                <div className="mt-2 text-2xl font-bold text-slate-900">-{currency(portfolioSummary.totalDirectExpenses)}</div>
                              </div>
                              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Net Received</div>
                                <div className={`mt-2 text-2xl font-bold ${portfolioSummary.totalNetRentalAmountReceive >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {currency(portfolioSummary.totalNetRentalAmountReceive)}
                                </div>
                              </div>
                              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
                                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Top vs Bottom Property</div>
                                <div className="text-xs font-semibold text-emerald-600 truncate">▲ {portfolioSummary.bestPerformingProperty}</div>
                                <div className="text-xs font-semibold text-rose-600 truncate">▼ {portfolioSummary.lowestPerformingProperty}</div>
                              </div>
                            </div>

                            {/* Ranked Bar Chart & Comparison Table */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                              {/* Bar Chart ranking properties */}
                              <div className="lg:col-span-1 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                                <h4 className="text-base font-semibold text-slate-955 mb-4">Properties Ranked by Net Received</h4>
                                {rankingData.length > 0 ? (
                                  <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={rankingData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                      <XAxis type="number" stroke="#94a3b8" fontSize={10} tickFormatter={(val) => `RM${val}`} />
                                      <YAxis
                                        type="category"
                                        dataKey="propertyLabel"
                                        stroke="#94a3b8"
                                        fontSize={9}
                                        width={90}
                                        tickFormatter={(val) => val.split(' - ')[0] || val} // Show serial number only to prevent overlap
                                      />
                                      <Tooltip formatter={(value) => currency(Number(value))} contentStyle={{ background: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                                      <Bar dataKey="netRentalAmountReceive" name="Net Received" fill="#10b981" radius={[0, 8, 8, 0]} />
                                    </BarChart>
                                  </ResponsiveContainer>
                                ) : (
                                  <div className="h-[300px] flex items-center justify-center text-slate-400 text-sm">No property ranking data available</div>
                                )}
                              </div>

                              {/* Comparison table */}
                              <div className="lg:col-span-2 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm overflow-hidden flex flex-col justify-between">
                                <div>
                                  <h4 className="text-base font-semibold text-slate-950">Property P&L Comparison</h4>
                                  <p className="text-xs text-[var(--muted)] mb-4">A direct side-by-side comparison of P&L line items across all properties.</p>
                                </div>
                                <div className="relative overflow-x-auto w-full">
                                  <ObjectTable data={comparisonRows} sortable={false} wrapCells />
                                  {state.properties.length > 2 && (
                                    <p className="text-[10px] text-slate-400 text-center mt-2 font-medium">Scroll horizontally to compare properties →</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })()}

                      {/* TAB 3: REPORT LIBRARY */}
                      {reportTab === 'library' && (
                        <div className="space-y-4">
                          {/* Library Sub-view toggle */}
                          <div className="flex justify-between items-center bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                            <div>
                              <span className="text-sm font-semibold text-slate-800">Operational Report Library</span>
                              <p className="text-xs text-slate-500">Run standard reports in a printable format or use the custom filters below.</p>
                            </div>
                            <button
                              onClick={() => setLibraryView(prev => prev === 'cards' ? 'runner' : 'cards')}
                              className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 transition"
                            >
                              {libraryView === 'cards' ? 'Open Custom Report Runner' : 'Show Report Cards'}
                            </button>
                          </div>

                          {libraryView === 'runner' ? (
                            <ReportRunnerWorkspace
                              activeReport={activeReport}
                              reportPropertyId={reportPropertyId}
                              reportTenantId={reportTenantId}
                              reportTenancyId={reportTenancyId}
                              reportStatus={reportStatus}
                              reportPropertyType={reportPropertyType}
                              reportTenancyStatus={reportTenancyStatus}
                              reportAgingBucket={reportAgingBucket}
                              reportFrom={reportFrom}
                              reportTo={reportTo}
                              reportMonth={reportMonth}
                              reportAsOfDate={reportAsOfDate}
                              reportPropertyOptions={reportPropertyOptions}
                              reportTenantOptions={reportTenantOptions}
                              reportTenancyOptions={reportTenancyOptions}
                              statementRows={statementRows as unknown as Record<string, unknown>[]}
                              monthlyCollectionRows={monthlyCollectionRows as unknown as Record<string, unknown>[]}
                              arrearsRows={arrearsRows}
                              rentRollRows={rentRollRows}
                              depositRows={depositRows}
                              expenseRows={expenseRows}
                              cashAccount={cashAccount}
                              monthlyProfitLossRows={monthlyProfitLossReportRows}
                              onReportChange={setActiveReport}
                              onPropertyChange={setReportPropertyId}
                              onTenantChange={setReportTenantId}
                              onTenancyChange={setReportTenancyId}
                              onStatusChange={setReportStatus}
                              onPropertyTypeChange={setReportPropertyType}
                              onTenancyStatusChange={setReportTenancyStatus}
                              onAgingBucketChange={setReportAgingBucket}
                              onFromChange={setReportFrom}
                              onToChange={setReportTo}
                              onMonthChange={setReportMonth}
                              onAsOfDateChange={setReportAsOfDate}
                              onRunReport={runReport}
                              onExportCsv={exportReportCsv}
                              onExportPdf={exportReportPdf}
                              onOwnerPacket={exportOwnerPacket}
                            />
                          ) : (
                            <>
                              {/* Active Filters Scope banner */}
                              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm">
                                <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
                                  <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Active Filters Scope:</span>
                                  <span className="font-medium text-slate-900">{reportPropertyOptions.find(o => o.value === reportPropertyId)?.label || 'All properties'}</span>
                                  <span className="text-slate-300">·</span>
                                  <span className="font-medium text-slate-900">{reportTenantOptions.find(o => o.value === reportTenantId)?.label || 'All tenants'}</span>
                                  <span className="text-slate-300">·</span>
                                  <span className="font-medium text-slate-900">{reportTenancyOptions.find(o => o.value === reportTenancyId)?.label || 'All tenancies'}</span>
                                  {reportMonth && (
                                    <>
                                      <span className="text-slate-300">·</span>
                                      <span className="font-medium text-slate-900">Period: {reportMonth}</span>
                                    </>
                                  )}
                                </div>
                                <button
                                  onClick={() => {
                                    setReportPropertyId('')
                                    setReportTenantId('')
                                    setReportTenancyId('')
                                    setReportStatus('')
                                    setReportPropertyType('')
                                    setReportTenancyStatus('')
                                    setReportAgingBucket('')
                                    setReportFrom('')
                                    setReportTo('')
                                    setReportMonth('')
                                    setReportAsOfDate('')
                                  }}
                                  className="text-xs text-[var(--primary)] font-semibold hover:underline"
                                >
                                  Clear filters
                                </button>
                              </div>
                              
                              {/* Cards Grid */}
                              <div className="space-y-4">
                                <ReportGroup
                                  title="Collections"
                                  cards={[
                                    {
                                      title: 'Statement of Account',
                                      description: 'Tenancy-level collections, deductions, remittances, and running balance.',
                                    },
                                    {
                                      title: 'Monthly Cash Collection',
                                      description: 'Monthly expected vs collected variance and remittance control.',
                                    },
                                    {
                                      title: 'Arrears / Late Collection Aging',
                                      description: 'Exception-focused aging buckets for unpaid, partial, and late accounts.',
                                    },
                                  ]}
                                  onRun={runReport}
                                  onExportCsv={exportReportCsv}
                                  onExportPdf={exportReportPdf}
                                />
                                <ReportGroup
                                  title="Profitability"
                                  cards={[
                                    {
                                      title: 'Monthly P&L',
                                      description: 'Comprehensive monthly direct and indirect expense report.',
                                    },
                                    {
                                      title: 'Cash Account',
                                      description: 'Opening, inflow, outflow, net movement, and closing cash position.',
                                    },
                                  ]}
                                  onRun={runReport}
                                  onExportCsv={exportReportCsv}
                                  onExportPdf={exportReportPdf}
                                />
                                <ReportGroup
                                  title="Portfolio"
                                  cards={[
                                    {
                                      title: 'Rent Roll & Tenancy Status',
                                      description: 'Portfolio tenancy occupancy, expiry horizon, and utility indicators.',
                                    },
                                    {
                                      title: 'Deposit Register',
                                      description: 'Deposit liability and movements by tenancy.',
                                    },
                                  ]}
                                  onRun={runReport}
                                  onExportCsv={exportReportCsv}
                                  onExportPdf={exportReportPdf}
                                />
                                <ReportGroup
                                  title="Costs"
                                  cards={[
                                    {
                                      title: 'Expense & Depreciation Schedule',
                                      description: 'Property expenses with renovation depreciation tracking.',
                                    },
                                  ]}
                                  onRun={runReport}
                                  onExportCsv={exportReportCsv}
                                  onExportPdf={exportReportPdf}
                                />
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </section>
              )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <Drawer
        title="Add Property"
        subtitle="Capture the asset record once, then reuse it across tenancies, reports, and monthly close."
        open={propertyDrawer}
        onOpenChange={(open) => {
          setPropertyDrawer(open)
          if (!open) setPropertyCreateError('')
        }}
        widthClassName="max-w-3xl"
        footer={
          <SaveButton
            onClick={createProperty}
            disabled={!propertyDraft.address.streetAddress}
            busy={propertyCreateSaving}
            busyLabel="Saving property..."
            error={propertyCreateError}
          >
            Save property
          </SaveButton>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <PanelSummary label="System serial" value={nextPropertySerial} tone="accent" />
            <PanelSummary
              label="Location"
              value={propertyDraft.address.streetAddress || 'Address pending'}
            />
            <PanelSummary
              label="Structure"
              value={`${propertyDraft.kind} · ${propertyDraft.ownership}`}
            />
          </div>
          <SectionCard title="Identity" description="Start with the property class used in searches and reports.">
            <LabeledSelect
              label="Property type"
              value={propertyDraft.kind}
              onChange={(value) => setPropertyDraft((prev) => ({ ...prev, kind: value as PropertyKind }))}
              options={['Highrise', 'Landed']}
              helper="System serial is assigned on save."
            />
          </SectionCard>
          <SectionCard
            title="Address"
            description="Keep the address block readable in tenancy lookups and reports."
            columnsClassName="md:grid-cols-3"
          >
            <LabeledInput
              label="Unit number"
              value={propertyDraft.address.unitNumber}
              onChange={(value) =>
                setPropertyDraft((prev) => ({
                  ...prev,
                  address: { ...prev.address, unitNumber: value },
                }))
              }
            />
            <LabeledInput
              label="Street address"
              required
              value={propertyDraft.address.streetAddress}
              onChange={(value) =>
                setPropertyDraft((prev) => ({
                  ...prev,
                  address: { ...prev.address, streetAddress: value },
                }))
              }
              helper="This is the main search and display line."
              error={propertyCreateError && !propertyDraft.address.streetAddress ? 'Required' : undefined}
            />
            <LabeledInput
              label="District / city / state"
              value={propertyDraft.address.cityState}
              onChange={(value) =>
                setPropertyDraft((prev) => ({
                  ...prev,
                  address: { ...prev.address, cityState: value },
                }))
              }
            />
          </SectionCard>
          <SectionCard title="Ownership and value" description="Used in valuation views and operational reporting.">
            <LabeledSelect
              label="Ownership"
              value={propertyDraft.ownership}
              onChange={(value) => setPropertyDraft((prev) => ({ ...prev, ownership: value as Property['ownership'] }))}
              options={['Freehold', 'Leasehold']}
            />
            <MoneyInput
              label="SPA price"
              value={propertyDraft.spaPrice}
              onChange={(value) => setPropertyDraft((prev) => ({ ...prev, spaPrice: value }))}
            />
            <MoneyInput
              label="Book value"
              value={propertyDraft.bookValue}
              onChange={(value) => setPropertyDraft((prev) => ({ ...prev, bookValue: value }))}
            />
            <MoneyInput
              label="Indicated market value"
              value={propertyDraft.marketValue}
              onChange={(value) => setPropertyDraft((prev) => ({ ...prev, marketValue: value }))}
            />
          </SectionCard>
          <SectionCard
            title="Agreement metadata"
            description="Optional document metadata that links the property to its records."
            columnsClassName="md:grid-cols-3"
          >
            <LabeledInput
              label="Project name"
              value={propertyDraft.projectName}
              onChange={(value) => setPropertyDraft((prev) => ({ ...prev, projectName: value }))}
            />
            <LabeledInput
              label="Developer name"
              value={propertyDraft.developerName}
              onChange={(value) => setPropertyDraft((prev) => ({ ...prev, developerName: value }))}
            />
            <LabeledInput
              label="Tenancy agreement file name"
              value={propertyDraft.agreementFileName}
              onChange={(value) => setPropertyDraft((prev) => ({ ...prev, agreementFileName: value }))}
              helper="Metadata only in this build."
            />
          </SectionCard>
        </div>
      </Drawer>

      <Drawer
        title="Add Tenant"
        subtitle="Create the person record once, then attach it to one or more tenancies."
        open={tenantDrawer}
        onOpenChange={(open) => {
          setTenantDrawer(open)
          if (!open) setTenantCreateError('')
        }}
        widthClassName="max-w-2xl"
        footer={
          <SaveButton
            onClick={createTenant}
            disabled={!tenantDraft.name || !tenantDraft.nricPassport}
            busy={tenantCreateSaving}
            busyLabel="Saving tenant..."
            error={tenantCreateError}
          >
            Save tenant
          </SaveButton>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <PanelSummary label="Name" value={tenantDraft.name || 'Tenant pending'} tone="accent" />
            <PanelSummary label="Contact" value={tenantDraft.mobile || 'Contact pending'} />
          </div>
          <SectionCard title="Identity" description="Keep the record fast to scan without over-explaining it.">
            <LabeledInput
              label="Full name"
              required
              value={tenantDraft.name}
              onChange={(value) => setTenantDraft((prev) => ({ ...prev, name: value }))}
              error={tenantCreateError && !tenantDraft.name ? 'Required' : undefined}
            />
            <LabeledInput
              label="NRIC / passport number"
              required
              value={tenantDraft.nricPassport}
              onChange={(value) => setTenantDraft((prev) => ({ ...prev, nricPassport: value }))}
              error={tenantCreateError && !tenantDraft.nricPassport ? 'Required' : undefined}
            />
          </SectionCard>
          <SectionCard title="Contact" description="Communication details used in tenant desk follow-up.">
            <LabeledInput
              label="Email"
              value={tenantDraft.email}
              onChange={(value) => setTenantDraft((prev) => ({ ...prev, email: value }))}
            />
            <LabeledInput
              label="Mobile number"
              value={tenantDraft.mobile}
              onChange={(value) => setTenantDraft((prev) => ({ ...prev, mobile: value }))}
            />
          </SectionCard>
        </div>
      </Drawer>

      <Drawer
        title="Add Tenancy"
        subtitle="Break the lease into clear operational sections so the long form stays readable."
        open={tenancyDrawer}
        onOpenChange={(open) => {
          setTenancyDrawer(open)
          if (!open) setTenancyCreateError('')
        }}
        widthClassName="max-w-4xl"
        footer={
          <SaveButton
            onClick={createTenancy}
            disabled={!selectedPropertyId || !tenancyDraft.tenantId || !tenancyDraft.expirationDate}
            busy={tenancyCreateSaving}
            busyLabel="Saving tenancy..."
            error={tenancyCreateError}
          >
            Save tenancy
          </SaveButton>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <PanelSummary label="Property" value={selectedProperty?.serialNumber || 'Select a property'} tone="accent" />
            <PanelSummary label="Tenant" value={state.tenants.find((tenant) => tenant.id === tenancyDraft.tenantId)?.name || 'Select a tenant'} />
            <PanelSummary label="Status" value={deriveTenancyStatus(tenancyDraft)} />
          </div>
          <SectionCard
            title="Tenant and property assignment"
            description="Anchor the tenancy to the property and tenant before lease details."
          >
            <LabeledSelect
              label="Property"
              required
              value={selectedPropertyId || ''}
              onChange={(value) => setSelectedPropertyId(value)}
              options={state.properties.map((prop) => ({
                label: `${prop.serialNumber} · ${prop.address.streetAddress}`,
                value: prop.id,
              }))}
              placeholder={state.properties.length ? 'Choose property' : 'No properties yet'}
              error={tenancyCreateError && !selectedPropertyId ? 'Required' : undefined}
            />
            <LabeledSelect
              label="Tenant"
              required
              value={tenancyDraft.tenantId}
              onChange={(value) => setTenancyDraft((prev) => ({ ...prev, tenantId: value }))}
              options={state.tenants.map((tenant) => ({ label: tenant.name, value: tenant.id }))}
              placeholder={state.tenants.length ? 'Choose tenant' : 'No tenants yet'}
              error={tenancyCreateError && !tenancyDraft.tenantId ? 'Required' : undefined}
            />
          </SectionCard>
          <SectionCard
            title="Lease dates and tenure"
            description="The dates define the operational life of the tenancy."
            columnsClassName="md:grid-cols-2 xl:grid-cols-3"
          >
            <LabeledInput
              label="Commencement date"
              value={tenancyDraft.commencementDate}
              onChange={(value) => setTenancyDraft((prev) => ({ ...prev, commencementDate: value }))}
              type="date"
            />
            <LabeledInput
              label="Key collection date"
              value={tenancyDraft.keyCollectionDate}
              onChange={(value) => setTenancyDraft((prev) => ({ ...prev, keyCollectionDate: value }))}
              type="date"
            />
            <LabeledInput
              label="Move-in date"
              value={tenancyDraft.moveInDate}
              onChange={(value) => setTenancyDraft((prev) => ({ ...prev, moveInDate: value }))}
              type="date"
            />
            <LabeledInput
              label="Expiration date"
              required
              value={tenancyDraft.expirationDate}
              onChange={(value) => setTenancyDraft((prev) => ({ ...prev, expirationDate: value }))}
              type="date"
              error={tenancyCreateError && !tenancyDraft.expirationDate ? 'Required' : undefined}
            />
            <LabeledInput
              label="Tenure"
              value={tenancyDraft.tenure}
              onChange={(value) => setTenancyDraft((prev) => ({ ...prev, tenure: value }))}
              helper="For example: 12 months."
            />
          </SectionCard>
          <SectionCard
            title="Utility accounts"
            description="Store the account references the tenant and operator will need."
            columnsClassName="md:grid-cols-3"
          >
            <LabeledInput
              label="Air Selangor account"
              value={tenancyDraft.airSelangorAccount}
              onChange={(value) => setTenancyDraft((prev) => ({ ...prev, airSelangorAccount: value }))}
            />
            <LabeledInput
              label="TNB account"
              value={tenancyDraft.tnbAccount}
              onChange={(value) => setTenancyDraft((prev) => ({ ...prev, tnbAccount: value }))}
            />
            <LabeledInput
              label="TM account"
              value={tenancyDraft.tmAccount}
              onChange={(value) => setTenancyDraft((prev) => ({ ...prev, tmAccount: value }))}
            />
          </SectionCard>
          <SectionCard
            title="Rental terms"
            description="Use the same values that drive the monthly collection flow."
            columnsClassName="md:grid-cols-2 xl:grid-cols-3"
          >
            <MoneyInput
              label="Rental deposit"
              value={tenancyDraft.rentalTerms.rentalDeposit}
              onChange={(value) =>
                setTenancyDraft((prev) => ({
                  ...prev,
                  rentalTerms: { ...prev.rentalTerms, rentalDeposit: value },
                }))
              }
            />
            <MoneyInput
              label="Surcharge"
              value={tenancyDraft.rentalTerms.surcharge}
              onChange={(value) =>
                setTenancyDraft((prev) => ({
                  ...prev,
                  rentalTerms: { ...prev.rentalTerms, surcharge: value },
                }))
              }
            />
            <MoneyInput
              label="Monthly gross rental"
              value={tenancyDraft.rentalTerms.monthlyGross}
              onChange={(value) =>
                setTenancyDraft((prev) => ({
                  ...prev,
                  rentalTerms: { ...prev.rentalTerms, monthlyGross: value },
                }))
              }
            />
            <LabeledInput
              label="Date of collection"
              value={tenancyDraft.rentalTerms.dateOfCollection}
              onChange={(value) =>
                setTenancyDraft((prev) => ({
                  ...prev,
                  rentalTerms: { ...prev.rentalTerms, dateOfCollection: value },
                }))
              }
              type="date"
            />
            <MoneyInput
              label="Service fee deduction"
              value={tenancyDraft.rentalTerms.serviceFeeDeduction}
              onChange={(value) =>
                setTenancyDraft((prev) => ({
                  ...prev,
                  rentalTerms: { ...prev.rentalTerms, serviceFeeDeduction: value },
                }))
              }
            />
            <MoneyInput
              label="Monthly net rental"
              value={tenancyDraft.rentalTerms.monthlyNet}
              onChange={(value) =>
                setTenancyDraft((prev) => ({
                  ...prev,
                  rentalTerms: { ...prev.rentalTerms, monthlyNet: value },
                }))
              }
            />
            <LabeledInput
              label="Date net rental remitted"
              value={tenancyDraft.rentalTerms.dateOfNetRemitted}
              onChange={(value) =>
                setTenancyDraft((prev) => ({
                  ...prev,
                  rentalTerms: { ...prev.rentalTerms, dateOfNetRemitted: value },
                }))
              }
              type="date"
            />
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={tenancyDraft.rentalTerms.lateCollectionFlag}
                onChange={(event) =>
                  setTenancyDraft((prev) => ({
                    ...prev,
                    rentalTerms: { ...prev.rentalTerms, lateCollectionFlag: event.target.checked },
                  }))
                }
              />
              Late collection flagged
            </label>
            <InlineNote>Computed status updates from these values before the tenancy is saved.</InlineNote>
          </SectionCard>
          <SectionCard
            title="Deductions and operating costs"
            description="Store the line items that flow into operational reporting."
            columnsClassName="md:grid-cols-2 xl:grid-cols-3"
          >
            <MoneyInput
              label="Maintenance charges"
              value={tenancyDraft.deductions.maintenanceCharges}
              onChange={(value) =>
                setTenancyDraft((prev) => ({
                  ...prev,
                  deductions: { ...prev.deductions, maintenanceCharges: value },
                }))
              }
            />
            <MoneyInput
              label="Quit rent"
              value={tenancyDraft.deductions.quitRent}
              onChange={(value) =>
                setTenancyDraft((prev) => ({
                  ...prev,
                  deductions: { ...prev.deductions, quitRent: value },
                }))
              }
            />
            <MoneyInput
              label="Assessment"
              value={tenancyDraft.deductions.assessment}
              onChange={(value) =>
                setTenancyDraft((prev) => ({
                  ...prev,
                  deductions: { ...prev.deductions, assessment: value },
                }))
              }
            />
            <MoneyInput
              label="Utility charges"
              value={tenancyDraft.deductions.utilityCharges}
              onChange={(value) =>
                setTenancyDraft((prev) => ({
                  ...prev,
                  deductions: { ...prev.deductions, utilityCharges: value },
                }))
              }
            />
            <MoneyInput
              label="Fire insurance premium"
              value={tenancyDraft.deductions.fireInsurancePremium}
              onChange={(value) =>
                setTenancyDraft((prev) => ({
                  ...prev,
                  deductions: { ...prev.deductions, fireInsurancePremium: value },
                }))
              }
            />
            <MoneyInput
              label="Sinking fund payment"
              value={tenancyDraft.deductions.sinkingFundPayment}
              onChange={(value) =>
                setTenancyDraft((prev) => ({
                  ...prev,
                  deductions: { ...prev.deductions, sinkingFundPayment: value },
                }))
              }
            />
            <MoneyInput
              label="Miscellaneous charges"
              value={tenancyDraft.deductions.miscellaneousCharges}
              onChange={(value) =>
                setTenancyDraft((prev) => ({
                  ...prev,
                  deductions: { ...prev.deductions, miscellaneousCharges: value },
                }))
              }
            />
            <MoneyInput
              label="Cost of funds"
              value={tenancyDraft.deductions.bankCostOfFunds}
              onChange={(value) =>
                setTenancyDraft((prev) => ({
                  ...prev,
                  deductions: { ...prev.deductions, bankCostOfFunds: value },
                }))
              }
            />
            <MoneyInput
              label="Depreciation cost"
              value={tenancyDraft.deductions.depreciationCost}
              onChange={(value) =>
                setTenancyDraft((prev) => ({
                  ...prev,
                  deductions: { ...prev.deductions, depreciationCost: value },
                }))
              }
            />
          </SectionCard>
        </div>
      </Drawer>

      <Drawer
        title="Add Renovation Item"
        subtitle="Capture the payment once and keep depreciation notes attached to the property record."
        open={renovationDrawer}
        onOpenChange={(open) => {
          setRenovationDrawer(open)
          if (!open) setRenovationCreateError('')
        }}
        widthClassName="max-w-3xl"
        footer={
          <SaveButton
            onClick={createRenovationItem}
            disabled={!selectedPropertyId || !renovationDraft.description}
            busy={renovationCreateSaving}
            busyLabel="Saving renovation..."
            error={renovationCreateError}
          >
            Save renovation item
          </SaveButton>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <PanelSummary label="Property" value={selectedProperty?.serialNumber || 'Select a property'} tone="accent" />
            <PanelSummary label="Amount" value={currency(renovationDraft.amountPaid)} />
            <PanelSummary label="Rule" value="Maximum 10 items" />
          </div>
          <SectionCard
            title="Payment details"
            description="Record the spending and the invoice trail together."
            columnsClassName="md:grid-cols-2 xl:grid-cols-4"
          >
            <MoneyInput
              label="Amount paid"
              value={renovationDraft.amountPaid}
              onChange={(value) => setRenovationDraft((prev) => ({ ...prev, amountPaid: value }))}
            />
            <LabeledInput
              label="Date of payment"
              value={renovationDraft.paymentDate}
              onChange={(value) => setRenovationDraft((prev) => ({ ...prev, paymentDate: value }))}
              type="date"
            />
            <LabeledInput
              label="Invoice number"
              value={renovationDraft.invoiceNumber}
              onChange={(value) => setRenovationDraft((prev) => ({ ...prev, invoiceNumber: value }))}
            />
            <LabeledInput
              label="Cost description"
              required
              value={renovationDraft.description}
              onChange={(value) => setRenovationDraft((prev) => ({ ...prev, description: value }))}
              error={renovationCreateError && !renovationDraft.description ? 'Required' : undefined}
            />
          </SectionCard>
          <SectionCard
            title="Depreciation treatment"
            description="This controls how the item rolls into the expense schedule."
            columnsClassName="md:grid-cols-2"
          >
            <LabeledSelect
              label="Depreciation period"
              value={String(renovationDraft.depreciationPeriod)}
              onChange={(value) =>
                setRenovationDraft((prev) => ({
                  ...prev,
                  depreciationPeriod: Number(value) as DepreciationPeriod,
                }))
              }
              options={['1', '3', '5', '10']}
            />
            <InlineNote>Keep this aligned to how the expense schedule is maintained operationally.</InlineNote>
          </SectionCard>
          <SectionCard
            title="Attachment metadata"
            description="Metadata only, with no file storage in this build."
            columnsClassName="md:grid-cols-2"
          >
            <LabeledInput
              label="Invoice attachment name"
              value={renovationDraft.attachmentName}
              onChange={(value) => setRenovationDraft((prev) => ({ ...prev, attachmentName: value }))}
              helper="Use the file name operators recognize later."
            />
          </SectionCard>
          <InlineNote>Maximum 10 items per property.</InlineNote>
        </div>
      </Drawer>

      <Dialog.Root open={reportViewerOpen} onOpenChange={setReportViewerOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/25" />
          <Dialog.Content className="fixed left-1/2 top-1/2 h-[86vh] w-[96vw] max-w-6xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-white shadow-2xl focus:outline-none">
            <div className="flex h-full flex-col">
              <div className="border-b border-slate-200 px-5 py-4">
                <Dialog.Title className="text-lg font-semibold">{activeReport}</Dialog.Title>
              </div>
              {(() => {
                const activeFilters = [
                  reportPropertyId && { id: 'property', label: `Property: ${reportPropertyOptions.find(o => o.value === reportPropertyId)?.label || reportPropertyId}`, onClear: () => setReportPropertyId('') },
                  reportTenantId && { id: 'tenant', label: `Tenant: ${reportTenantOptions.find(o => o.value === reportTenantId)?.label || reportTenantId}`, onClear: () => setReportTenantId('') },
                  reportTenancyId && { id: 'tenancy', label: `Tenancy: ${reportTenancyOptions.find(o => o.value === reportTenancyId)?.label || reportTenancyId}`, onClear: () => setReportTenancyId('') },
                  reportStatus && { id: 'status', label: `Status: ${reportStatus}`, onClear: () => setReportStatus('') },
                  reportPropertyType && { id: 'propertyType', label: `Type: ${reportPropertyType}`, onClear: () => setReportPropertyType('') },
                  reportTenancyStatus && { id: 'tenancyStatus', label: `Tenancy Status: ${reportTenancyStatus}`, onClear: () => setReportTenancyStatus('') },
                  reportAgingBucket && { id: 'agingBucket', label: `Aging: ${reportAgingBucket}`, onClear: () => setReportAgingBucket('') },
                  reportFrom && { id: 'from', label: `From: ${reportFrom}`, onClear: () => setReportFrom('') },
                  reportTo && { id: 'to', label: `To: ${reportTo}`, onClear: () => setReportTo('') },
                  reportMonth && { id: 'month', label: `Month: ${reportMonth}`, onClear: () => setReportMonth('') },
                  reportAsOfDate && { id: 'asOfDate', label: `As Of: ${reportAsOfDate}`, onClear: () => setReportAsOfDate('') }
                ].filter(Boolean) as { id: string; label: string; onClear: () => void }[]

                return (
                  <div className="border-b border-slate-200 px-5 py-3 bg-slate-50/50">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
                          Active Scope:
                        </span>
                        {activeFilters.length === 0 ? (
                          <span className="text-sm text-slate-500 italic">All data (no filters applied)</span>
                        ) : (
                          activeFilters.map((pill) => (
                            <span
                              key={pill.id}
                              className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 border border-cyan-100 px-2.5 py-1 text-xs font-medium text-cyan-800 transition-colors hover:bg-cyan-100/80"
                            >
                              {pill.label}
                              <button
                                onClick={pill.onClear}
                                className="rounded-full p-0.5 hover:bg-cyan-200/60 focus:outline-none"
                                title="Clear filter"
                              >
                                <X size={10} className="stroke-[2.5]" />
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                      <button
                        onClick={() => setReportFiltersExpanded((prev) => !prev)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900"
                      >
                        <span>{reportFiltersExpanded ? 'Hide Filters' : 'Refine Filters'}</span>
                        <ChevronDown size={14} className={`transform transition-transform duration-200 ${reportFiltersExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    {reportFiltersExpanded && (
                      <div className="mt-4 grid gap-3 border-t border-slate-200/80 pt-4 md:grid-cols-4 animate-in fade-in slide-in-from-top-1 duration-200">
                        <LabeledSelect label="Property" value={reportPropertyId} onChange={setReportPropertyId} options={reportPropertyOptions} placeholder="All properties" />
                        <LabeledSelect label="Tenant" value={reportTenantId} onChange={setReportTenantId} options={reportTenantOptions} placeholder="All tenants" />
                        <LabeledSelect label="Tenancy" value={reportTenancyId} onChange={setReportTenancyId} options={reportTenancyOptions} placeholder="All tenancies" />
                        <LabeledSelect
                          label="Status"
                          value={reportStatus}
                          onChange={setReportStatus}
                          options={['', 'Paid', 'Unpaid', 'Partial', 'Late']}
                          placeholder="All statuses"
                        />
                        <LabeledSelect
                          label="Property Type"
                          value={reportPropertyType}
                          onChange={setReportPropertyType}
                          options={['', 'Highrise', 'Landed']}
                          placeholder="All types"
                        />
                        <LabeledSelect
                          label="Tenancy Status"
                          value={reportTenancyStatus}
                          onChange={setReportTenancyStatus}
                          options={['', 'Active', 'Expiring', 'Late Collection', 'Closed Early', 'Expired']}
                          placeholder="All tenancy statuses"
                        />
                        <LabeledSelect
                          label="Aging Bucket"
                          value={reportAgingBucket}
                          onChange={setReportAgingBucket}
                          options={['', '0-30', '31-60', '61-90', '>90']}
                          placeholder="All buckets"
                        />
                        <LabeledInput label="Date From" value={reportFrom} onChange={setReportFrom} type="date" />
                        <LabeledInput label="Date To" value={reportTo} onChange={setReportTo} type="date" />
                        <label className="block">
                          <span className="mb-1 block text-xs text-[var(--muted)]">Month</span>
                          <input type="month" value={reportMonth} onChange={(event) => setReportMonth(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-[var(--primary)] focus:ring-2" />
                        </label>
                        <LabeledInput label="As Of Date" value={reportAsOfDate} onChange={setReportAsOfDate} type="date" />
                      </div>
                    )}
                  </div>
                )
              })()}
              <div className="flex-1 overflow-auto px-5 py-4">
                <ReportBody
                  activeReport={activeReport}
                  statementRows={statementRows.map((row) => ({ ...row }))}
                  monthlyCollectionRows={monthlyCollectionRows.map((row) => ({ ...row }))}
                  arrearsRows={arrearsRows}
                  rentRollRows={rentRollRows}
                  depositRows={depositRows}
                  expenseRows={expenseRows}
                  cashAccount={cashAccount}
                  monthlyProfitLossRows={monthlyProfitLossReportRows}
                  includePaidAccounts={includePaidAccounts}
                  onToggleIncludePaid={() => setIncludePaidAccounts((prev) => !prev)}
                />
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
                <Dialog.Close className="rounded-lg border border-slate-200 px-3 py-2 text-sm">Close</Dialog.Close>
                <button
                  disabled={
                    !hasRowsForReport(
                      activeReport,
                      statementRows.map((row) => ({ ...row })),
                      monthlyCollectionRows.map((row) => ({ ...row })),
                      arrearsRows,
                      rentRollRows,
                      depositRows,
                      expenseRows,
                      monthlyProfitLossReportRows,
                    )
                  }
                  onClick={() =>
                    exportActiveReportPdf(
                      activeReport,
                      statementRows.map((row) => ({ ...row })),
                      monthlyCollectionRows.map((row) => ({ ...row })),
                      arrearsRows,
                      rentRollRows,
                      depositRows,
                      expenseRows,
                      cashAccount,
                      monthlyProfitLossReportRows,
                    )
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Export PDF
                </button>
                <button
                  disabled={
                    !hasRowsForReport(
                      activeReport,
                      statementRows.map((row) => ({ ...row })),
                      monthlyCollectionRows.map((row) => ({ ...row })),
                      arrearsRows,
                      rentRollRows,
                      depositRows,
                      expenseRows,
                      monthlyProfitLossReportRows,
                    )
                  }
                  onClick={() =>
                    exportActiveReportCsv(
                      activeReport,
                      statementRows.map((row) => ({ ...row })),
                      monthlyCollectionRows.map((row) => ({ ...row })),
                      arrearsRows,
                      rentRollRows,
                      depositRows,
                      expenseRows,
                      cashAccount,
                      monthlyProfitLossReportRows,
                    )
                  }
                  className="rounded-lg bg-[var(--primary)] px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Export CSV
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={showMobileNav} onOpenChange={setShowMobileNav}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/25 lg:hidden" />
          <Dialog.Content className="fixed left-0 top-0 h-full w-72 bg-white p-4 lg:hidden">
            <Dialog.Title className="mb-3 text-base font-semibold">Navigation</Dialog.Title>
            <div className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setSection(item.id)
                    setShowMobileNav(false)
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm ${section === item.id ? 'bg-[var(--primary)] text-white' : 'hover:bg-slate-100'}`}
                >
                  <item.icon size={16} />
                  {item.label}
                </button>
              ))}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}

function hasRowsForReport(
  report: ReportKey,
  statementRows: Record<string, unknown>[],
  monthlyCollectionRows: Record<string, unknown>[],
  arrearsRows: Record<string, unknown>[],
  rentRollRows: Record<string, unknown>[],
  depositRows: Record<string, unknown>[],
  expenseRows: Record<string, unknown>[],
  monthlyProfitLossRows: Record<string, unknown>[],
) {
  if (report === 'Statement of Account') return statementRows.length > 0
  if (report === 'Monthly P&L') return monthlyProfitLossRows.length > 0
  if (report === 'Monthly Cash Collection') return monthlyCollectionRows.length > 0
  if (report === 'Arrears / Late Collection Aging') return arrearsRows.length > 0
  if (report === 'Rent Roll & Tenancy Status') return rentRollRows.length > 0
  if (report === 'Deposit Register') return depositRows.length > 0
  if (report === 'Expense & Depreciation Schedule') return expenseRows.length > 0
  return true
}

function exportActiveReportCsv(
  report: ReportKey,
  statementRows: Record<string, unknown>[],
  monthlyCollectionRows: Record<string, unknown>[],
  arrearsRows: Record<string, unknown>[],
  rentRollRows: Record<string, unknown>[],
  depositRows: Record<string, unknown>[],
  expenseRows: Record<string, unknown>[],
  cashAccount: Record<string, unknown>,
  monthlyProfitLossRows: Record<string, unknown>[],
) {
  if (report === 'Statement of Account') return triggerCsvDownload('statement-of-account.csv', statementRows)
  if (report === 'Monthly P&L') return triggerCsvDownload('monthly-profit-loss.csv', monthlyProfitLossRows)
  if (report === 'Monthly Cash Collection')
    return triggerCsvDownload('monthly-cash-collection.csv', monthlyCollectionRows)
  if (report === 'Arrears / Late Collection Aging') return triggerCsvDownload('arrears-aging.csv', arrearsRows)
  if (report === 'Rent Roll & Tenancy Status') return triggerCsvDownload('rent-roll-tenancy-status.csv', rentRollRows)
  if (report === 'Deposit Register') return triggerCsvDownload('deposit-register.csv', depositRows)
  if (report === 'Expense & Depreciation Schedule')
    return triggerCsvDownload('expense-depreciation-schedule.csv', expenseRows)
  if (report === 'Cash Account') return triggerCsvDownload('cash-account.csv', [cashAccount])
  return undefined
}

function exportActiveReportPdf(
  report: ReportKey,
  statementRows: Record<string, unknown>[],
  monthlyCollectionRows: Record<string, unknown>[],
  arrearsRows: Record<string, unknown>[],
  rentRollRows: Record<string, unknown>[],
  depositRows: Record<string, unknown>[],
  expenseRows: Record<string, unknown>[],
  cashAccount: Record<string, unknown>,
  monthlyProfitLossRows: Record<string, unknown>[],
) {
  if (report === 'Statement of Account') return triggerPdfPrint('Statement of Account', statementRows)
  if (report === 'Monthly P&L') return triggerPdfPrint('Monthly P&L', monthlyProfitLossRows)
  if (report === 'Monthly Cash Collection') return triggerPdfPrint('Monthly Cash Collection', monthlyCollectionRows)
  if (report === 'Arrears / Late Collection Aging')
    return triggerPdfPrint('Arrears / Late Collection Aging', arrearsRows)
  if (report === 'Rent Roll & Tenancy Status') return triggerPdfPrint('Rent Roll & Tenancy Status', rentRollRows)
  if (report === 'Deposit Register') return triggerPdfPrint('Deposit Register', depositRows)
  if (report === 'Expense & Depreciation Schedule')
    return triggerPdfPrint('Expense & Depreciation Schedule', expenseRows)
  if (report === 'Cash Account') return triggerPdfPrint('Cash Account', [cashAccount])
  return undefined
}



function ReportRunnerWorkspace({
  activeReport,
  reportPropertyId,
  reportTenantId,
  reportTenancyId,
  reportStatus,
  reportPropertyType,
  reportTenancyStatus,
  reportAgingBucket,
  reportFrom,
  reportTo,
  reportMonth,
  reportAsOfDate,
  reportPropertyOptions,
  reportTenantOptions,
  reportTenancyOptions,
  statementRows,
  monthlyCollectionRows,
  arrearsRows,
  rentRollRows,
  depositRows,
  expenseRows,
  cashAccount,
  monthlyProfitLossRows,
  onReportChange,
  onPropertyChange,
  onTenantChange,
  onTenancyChange,
  onStatusChange,
  onPropertyTypeChange,
  onTenancyStatusChange,
  onAgingBucketChange,
  onFromChange,
  onToChange,
  onMonthChange,
  onAsOfDateChange,
  onRunReport,
  onExportCsv,
  onExportPdf,
  onOwnerPacket,
}: {
  activeReport: ReportKey
  reportPropertyId: string
  reportTenantId: string
  reportTenancyId: string
  reportStatus: string
  reportPropertyType: string
  reportTenancyStatus: string
  reportAgingBucket: string
  reportFrom: string
  reportTo: string
  reportMonth: string
  reportAsOfDate: string
  reportPropertyOptions: { label: string; value: string }[]
  reportTenantOptions: { label: string; value: string }[]
  reportTenancyOptions: { label: string; value: string }[]
  statementRows: Record<string, unknown>[]
  monthlyCollectionRows: Record<string, unknown>[]
  arrearsRows: Record<string, unknown>[]
  rentRollRows: Record<string, unknown>[]
  depositRows: Record<string, unknown>[]
  expenseRows: Record<string, unknown>[]
  cashAccount: Record<string, unknown>
  monthlyProfitLossRows: Record<string, unknown>[]
  onReportChange: (value: ReportKey) => void
  onPropertyChange: (value: string) => void
  onTenantChange: (value: string) => void
  onTenancyChange: (value: string) => void
  onStatusChange: (value: string) => void
  onPropertyTypeChange: (value: string) => void
  onTenancyStatusChange: (value: string) => void
  onAgingBucketChange: (value: string) => void
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
  onMonthChange: (value: string) => void
  onAsOfDateChange: (value: string) => void
  onRunReport: (report: ReportKey) => void
  onExportCsv: (report: ReportKey) => void
  onExportPdf: (report: ReportKey) => void
  onOwnerPacket: () => void
}) {
  const reportOptions: ReportKey[] = [
    'Statement of Account',
    'Monthly P&L',
    'Cash Account',
    'Monthly Cash Collection',
    'Arrears / Late Collection Aging',
    'Rent Roll & Tenancy Status',
    'Deposit Register',
    'Expense & Depreciation Schedule',
  ]
  const reportPropertyLabel = reportPropertyOptions.find((option) => option.value === reportPropertyId)?.label || 'All properties'
  const reportTenantLabel = reportTenantOptions.find((option) => option.value === reportTenantId)?.label || 'All tenants'
  const reportTenancyLabel = reportTenancyOptions.find((option) => option.value === reportTenancyId)?.label || 'All tenancies'

  const handleResetFilters = () => {
    onPropertyChange('')
    onTenantChange('')
    onTenancyChange('')
    onStatusChange('')
    onPropertyTypeChange('')
    onTenancyStatusChange('')
    onAgingBucketChange('')
    onFromChange('')
    onToChange('')
    onMonthChange('')
    onAsOfDateChange('')
  }

  const getActiveReportRows = (): Record<string, unknown>[] => {
    switch (activeReport) {
      case 'Statement of Account':
        return statementRows
      case 'Monthly Cash Collection':
        return monthlyCollectionRows
      case 'Arrears / Late Collection Aging':
        return arrearsRows
      case 'Rent Roll & Tenancy Status':
        return rentRollRows
      case 'Deposit Register':
        return depositRows
      case 'Expense & Depreciation Schedule':
        return expenseRows
      case 'Cash Account':
        return [cashAccount]
      case 'Monthly P&L':
        return monthlyProfitLossRows
      default:
        return []
    }
  }

  const allRows = getActiveReportRows()
  const previewRows = allRows.slice(0, 5)

  return (
    <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
      <div className="grid min-h-[calc(100vh-21rem)] xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200/80 bg-slate-50/70 p-5 xl:border-b-0 xl:border-r">
          <div className="space-y-4 xl:sticky xl:top-5">
            <div className="inline-flex rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">
              Run Reports
            </div>
            <div>
              <h3 className="text-xl font-semibold tracking-tight text-slate-950">Report controls</h3>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                Choose the report first, then scope it by property, tenancy, date range, or aging bucket.
              </p>
            </div>

            <LabeledSelect
              label="Report"
              value={activeReport}
              onChange={(value) => onReportChange(value as ReportKey)}
              options={reportOptions}
            />
            <LabeledSelect
              label="Property"
              value={reportPropertyId}
              onChange={onPropertyChange}
              options={reportPropertyOptions}
              placeholder="All properties"
            />
            <LabeledSelect
              label="Tenant"
              value={reportTenantId}
              onChange={onTenantChange}
              options={reportTenantOptions}
              placeholder="All tenants"
            />
            <LabeledSelect
              label="Tenancy"
              value={reportTenancyId}
              onChange={onTenancyChange}
              options={reportTenancyOptions}
              placeholder="All tenancies"
            />
            <LabeledSelect
              label="Status"
              value={reportStatus}
              onChange={onStatusChange}
              options={['', 'Paid', 'Unpaid', 'Partial', 'Late']}
              placeholder="All statuses"
            />
            <LabeledSelect
              label="Property Type"
              value={reportPropertyType}
              onChange={onPropertyTypeChange}
              options={['', 'Highrise', 'Landed']}
              placeholder="All types"
            />
            <LabeledSelect
              label="Tenancy Status"
              value={reportTenancyStatus}
              onChange={onTenancyStatusChange}
              options={['', 'Active', 'Expiring', 'Late Collection', 'Closed Early', 'Expired']}
              placeholder="All tenancy statuses"
            />
            <LabeledSelect
              label="Aging Bucket"
              value={reportAgingBucket}
              onChange={onAgingBucketChange}
              options={['', '0-30', '31-60', '61-90', '>90']}
              placeholder="All buckets"
            />
            <LabeledInput label="Date From" value={reportFrom} onChange={onFromChange} type="date" />
            <LabeledInput label="Date To" value={reportTo} onChange={onToChange} type="date" />
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Period</span>
              <input
                type="month"
                value={reportMonth}
                onChange={(event) => onMonthChange(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none ring-[var(--primary)] focus:ring-2"
              />
            </label>
            <LabeledInput label="As Of Date" value={reportAsOfDate} onChange={onAsOfDateChange} type="date" />

            <div className="grid gap-2">
              <button
                onClick={() => onRunReport(activeReport)}
                className="rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-[var(--primary-dark)]"
              >
                Run report
              </button>
              <button
                onClick={onOwnerPacket}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Monthly owner packet
              </button>
              <button
                onClick={handleResetFilters}
                className="text-xs text-slate-500 hover:text-slate-900 transition-colors font-medium mt-1 text-center hover:underline focus:outline-none"
              >
                Reset all filters
              </button>
            </div>
          </div>
        </aside>

        <div className="min-w-0 p-5">
          <div className="flex flex-col gap-4">
            <div className="rounded-[28px] border border-slate-200 bg-slate-50/60 p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Selected report</p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{activeReport}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onRunReport(activeReport)}
                    className="rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[var(--primary-dark)]"
                  >
                    Run report
                  </button>
                  <button
                    onClick={() => onExportCsv(activeReport)}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={() => onExportPdf(activeReport)}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Print PDF
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">Active Filters:</span>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                  Property: {reportPropertyLabel}
                </span>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                  Tenant: {reportTenantLabel}
                </span>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                  Tenancy: {reportTenancyLabel}
                </span>
                {reportMonth && (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                    Period: {reportMonth}
                  </span>
                )}
                {reportStatus && (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                    Status: {reportStatus}
                  </span>
                )}
                {reportAsOfDate && (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                    As Of: {reportAsOfDate}
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <h4 className="text-base font-semibold text-slate-900">Live Preview</h4>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                    {allRows.length} {allRows.length === 1 ? 'row' : 'rows'}
                  </span>
                </div>
                {allRows.length > 5 && (
                  <span className="text-xs text-slate-400 font-medium">
                    Showing first 5 rows
                  </span>
                )}
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-150">
                {allRows.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-slate-50/50">
                    <p className="text-sm font-medium text-slate-500">No report data matches the current filters.</p>
                    <p className="text-xs text-slate-400 mt-1">Adjust controls in the sidebar or check if there is data in this range.</p>
                  </div>
                ) : (
                  <ObjectTable data={previewRows} sortable={false} />
                )}
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-slate-400 font-medium italic">
                  Note: The preview table shows raw workbook records. Run the report to view the fully styled sheet layout.
                </span>
                <button
                  onClick={() => onRunReport(activeReport)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-50 border border-cyan-150 px-4 py-2 text-sm font-semibold text-cyan-800 shadow-sm transition-all hover:bg-cyan-100/80 hover:text-cyan-900"
                >
                  Open full report →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function ReportGroup({
  title,
  cards,
  onRun,
  onExportCsv,
  onExportPdf,
}: {
  title: string
  cards: { title: ReportKey; description: string }[]
  onRun: (report: ReportKey) => void
  onExportCsv: (report: ReportKey) => void
  onExportPdf: (report: ReportKey) => void
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            Open a report directly, or export the same scope without losing the current filter context.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div key={card.title} className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-base font-semibold text-slate-950">{card.title}</p>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{card.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => onRun(card.title)}
                className="rounded-full bg-[var(--primary)] px-3 py-2 text-xs font-medium text-white hover:bg-[var(--primary-dark)]"
              >
                Run report
              </button>
              <button
                onClick={() => onExportCsv(card.title)}
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Export CSV
              </button>
              <button
                onClick={() => onExportPdf(card.title)}
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Print PDF
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function ReportBody({
  activeReport,
  statementRows,
  monthlyCollectionRows,
  arrearsRows,
  rentRollRows,
  depositRows,
  expenseRows,
  cashAccount,
  monthlyProfitLossRows,
  includePaidAccounts,
  onToggleIncludePaid,
}: {
  activeReport: ReportKey
  statementRows: Record<string, unknown>[]
  monthlyCollectionRows: Record<string, unknown>[]
  arrearsRows: Record<string, unknown>[]
  rentRollRows: Record<string, unknown>[]
  depositRows: Record<string, unknown>[]
  expenseRows: Record<string, unknown>[]
  cashAccount: Record<string, unknown>
  monthlyProfitLossRows: Record<string, unknown>[]
  includePaidAccounts: boolean
  onToggleIncludePaid: () => void
}) {
  if (activeReport === 'Monthly P&L')
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <PanelSummary label="View" value="Workbook close" tone="accent" />
          <PanelSummary label="Rows" value={String(monthlyProfitLossRows.length)} />
          <PanelSummary label="Scope" value="Formula-driven" />
        </div>
        <div className="overflow-auto rounded-[24px] border border-slate-200">
          <ObjectTable data={monthlyProfitLossRows} wrapCells />
        </div>
      </div>
    )
  if (activeReport === 'Cash Account')
    return (
      <div className="overflow-auto rounded-[24px] border border-slate-200">
        <ObjectTable data={[cashAccount]} wrapCells />
      </div>
    )
  if (activeReport === 'Statement of Account')
    return (
      <div className="overflow-auto rounded-[24px] border border-slate-200">
        <ObjectTable data={statementRows} />
      </div>
    )
  if (activeReport === 'Monthly Cash Collection')
    return (
      <div className="overflow-auto rounded-[24px] border border-slate-200">
        <ObjectTable data={monthlyCollectionRows} />
      </div>
    )
  if (activeReport === 'Arrears / Late Collection Aging') {
    return (
      <div className="space-y-3">
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={includePaidAccounts} onChange={onToggleIncludePaid} />
          Include paid accounts
        </label>
        <div className="overflow-auto rounded-[24px] border border-slate-200">
          <ObjectTable data={arrearsRows} />
        </div>
      </div>
    )
  }
  if (activeReport === 'Rent Roll & Tenancy Status')
    return (
      <div className="overflow-auto rounded-[24px] border border-slate-200">
        <ObjectTable data={rentRollRows} />
      </div>
    )
  if (activeReport === 'Deposit Register')
    return (
      <div className="overflow-auto rounded-[24px] border border-slate-200">
        <ObjectTable data={depositRows} />
      </div>
    )
  return (
    <div className="overflow-auto rounded-[24px] border border-slate-200">
      <ObjectTable data={expenseRows} />
    </div>
  )
}

function ObjectTable({
  data,
  sortable = true,
  wrapCells = false,
}: {
  data: Record<string, unknown>[]
  sortable?: boolean
  wrapCells?: boolean
}) {
  const headers = useMemo(() => (data.length ? Object.keys(data[0]) : []), [data])
  const [sortBy, setSortBy] = useState<string>('')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const effectiveSort = sortable ? (sortBy && headers.includes(sortBy) ? sortBy : headers[0]) : ''
  const sortedData = useMemo(() => {
    if (!effectiveSort) return data
    const rows = [...data]
    rows.sort((a, b) => {
      const av = a[effectiveSort]
      const bv = b[effectiveSort]
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av
      }
      const as = String(av ?? '')
      const bs = String(bv ?? '')
      return sortDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as)
    })
    return rows
  }, [data, effectiveSort, sortDir])

  if (!data.length) {
    return <p className="text-sm text-[var(--muted)]">No report data for current filters.</p>
  }

  const toggleSort = (header: string) => {
    if (effectiveSort !== header) {
      setSortBy(header)
      setSortDir('asc')
      return
    }
    setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
  }

  return (
    <div className="overflow-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 bg-slate-50 text-left">
          <tr>
            {headers.map((header) => (
              <th key={header} className="whitespace-nowrap px-3 py-2 capitalize">
                <button
                  onClick={() => toggleSort(header)}
                  className="inline-flex items-center gap-1 hover:text-slate-900"
                  disabled={!sortable}
                >
                  {header}
                  {sortable && effectiveSort === header ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, index) => (
            <tr key={index} className="border-t border-slate-100">
              {headers.map((header) => {
                const value = row[header]
                const display = typeof value === 'number' ? value.toFixed(2) : String(value ?? '-')
                return (
                  <td key={header} className={`${wrapCells ? 'whitespace-normal' : 'whitespace-nowrap'} px-3 py-2`}>
                    {display}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TenantWorkspace({
  state,
  tenancies,
  selectedTenancy,
  selectedTenancyId,
  activeCount,
  needsActionCount,
  lateCount,
  expiringCount,
  queue,
  periodMonth,
  collectionAmount,
  collectionDate,
  activityType,
  activityNotes,
  onQueueChange,
  onPeriodMonthChange,
  onCollectionAmountChange,
  onCollectionDateChange,
  onActivityTypeChange,
  onActivityNotesChange,
  onSelectTenancy,
  onCloseEarly,
  onRecordCollection,
  onLogActivity,
  onPrepareRenewal,
  onOpenTenantReport,
}: {
  state: RentalSystemState
  tenancies: Tenancy[]
  selectedTenancy: Tenancy | null
  selectedTenancyId: string | null
  activeCount: number
  needsActionCount: number
  lateCount: number
  expiringCount: number
  queue: TenantDeskQueue
  periodMonth: string
  collectionAmount: string
  collectionDate: string
  activityType: TenantActivityType
  activityNotes: string
  onQueueChange: (filter: TenantDeskQueue) => void
  onPeriodMonthChange: (value: string) => void
  onCollectionAmountChange: (value: string) => void
  onCollectionDateChange: (value: string) => void
  onActivityTypeChange: (value: TenantActivityType) => void
  onActivityNotesChange: (value: string) => void
  onSelectTenancy: (tenancyId: string) => void
  onCloseEarly: (tenancyId: string) => void
  onRecordCollection: (tenancy: Tenancy | null) => void
  onLogActivity: (tenancyId: string, type: TenantActivityType, notes: string) => void
  onPrepareRenewal: (tenancy: Tenancy | null) => void
  onOpenTenantReport: (report: ReportKey, tenancy: Tenancy | null) => void
}) {
  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.85fr)]">
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Tenant Desk</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Work late collections, renewals, and tenant follow-up from one operational queue.
            </p>
          </div>
          <label className="block min-w-40">
            <span className="mb-1 block text-xs text-[var(--muted)]">Operating month</span>
            <input
              type="month"
              value={periodMonth}
              onChange={(event) => onPeriodMonthChange(event.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-[var(--primary)] focus:ring-2"
            />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <KpiCard label="Needs Action" value={String(needsActionCount)} helper="Late or expiring" tone="late" />
          <KpiCard label="Total Active Tenants" value={String(activeCount)} helper="Open leases" />
          <KpiCard label="Overdue Collections" value={String(lateCount)} helper="Action required" tone="late" />
          <KpiCard label="Expiring in 30 Days" value={String(expiringCount)} helper="Renewals pending" />
        </div>

        <div className="flex flex-wrap gap-2">
          {(['Needs action', 'Late collection', 'Renewals', 'All tenancies'] as TenantDeskQueue[]).map((item) => (
            <button
              key={item}
              onClick={() => onQueueChange(item)}
              className={`rounded-lg border px-3 py-2 text-sm ${
                queue === item ? 'border-[var(--primary)] bg-cyan-50 text-cyan-900' : 'border-slate-200 bg-white'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Tenant</th>
                <th className="px-4 py-3">Property / Unit</th>
                <th className="px-4 py-3">Balance / Days Late</th>
                <th className="px-4 py-3">Lease Expiry</th>
                <th className="px-4 py-3">Next Action</th>
                <th className="px-4 py-3">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {tenancies.map((tenancy) => {
                const tenant = getTenantForTenancy(state, tenancy)
                const property = getPropertyForTenancy(state, tenancy)
                const status = getTenancyDisplayStatus(tenancy)
                const actionStatus = getTenancyActionStatus(state, tenancy, periodMonth)
                const ledger = getTenantLedgerSnapshot(state, tenancy, periodMonth)
                const nextAction = getNextTenantAction(state, tenancy, periodMonth)
                const lastActivity = getLastTenantActivity(state, tenancy.id)
                const isSelected = selectedTenancyId === tenancy.id
                return (
                  <tr
                    key={tenancy.id}
                    onClick={() => onSelectTenancy(tenancy.id)}
                    className={`cursor-pointer border-t border-slate-100 transition ${
                      isSelected
                        ? 'bg-slate-100'
                        : status === 'Late'
                          ? 'bg-red-50/70 hover:bg-red-50'
                          : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="px-4 py-4">
                      <PriorityBadge status={actionStatus} />
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-950">{tenant?.name || 'Unknown tenant'}</p>
                      <p className="text-xs text-[var(--muted)]">{tenant?.mobile || '-'}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p>{property?.projectName || property?.address.streetAddress || '-'}</p>
                      <p className="text-xs text-[var(--muted)]">
                        Unit {property?.unitLabel || property?.address.unitNumber || '-'}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-slate-900">{currency(ledger.outstandingAmount)}</p>
                      <p className="text-xs text-[var(--muted)]">{ledger.daysLate} days late</p>
                    </td>
                    <td className="px-4 py-4 text-slate-700">{formatDate(tenancy.expirationDate)}</td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <StatusBadge status={status} />
                        <p className="text-xs text-[var(--muted)]">{nextAction}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-[var(--muted)]">
                      {lastActivity ? `${formatDate(lastActivity.date)} · ${lastActivity.type}` : 'No activity logged'}
                    </td>
                  </tr>
                )
              })}
              {!tenancies.length && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[var(--muted)]">
                    No tenancies match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TenantInspector
        state={state}
        tenancy={selectedTenancy}
        periodMonth={periodMonth}
        collectionAmount={collectionAmount}
        collectionDate={collectionDate}
        activityType={activityType}
        activityNotes={activityNotes}
        onCollectionAmountChange={onCollectionAmountChange}
        onCollectionDateChange={onCollectionDateChange}
        onActivityTypeChange={onActivityTypeChange}
        onActivityNotesChange={onActivityNotesChange}
        onCloseEarly={onCloseEarly}
        onRecordCollection={onRecordCollection}
        onLogActivity={onLogActivity}
        onPrepareRenewal={onPrepareRenewal}
        onOpenTenantReport={onOpenTenantReport}
      />
    </section>
  )
}

function TenantInspector({
  state,
  tenancy,
  periodMonth,
  collectionAmount,
  collectionDate,
  activityType,
  activityNotes,
  onCollectionAmountChange,
  onCollectionDateChange,
  onActivityTypeChange,
  onActivityNotesChange,
  onCloseEarly,
  onRecordCollection,
  onLogActivity,
  onPrepareRenewal,
  onOpenTenantReport,
}: {
  state: RentalSystemState
  tenancy: Tenancy | null
  periodMonth: string
  collectionAmount: string
  collectionDate: string
  activityType: TenantActivityType
  activityNotes: string
  onCollectionAmountChange: (value: string) => void
  onCollectionDateChange: (value: string) => void
  onActivityTypeChange: (value: TenantActivityType) => void
  onActivityNotesChange: (value: string) => void
  onCloseEarly: (tenancyId: string) => void
  onRecordCollection: (tenancy: Tenancy | null) => void
  onLogActivity: (tenancyId: string, type: TenantActivityType, notes: string) => void
  onPrepareRenewal: (tenancy: Tenancy | null) => void
  onOpenTenantReport: (report: ReportKey, tenancy: Tenancy | null) => void
}) {
  if (!tenancy) {
    return (
      <aside className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm text-[var(--muted)]">Select a tenancy to view tenant details.</p>
      </aside>
    )
  }

  const tenant = getTenantForTenancy(state, tenancy)
  const property = getPropertyForTenancy(state, tenancy)
  const status = getTenancyDisplayStatus(tenancy)
  const nextAction = getNextTenantAction(state, tenancy, periodMonth)
  const ledger = getTenantLedgerSnapshot(state, tenancy, periodMonth)
  const sstEstimate = tenancy.rentalTerms.serviceFeeDeduction * 0.08
  const activities = state.tenantActivities
    .filter((activity) => activity.tenancyId === tenancy.id)
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-2xl font-semibold text-slate-950">{tenant?.name || 'Unknown tenant'}</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {property?.projectName || property?.address.streetAddress || '-'}, {property?.unitLabel || property?.address.unitNumber || '-'}
            </p>
          </div>
          <div className="space-y-2 text-right">
            <StatusBadge status={status} />
            <p className="text-xs text-[var(--muted)]">Next: {nextAction}</p>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="grid gap-3 xl:grid-cols-2">
          <DataBlock label="Outstanding This Month" value={currency(ledger.outstandingAmount)} />
          <DataBlock label="Lease Expiry" value={formatDate(tenancy.expirationDate)} />
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</p>
          <div className="grid gap-3">
            <div className="grid gap-3 lg:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs text-[var(--muted)]">Collection amount</span>
                <input
                  type="number"
                  min={0}
                  value={collectionAmount}
                  onChange={(event) => onCollectionAmountChange(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-[var(--primary)] focus:ring-2"
                />
              </label>
              <LabeledInput label="Collection date" value={collectionDate} onChange={onCollectionDateChange} type="date" />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                disabled={!collectionAmount || Number(collectionAmount) <= 0}
                onClick={() => onRecordCollection(tenancy)}
                className="rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Record collection
              </button>
              <button
                onClick={() => onPrepareRenewal(tenancy)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
              >
                Prepare renewal
              </button>
              <button
                onClick={() => onOpenTenantReport('Statement of Account', tenancy)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
              >
                Statement of Account
              </button>
              <button
                onClick={() => onOpenTenantReport('Arrears / Late Collection Aging', tenancy)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
              >
                Arrears Aging
              </button>
            </div>
            <LabeledSelect
              label="Activity type"
              value={activityType}
              onChange={(value) => onActivityTypeChange(value as TenantActivityType)}
              options={['Collection', 'Reminder', 'Renewal', 'Note', 'Termination']}
            />
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--muted)]">Activity notes</span>
              <textarea
                value={activityNotes}
                onChange={(event) => onActivityNotesChange(event.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-[var(--primary)] focus:ring-2"
              />
            </label>
            <button
              disabled={!activityNotes.trim()}
              onClick={() => onLogActivity(tenancy.id, activityType, activityNotes)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Log follow-up
            </button>
          </div>
        </div>

        <Tabs.Root defaultValue="summary">
          <Tabs.List className="mb-4 flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
            {['summary', 'ledger', 'lease', 'utilities', 'activity'].map((tab) => (
              <Tabs.Trigger
                key={tab}
                value={tab}
                className="rounded-lg px-3 py-1.5 text-sm capitalize data-[state=active]:bg-white"
              >
                {tab}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <Tabs.Content value="summary" className="rounded-xl border border-slate-200 p-4">
            <div className="grid gap-4 text-sm xl:grid-cols-2">
              <DataLine label="Passport / NRIC">{tenant?.nricPassport || '-'}</DataLine>
              <DataLine label="Mobile">{tenant?.mobile || '-'}</DataLine>
              <DataLine label="Email">{tenant?.email || '-'}</DataLine>
              <DataLine label="Deposit">{currency(tenancy.rentalTerms.rentalDeposit)}</DataLine>
              <DataLine label="Monthly Gross Rent">{currency(tenancy.rentalTerms.monthlyGross)}</DataLine>
              <DataLine label="Monthly Net Rent">{currency(tenancy.rentalTerms.monthlyNet)}</DataLine>
            </div>
          </Tabs.Content>

          <Tabs.Content value="ledger" className="rounded-xl border border-slate-200 p-4">
            <div className="space-y-2 text-sm">
              <DataLine label="Expected for period">{currency(ledger.expectedAmount)}</DataLine>
              <DataLine label="Collected">{currency(ledger.amountCollected)}</DataLine>
              <DataLine label="Outstanding">{currency(ledger.outstandingAmount)}</DataLine>
              <DataLine label="Expected collection date">{formatDate(ledger.expectedDate)}</DataLine>
              <DataLine label="Actual collection date">{formatDate(ledger.actualDate)}</DataLine>
              <DataLine label="Remitted date">{formatDate(ledger.remittedDate)}</DataLine>
              <DataLine label="Admin Fee / Service">{currency(tenancy.rentalTerms.serviceFeeDeduction)}</DataLine>
              <DataLine label="SST (8%)">{currency(sstEstimate)}</DataLine>
            </div>
          </Tabs.Content>

          <Tabs.Content value="lease" className="rounded-xl border border-slate-200 p-4">
            <div className="space-y-3">
              <TimelineItem label="Commencement" value={formatDate(tenancy.commencementDate)} />
              <TimelineItem label="Key Collection" value={formatDate(tenancy.keyCollectionDate)} />
              <TimelineItem label="Move-in Date" value={formatDate(tenancy.moveInDate)} active />
              <TimelineItem label="Expiry" value={formatDate(tenancy.expirationDate)} muted />
              <DataLine label="Tenure">{tenancy.tenure || '-'}</DataLine>
            </div>
          </Tabs.Content>

          <Tabs.Content value="utilities" className="rounded-xl border border-slate-200 p-4">
            <div className="space-y-2">
              <UtilityRow code="TNB" label="Electricity" value={tenancy.tnbAccount} />
              <UtilityRow code="AIR" label="Air Selangor" value={tenancy.airSelangorAccount} />
              <UtilityRow code="TM" label="Internet" value={tenancy.tmAccount} />
            </div>
          </Tabs.Content>

          <Tabs.Content value="activity" className="rounded-xl border border-slate-200 p-4">
            <div className="space-y-3">
              {activities.map((activity) => (
                <div key={activity.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-slate-950">{activity.type}</p>
                    <p className="text-xs text-[var(--muted)]">{formatDate(activity.date)}</p>
                  </div>
                  <p className="mt-1 text-[var(--muted)]">{activity.notes}</p>
                </div>
              ))}
              {!activities.length && <p className="text-sm text-[var(--muted)]">No activity logged yet.</p>}
            </div>
          </Tabs.Content>
        </Tabs.Root>
      </div>

      <div className="border-t border-slate-200 p-5">
        <button
          disabled={tenancy.closedEarly}
          onClick={() => onCloseEarly(tenancy.id)}
          className="w-full rounded-xl border border-red-300 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {tenancy.closedEarly ? 'Tenancy Closed Early' : 'Close early'}
        </button>
      </div>
    </aside>
  )
}

function KpiCard({
  label,
  value,
  helper,
  tone = 'default',
}: {
  label: string
  value: string
  helper: string
  tone?: 'default' | 'late'
}) {
  return (
    <div className={`rounded-2xl border p-4 ${tone === 'late' ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${tone === 'late' ? 'text-red-700' : 'text-slate-500'}`}>{label}</p>
      <div className="mt-5 flex items-end gap-2">
        <p className={`text-4xl font-semibold ${tone === 'late' ? 'text-red-700' : 'text-slate-950'}`}>{value}</p>
        <p className="pb-1 text-sm text-[var(--muted)]">{helper}</p>
      </div>
    </div>
  )
}

function PriorityBadge({
  status,
}: {
  status: ReturnType<typeof getTenancyActionStatus>
}) {
  const classes = {
    'Needs Action': 'bg-red-50 text-red-700 border-red-200',
    'Late Collection': 'bg-red-100 text-red-800 border-red-200',
    Renewal: 'bg-amber-100 text-amber-800 border-amber-200',
    Closed: 'bg-slate-100 text-slate-700 border-slate-200',
    Current: 'bg-blue-100 text-blue-800 border-blue-200',
  }[status]

  return <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${classes}`}>{status}</span>
}

function StatusBadge({ status }: { status: ReturnType<typeof getTenancyDisplayStatus> }) {
  const classes = {
    Late: 'bg-red-100 text-red-800 border-red-200',
    Paid: 'bg-blue-100 text-blue-800 border-blue-200',
    Expiring: 'bg-amber-100 text-amber-800 border-amber-200',
    Closed: 'bg-slate-100 text-slate-700 border-slate-200',
  }[status]
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold ${classes}`}>
      {status === 'Paid' ? <Check size={13} /> : status === 'Late' ? <AlertTriangle size={13} /> : <BadgeDollarSign size={13} />}
      {status}
    </span>
  )
}

function TimelineItem({ label, value, active, muted }: { label: string; value: string; active?: boolean; muted?: boolean }) {
  return (
    <div className="grid grid-cols-[16px_1fr_auto] items-center gap-2 text-sm">
      <span className={`h-2.5 w-2.5 rounded-full ${active ? 'bg-[var(--primary)]' : muted ? 'bg-slate-200' : 'bg-slate-500'}`} />
      <span className={muted ? 'text-slate-400' : 'text-slate-700'}>{label}</span>
      <span className={muted ? 'text-slate-400' : 'font-medium text-slate-950'}>{value}</span>
    </div>
  )
}

function UtilityRow({ code, label, value }: { code: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
      <div className="flex items-center gap-3">
        <span className="rounded-md bg-slate-200 px-2 py-1 text-xs font-bold text-slate-700">{code}</span>
        <span>{label}</span>
      </div>
      <span className="font-medium text-slate-700">Acc: {value || '-'}</span>
    </div>
  )
}

function formatDate(date: string) {
  if (!date) return '-'
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed)
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Building2 }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-2 inline-flex rounded-lg bg-slate-100 p-2 text-slate-700">
        <Icon size={16} />
      </div>
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  )
}

function DataBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  )
}

function DataLine({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2">
      <span className="text-[var(--muted)]">{label}</span>
      <span>{children}</span>
    </div>
  )
}

function DataTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-100 p-2">
      <p className="text-[10px] text-[var(--muted)]">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}

function QuickButton({
  text,
  onClick,
  disabled,
}: {
  text: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {text}
    </button>
  )
}

function SectionCard({
  title,
  description,
  children,
  columnsClassName = 'md:grid-cols-2',
}: {
  title: string
  description?: string
  children: ReactNode
  columnsClassName?: string
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5 shadow-sm">
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
        {description && <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>}
      </div>
      <div className={`grid gap-4 ${columnsClassName}`}>{children}</div>
    </section>
  )
}

function InlineNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600 shadow-sm">
      {children}
    </div>
  )
}

function FieldError({ children }: { children: ReactNode }) {
  if (!children) return null
  return <p className="mt-1 text-xs font-medium text-rose-600">{children}</p>
}

function PanelSummary({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: string
  tone?: 'neutral' | 'accent'
}) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${tone === 'accent' ? 'border-cyan-200 bg-cyan-50' : 'border-slate-200 bg-white'}`}>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  )
}

function LabeledInput({
  label,
  value,
  onChange,
  type = 'text',
  helper,
  error,
  required,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'date'
  helper?: string
  error?: string
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-rose-500 ml-0.5 font-bold">*</span>}
      </span>
      {helper && <p className="mb-2 text-xs leading-5 text-slate-500">{helper}</p>}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-xl border bg-white px-3.5 py-3 text-sm outline-none transition ring-[var(--primary)] focus:ring-2 ${error ? 'border-rose-300' : 'border-slate-200'} `}
      />
      <FieldError>{error}</FieldError>
    </label>
  )
}

function MoneyInput({
  label,
  value,
  onChange,
  helper,
  error,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  helper?: string
  error?: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {helper && <p className="mb-2 text-xs leading-5 text-slate-500">{helper}</p>}
      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(Number(event.target.value || 0))}
        className={`w-full rounded-xl border bg-white px-3.5 py-3 text-sm outline-none transition ring-[var(--primary)] focus:ring-2 ${error ? 'border-rose-300' : 'border-slate-200'}`}
      />
      <FieldError>{error}</FieldError>
    </label>
  )
}

function LabeledSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  helper,
  error,
  required,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[] | { label: string; value: string }[]
  placeholder?: string
  helper?: string
  error?: string
  required?: boolean
}) {
  const values = options.map((item) =>
    typeof item === 'string' ? { label: item || placeholder || 'All', value: item } : item,
  )
  const hasEmptyOption = values.some((option) => option.value === '')
  const safeValue = value || (hasEmptyOption ? EMPTY_SELECT_VALUE : undefined)
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-rose-500 ml-0.5 font-bold">*</span>}
      </span>
      {helper && <p className="mb-2 text-xs leading-5 text-slate-500">{helper}</p>}
      <Select.Root
        value={safeValue}
        onValueChange={(nextValue) => onChange(nextValue === EMPTY_SELECT_VALUE ? '' : nextValue)}
      >
        <Select.Trigger className={`flex w-full items-center justify-between rounded-xl border bg-white px-3.5 py-3 text-sm outline-none ring-[var(--primary)] focus:ring-2 ${error ? 'border-rose-300' : 'border-slate-200'}`}>
          <Select.Value placeholder={placeholder || 'Select'} />
          <Select.Icon>
            <ChevronDown size={14} />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content className="z-30 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
            <Select.Viewport className="p-1">
              {values.map((option) => (
                <Select.Item
                  key={option.value || EMPTY_SELECT_VALUE}
                  value={option.value || EMPTY_SELECT_VALUE}
                  className="relative flex cursor-pointer select-none items-center rounded px-7 py-2 text-sm outline-none focus:bg-slate-100"
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator className="absolute left-2">
                    <Check size={14} />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
      <FieldError>{error}</FieldError>
    </label>
  )
}

function SaveButton({
  onClick,
  children,
  disabled,
  busy,
  busyLabel,
  error,
}: {
  onClick: () => void
  children: ReactNode
  disabled?: boolean
  busy?: boolean
  busyLabel?: string
  error?: string
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between w-full">
      <div className="min-h-5 text-sm">
        {error ? (
          <span className="text-rose-600 font-medium">{error}</span>
        ) : disabled && !busy ? (
          <span className="text-slate-400 italic text-xs">Please fill in all required fields (*) to enable save.</span>
        ) : null}
      </div>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={onClick}
        className="inline-flex items-center justify-center rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? busyLabel || 'Saving...' : children}
      </button>
    </div>
  )
}

export default App
