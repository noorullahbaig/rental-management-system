import React, { useState } from 'react'
import {
  Users,
  AlertTriangle,
  CalendarClock,
  DollarSign,
  FileText,
  Calendar,
  ExternalLink,
  Edit3,
  Trash2,
  Phone,
  Mail,
  Zap,
  Droplet,
  Wifi,
  ChevronRight,
  Plus,
  Send,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react'
import type { 
  RentalSystemState, 
  Tenancy, 
  Tenant, 
  TenantDeskQueue, 
  TenantActivityType, 
  ReportKey 
} from '../types'
import {
  getExpiringWithinDays,
  getLastTenantActivity,
  getNextTenantAction,
  getPropertyForTenancy,
  getTenancyActionStatus,
  getTenancyDisplayStatus,
  getTenantLedgerSnapshot,
  getTenantForTenancy,
} from '../selectors'

interface TenantWorkspaceProps {
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
  onEditTenant: (tenant: Tenant) => void
  onDeleteTenant: (tenantId: string) => void
  onEditTenancy: (tenancy: Tenancy) => void
  onDeleteTenancy: (tenancyId: string) => void
  onEditActivity: (activity: any) => void
}

type InspectorTab = 'actions' | 'ledger' | 'lease' | 'activity'

export default function TenantWorkspace({
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
  onEditTenant,
  onDeleteTenant,
  onEditTenancy,
  onDeleteTenancy,
  onEditActivity,
}: TenantWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<InspectorTab>('actions')

  const currency = (val: number) =>
    new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: 0 }).format(val || 0)

  const formatDate = (dateString: string) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-MY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  // Selected tenancy details
  const selectedTenant = selectedTenancy ? getTenantForTenancy(state, selectedTenancy) : null
  const selectedProperty = selectedTenancy ? getPropertyForTenancy(state, selectedTenancy) : null
  const selectedLedger = selectedTenancy ? getTenantLedgerSnapshot(state, selectedTenancy, periodMonth) : null
  const selectedStatus = selectedTenancy ? getTenancyDisplayStatus(selectedTenancy) : null
  const selectedNextAction = selectedTenancy ? getNextTenantAction(state, selectedTenancy, periodMonth) : null

  const activities = selectedTenancy
    ? state.tenantActivities
        .filter((a) => a.tenancyId === selectedTenancy.id)
        .sort((a, b) => b.date.localeCompare(a.date))
    : []

  return (
    <div className="grid gap-3.5 xl:grid-cols-[1.1fr_1.1fr] max-w-[1400px] h-[calc(100vh-140px)] min-h-[520px]">
      {/* LEFT PANEL: High-Density Operational Queue */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm flex flex-col overflow-hidden">
        {/* Top Control Bar: Queue Filter Pills & Month Picker */}
        <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-2">
          {/* Queue Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => onQueueChange('Needs action')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                queue === 'Needs action'
                  ? 'bg-white text-rose-700 shadow-sm'
                  : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              Needs Action ({needsActionCount})
            </button>
            <button
              type="button"
              onClick={() => onQueueChange('Late collection')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                queue === 'Late collection'
                  ? 'bg-white text-amber-800 shadow-sm'
                  : 'text-slate-600 hover:text-amber-700'
              }`}
            >
              Late ({lateCount})
            </button>
            <button
              type="button"
              onClick={() => onQueueChange('Renewals')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                queue === 'Renewals'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-indigo-700'
              }`}
            >
              Renewals ({expiringCount})
            </button>
            <button
              type="button"
              onClick={() => onQueueChange('All tenancies')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                queue === 'All tenancies'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({activeCount})
            </button>
          </div>

          {/* Compact Month Selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span>Month:</span>
            <input
              type="month"
              value={periodMonth}
              onChange={(e) => onPeriodMonthChange(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Operational Queue Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-100 sticky top-0 font-semibold z-10">
              <tr>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Tenant & Contact</th>
                <th className="px-3 py-2">Property / Unit</th>
                <th className="px-3 py-2">Balance</th>
                <th className="px-3 py-2">Lease Expiry</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenancies.map((tenancy) => {
                const tenant = getTenantForTenancy(state, tenancy)
                const property = getPropertyForTenancy(state, tenancy)
                const status = getTenancyDisplayStatus(tenancy)
                const actionStatus = getTenancyActionStatus(state, tenancy, periodMonth)
                const ledger = getTenantLedgerSnapshot(state, tenancy, periodMonth)
                const isSelected = selectedTenancyId === tenancy.id
                const isLate = status === 'Late' || ledger.daysLate > 0
                const nextAction = getNextTenantAction(state, tenancy, periodMonth)

                return (
                  <tr
                    key={tenancy.id}
                    onClick={() => onSelectTenancy(tenancy.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-indigo-50/80 font-medium'
                        : isLate
                          ? 'bg-amber-50/30 hover:bg-amber-50/60'
                          : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="px-3 py-2.5">
                      {isLate ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          Late ({ledger.daysLate}d)
                        </span>
                      ) : status === 'Expiring' ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                          Renewal
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-slate-900 truncate max-w-[130px]">{tenant?.name || 'Unknown'}</p>
                      <p className="text-[11px] text-slate-500">{tenant?.mobile || '—'}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-slate-800 truncate max-w-[140px]">
                        {property?.projectName || property?.address.streetAddress}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        Unit {property?.unitLabel || property?.address.unitNumber}
                      </p>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className={`font-semibold ${ledger.outstandingAmount > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
                        {currency(ledger.outstandingAmount)}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Gross {currency(tenancy.rentalTerms.monthlyGross)}
                      </p>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-mono text-[11px] text-slate-700">{formatDate(tenancy.expirationDate)}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{nextAction}</p>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="text-indigo-600 font-semibold text-[11px] inline-flex items-center gap-0.5">
                        Inspect <ChevronRight className="w-3 h-3" />
                      </span>
                    </td>
                  </tr>
                )
              })}
              {tenancies.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                    No tenancies match this filter queue.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RIGHT PANEL: Tenant 360 Inspector */}
      {selectedTenancy ? (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm flex flex-col overflow-hidden">
          {/* 1. Header Toolbar */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/40 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  {selectedTenant?.name || 'Tenant'}
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  selectedStatus === 'Late'
                    ? 'bg-amber-100 text-amber-800'
                    : selectedStatus === 'Expiring'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {selectedStatus}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {selectedProperty?.projectName ? `${selectedProperty.projectName} · ` : ''}
                Unit {selectedProperty?.unitLabel || selectedProperty?.address.unitNumber} ({selectedProperty?.serialNumber})
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              {selectedTenant && (
                <button
                  type="button"
                  onClick={() => onEditTenant(selectedTenant)}
                  className="flex items-center gap-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors"
                  title="Edit Tenant Contact"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit
                </button>
              )}
              <button
                type="button"
                disabled={selectedTenancy.closedEarly}
                onClick={() => onCloseEarly(selectedTenancy.id)}
                className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                title="Close Tenancy Early"
              >
                {selectedTenancy.closedEarly ? 'Closed' : 'Terminate'}
              </button>
            </div>
          </div>

          {/* 2. Compact Financial Strip */}
          <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 grid grid-cols-4 gap-2 text-center text-xs">
            <div>
              <p className="text-[10px] text-slate-400 font-medium">Outstanding</p>
              <p className={`font-bold ${selectedLedger && selectedLedger.outstandingAmount > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
                {selectedLedger ? currency(selectedLedger.outstandingAmount) : '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium">Monthly Gross</p>
              <p className="font-bold text-slate-800">{currency(selectedTenancy.rentalTerms.monthlyGross)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium">Deposit Held</p>
              <p className="font-bold text-slate-800">{currency(selectedTenancy.rentalTerms.rentalDeposit)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium">Lease Expiry</p>
              <p className="font-bold text-indigo-600">{formatDate(selectedTenancy.expirationDate)}</p>
            </div>
          </div>

          {/* 3. Segmented Navigation Tabs */}
          <div className="px-4 pt-3 border-b border-slate-100 flex items-center gap-2">
            {[
              { id: 'actions', label: 'Quick Collect & Reports' },
              { id: 'ledger', label: 'Payment Ledger' },
              { id: 'lease', label: 'Lease Terms & Utilities' },
              { id: 'activity', label: `Activity (${activities.length})` },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as InspectorTab)}
                className={`pb-2 px-1 text-xs font-bold border-b-2 transition-all ${
                  activeTab === t.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* 4. Tab Content (Scrollable if needed, strictly inside inspector) */}
          <div className="p-4 flex-1 overflow-y-auto">
            {/* TAB 1: Quick Collect & Reports */}
            {activeTab === 'actions' && (
              <div className="space-y-4">
                {/* Payment Entry Card */}
                <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Record Rent Collection</span>
                    <span className="text-[11px] text-slate-500">Manual / Bank Transfer</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Amount (MYR)</label>
                      <input
                        type="number"
                        min={0}
                        value={collectionAmount}
                        onChange={(e) => onCollectionAmountChange(e.target.value)}
                        placeholder={selectedTenancy.rentalTerms.monthlyGross.toString()}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Collection Date</label>
                      <input
                        type="date"
                        value={collectionDate}
                        onChange={(e) => onCollectionDateChange(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      disabled={!collectionAmount || Number(collectionAmount) <= 0}
                      onClick={() => onRecordCollection(selectedTenancy)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-sm transition-all disabled:opacity-50"
                    >
                      Record Collection
                    </button>
                    <button
                      type="button"
                      onClick={() => onPrepareRenewal(selectedTenancy)}
                      className="border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Prepare Renewal
                    </button>
                  </div>
                </div>

                {/* Direct Financial Reports Triggers */}
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">1-Click Tenant Statements</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenTenantReport('Statement of Account', selectedTenancy)}
                      className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-left transition-all"
                    >
                      <FileText className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-slate-900 leading-none">Statement of Account</p>
                        <p className="text-[10px] text-slate-500 mt-1">Tenant balance breakdown</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenTenantReport('Arrears / Late Collection Aging', selectedTenancy)}
                      className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-left transition-all"
                    >
                      <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-slate-900 leading-none">Arrears Aging Report</p>
                        <p className="text-[10px] text-slate-500 mt-1">Overdue aging buckets</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Follow-up Note Logger */}
                <div className="border-t border-slate-100 pt-3">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Log Follow-up / Reminder</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <select
                        value={activityType}
                        onChange={(e) => onActivityTypeChange(e.target.value as TenantActivityType)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 outline-none"
                      >
                        {['Reminder', 'Collection', 'Renewal', 'Note', 'Termination'].map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <span className="text-[11px] text-slate-400">Timestamp: Today</span>
                    </div>
                    <textarea
                      value={activityNotes}
                      onChange={(e) => onActivityNotesChange(e.target.value)}
                      placeholder="e.g. Spoke via WhatsApp; promised to transfer rent by Friday 5 PM..."
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
                    />
                    <div className="text-right">
                      <button
                        type="button"
                        disabled={!activityNotes.trim()}
                        onClick={() => onLogActivity(selectedTenancy.id, activityType, activityNotes)}
                        className="bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
                      >
                        Save Note
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Payment Ledger */}
            {activeTab === 'ledger' && selectedLedger && (
              <div className="space-y-3 text-xs">
                <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Expected for Period</span>
                    <span className="font-bold text-sm text-slate-900">{currency(selectedLedger.expectedAmount)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Amount Collected</span>
                    <span className="font-bold text-sm text-emerald-600">{currency(selectedLedger.amountCollected)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Expected Date</span>
                    <span className="font-medium text-slate-700">{formatDate(selectedLedger.expectedDate)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Actual Date Paid</span>
                    <span className="font-medium text-slate-700">{formatDate(selectedLedger.actualDate)}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-slate-500 text-[11px]">
                  <span>Admin Fee: <strong>{currency(selectedTenancy.rentalTerms.serviceFeeDeduction)}</strong></span>
                  <span>SST (8%): <strong>{currency(selectedTenancy.rentalTerms.serviceFeeDeduction * 0.08)}</strong></span>
                  <span>Net Remitted: <strong>{currency(selectedTenancy.rentalTerms.monthlyNet)}</strong></span>
                </div>
              </div>
            )}

            {/* TAB 3: Lease Terms & Utilities */}
            {activeTab === 'lease' && (
              <div className="space-y-4 text-xs">
                {/* Dates & Tenure */}
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Lease Timeline</h4>
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <div>
                      <span className="text-[10px] text-slate-400">Commencement</span>
                      <p className="font-semibold text-slate-800">{formatDate(selectedTenancy.commencementDate)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Key Collection</span>
                      <p className="font-semibold text-slate-800">{formatDate(selectedTenancy.keyCollectionDate)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Move-in Date</span>
                      <p className="font-semibold text-slate-800">{formatDate(selectedTenancy.moveInDate)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Expiration</span>
                      <p className="font-semibold text-indigo-600">{formatDate(selectedTenancy.expirationDate)}</p>
                    </div>
                  </div>
                </div>

                {/* Utility Meters */}
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Utility Accounts</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <span className="font-medium text-slate-700">TNB (Electricity)</span>
                      </div>
                      <span className="font-mono font-semibold text-slate-900">{selectedTenancy.tnbAccount || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
                      <div className="flex items-center gap-2">
                        <Droplet className="w-4 h-4 text-blue-500" />
                        <span className="font-medium text-slate-700">Air Selangor (Water)</span>
                      </div>
                      <span className="font-mono font-semibold text-slate-900">{selectedTenancy.airSelangorAccount || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
                      <div className="flex items-center gap-2">
                        <Wifi className="w-4 h-4 text-indigo-500" />
                        <span className="font-medium text-slate-700">Internet (TM / Unifi)</span>
                      </div>
                      <span className="font-mono font-semibold text-slate-900">{selectedTenancy.tmAccount || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Document & Media Attachments */}
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Documents & Condition Media</h4>
                  <div className="space-y-2">
                    {selectedTenancy.signedAgreementUrl ? (
                      <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
                        <span className="font-medium text-slate-700">Signed Tenancy Agreement</span>
                        <a
                          href={selectedTenancy.signedAgreementUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:underline flex items-center gap-1 font-semibold text-[11px]"
                        >
                          View Document <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ) : null}
                    {selectedTenancy.moveInPicturesUrl ? (
                      <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
                        <span className="font-medium text-slate-700">Move-in Condition Media</span>
                        <a
                          href={selectedTenancy.moveInPicturesUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:underline flex items-center gap-1 font-semibold text-[11px]"
                        >
                          View Media <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ) : null}
                    {selectedTenancy.moveOutPicturesUrl ? (
                      <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
                        <span className="font-medium text-slate-700">Move-out Condition Media</span>
                        <a
                          href={selectedTenancy.moveOutPicturesUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:underline flex items-center gap-1 font-semibold text-[11px]"
                        >
                          View Media <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ) : null}
                    {!selectedTenancy.signedAgreementUrl && !selectedTenancy.moveInPicturesUrl && !selectedTenancy.moveOutPicturesUrl && (
                      <p className="text-[11px] text-slate-400 italic">No agreements or media attachments linked yet.</p>
                    )}
                  </div>
                </div>

                {/* Lease & Tenant Record Controls */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onEditTenancy(selectedTenancy)}
                      className="flex items-center gap-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit Lease Terms
                    </button>
                    {selectedTenant && (
                      <button
                        type="button"
                        onClick={() => onDeleteTenant(selectedTenant.id)}
                        className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete Tenant
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteTenancy(selectedTenancy.id)}
                    className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Tenancy
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: Activity History */}
            {activeTab === 'activity' && (
              <div className="space-y-2.5 text-xs">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 relative group hover:bg-white hover:border-indigo-200 transition-all"
                  >
                    <div className="flex items-center justify-between mb-1 pr-6">
                      <span className="font-bold text-slate-900">{activity.type}</span>
                      <span className="text-[10px] text-slate-400">{formatDate(activity.date)}</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed pr-6">{activity.notes}</p>
                    <button
                      type="button"
                      onClick={() => onEditActivity(activity)}
                      className="absolute right-2.5 top-2.5 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 rounded transition-all"
                      title="Edit Activity"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {activities.length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    No activity or follow-ups logged for this tenant yet.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 flex items-center justify-center">
          Select a tenant from the queue to view full profile and ledger.
        </div>
      )}
    </div>
  )
}
