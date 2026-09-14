import React, { useEffect, useState } from 'react'
import { 
  Building2, 
  Users, 
  AlertTriangle, 
  CalendarClock, 
  DollarSign, 
  ClipboardCheck, 
  Wrench, 
  ArrowRight, 
  Plus, 
  FileText, 
  ExternalLink,
  ChevronRight
} from 'lucide-react'
import type { RentalSystemState } from '../types'
import { fetchDashboardStats } from '../api'

type Section = 'overview' | 'properties' | 'tenants' | 'reports'
type TenantDeskQueue = 'Needs action' | 'Late collection' | 'Renewals' | 'All tenancies'

interface AdminDashboardProps {
  state: RentalSystemState
  onNavigate: (section: Section) => void
  onSelectProperty: (propertyId: string) => void
  onFilterTenants: (queue: TenantDeskQueue) => void
  onOpenPropertyDrawer: () => void
  onOpenTenancyDrawer: () => void
  onOpenTenantDrawer: () => void
}

export default function AdminDashboard({
  state,
  onNavigate,
  onSelectProperty,
  onFilterTenants,
  onOpenPropertyDrawer,
  onOpenTenancyDrawer,
  onOpenTenantDrawer,
}: AdminDashboardProps) {
  const [opsData, setOpsData] = useState<any>(null)
  const [verifying, setVerifying] = useState<string | null>(null)

  useEffect(() => {
    loadOps()
  }, [])

  const loadOps = async () => {
    try {
      const data = await fetchDashboardStats()
      setOpsData(data)
    } catch (err) {
      console.error('Failed to load ops stats', err)
    }
  }

  const handleVerify = async (id: string) => {
    try {
      setVerifying(id)
      await fetch(`/api/payment-receipts/${id}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationStatus: 'VERIFIED' })
      })
      await loadOps()
    } catch (err) {
      console.error('Failed to verify receipt', err)
    } finally {
      setVerifying(null)
    }
  }

  // --- Derived Calculations from active state ---
  const totalProperties = state.properties.length
  const activeTenancies = state.tenancies.filter(
    (t) => !t.closedEarly && t.status !== 'Closed Early' && t.status !== 'Expired'
  )
  const occupancyRate = totalProperties > 0 ? Math.round((activeTenancies.length / totalProperties) * 100) : 0
  const monthlyGrossTotal = activeTenancies.reduce((sum, t) => sum + (t.rentalTerms.monthlyGross || 0), 0)
  const lateTenancies = state.tenancies.filter((t) => t.rentalTerms.lateCollectionFlag)
  
  // Expirations within next 60 days
  const now = new Date()
  const in60Days = new Date()
  in60Days.setDate(in60Days.getDate() + 60)
  const expiringTenancies = activeTenancies.filter((t) => {
    const exp = new Date(t.expirationDate)
    return exp <= in60Days && exp >= now
  })

  const pendingReceipts = opsData?.pendingReceipts || []
  const openMaintenance = opsData?.openMaintenance || []
  const totalTasks = pendingReceipts.length + openMaintenance.length

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: 0 }).format(val)

  return (
    <div className="space-y-3.5 max-w-[1400px]">
      {/* TIER 1: Interactive Metric Launchpads (1-Click Drilldown) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Properties */}
        <button
          type="button"
          onClick={() => onNavigate('properties')}
          className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Properties</span>
            <Building2 className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </div>
          <p className="text-xl font-bold text-slate-900 leading-tight">{totalProperties} Units</p>
          <p className="text-[11px] text-indigo-600 font-medium mt-1 flex items-center gap-0.5">
            Manage portfolio <ChevronRight className="w-3 h-3" />
          </p>
        </button>

        {/* Card 2: Occupancy & Rent Roll */}
        <button
          type="button"
          onClick={() => onFilterTenants('All tenancies')}
          className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Occupancy</span>
            <Users className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-slate-900 leading-tight">{occupancyRate}%</span>
            <span className="text-[11px] text-slate-500">({activeTenancies.length}/{totalProperties})</span>
          </div>
          <p className="text-[11px] text-slate-600 font-medium mt-1">
            {formatCurrency(monthlyGrossTotal)} <span className="text-[10px] text-slate-400 font-normal">/mo gross</span>
          </p>
        </button>

        {/* Card 3: Late Collections */}
        <button
          type="button"
          onClick={() => onFilterTenants('Late collection')}
          className={`rounded-xl border p-3.5 shadow-sm transition-all text-left group ${
            lateTenancies.length > 0 
              ? 'bg-amber-50/50 border-amber-200 hover:border-amber-300 hover:shadow-md' 
              : 'bg-white border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Late Collections</span>
            <AlertTriangle className={`w-4 h-4 ${lateTenancies.length > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
          </div>
          <p className={`text-xl font-bold leading-tight ${lateTenancies.length > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
            {lateTenancies.length} {lateTenancies.length === 1 ? 'Unit' : 'Units'}
          </p>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            {lateTenancies.length > 0 ? 'Requires follow-up' : 'All rent collections on track'}
          </p>
        </button>

        {/* Card 4: Upcoming Renewals */}
        <button
          type="button"
          onClick={() => onFilterTenants('Renewals')}
          className={`rounded-xl border p-3.5 shadow-sm transition-all text-left group ${
            expiringTenancies.length > 0 
              ? 'bg-blue-50/40 border-blue-200 hover:border-blue-300 hover:shadow-md' 
              : 'bg-white border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Renewals (60d)</span>
            <CalendarClock className={`w-4 h-4 ${expiringTenancies.length > 0 ? 'text-blue-600' : 'text-slate-400'}`} />
          </div>
          <p className={`text-xl font-bold leading-tight ${expiringTenancies.length > 0 ? 'text-blue-700' : 'text-slate-900'}`}>
            {expiringTenancies.length} {expiringTenancies.length === 1 ? 'Lease' : 'Leases'}
          </p>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            {expiringTenancies.length > 0 ? 'Review extension options' : 'No upcoming expiries'}
          </p>
        </button>
      </div>

      {/* TIER 2: Live Portfolio Rent Roll (The Core Operations Table) */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Portfolio Rent Roll</h3>
            <span className="text-[11px] text-slate-400 font-medium">({state.properties.length} Properties)</span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('properties')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
          >
            Manage All <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/40 text-slate-500 border-b border-slate-100 font-semibold">
              <tr>
                <th className="px-4 py-2">Unit / Property</th>
                <th className="px-3 py-2">Current Tenant</th>
                <th className="px-3 py-2">Monthly Rent</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Lease Expiry</th>
                <th className="px-4 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.properties.map((property) => {
                const tenancy = state.tenancies.find(
                  (t) => t.propertyId === property.id && !t.closedEarly && t.status !== 'Closed Early' && t.status !== 'Expired'
                )
                const tenant = state.tenants.find((t) => t.id === tenancy?.tenantId)
                const isLate = tenancy?.rentalTerms.lateCollectionFlag
                const isExpiring = tenancy && expiringTenancies.some((t) => t.id === tenancy.id)

                return (
                  <tr 
                    key={property.id} 
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => onSelectProperty(property.id)}
                  >
                    <td className="px-4 py-2.5 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700 font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
                          {property.serialNumber}
                        </span>
                        <span className="truncate max-w-[200px]">{property.address.unitNumber}, {property.address.streetAddress}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {tenant ? (
                        <span className="font-semibold text-slate-800">{tenant.name}</span>
                      ) : (
                        <span className="text-slate-400 italic">Vacant</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-slate-900">
                      {tenancy ? formatCurrency(tenancy.rentalTerms.monthlyGross) : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      {isLate ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          Late Collection
                        </span>
                      ) : isExpiring ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                          Expiring Soon
                        </span>
                      ) : tenancy ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">
                          Vacant
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 font-mono text-[11px]">
                      {tenancy?.expirationDate ? tenancy.expirationDate : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="text-indigo-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity text-[11px] inline-flex items-center gap-0.5">
                        Open <ExternalLink className="w-3 h-3" />
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* TIER 3: Operational Queue & Direct Action Hub (Split 50/50) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {/* Left: Operational Attention Desk */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Operations Queue</h4>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                totalTasks === 0 ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-800'
              }`}>
                {totalTasks} pending
              </span>
            </div>

            {totalTasks === 0 ? (
              <p className="text-xs text-slate-500 py-3">
                Queue clear: 0 receipts awaiting verification and 0 open maintenance tickets.
              </p>
            ) : (
              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {pendingReceipts.map((receipt: any) => (
                  <div key={receipt.id} className="flex items-center justify-between bg-slate-50 p-2 rounded text-xs">
                    <div>
                      <p className="font-semibold text-slate-900">{receipt.tenancy?.tenant?.name || 'Tenant'}</p>
                      <p className="text-slate-500 text-[11px]">{formatCurrency(receipt.amount)} • {receipt.paymentDate}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleVerify(receipt.id)}
                      disabled={verifying === receipt.id}
                      className="bg-indigo-600 text-white font-medium px-2.5 py-1 rounded text-xs hover:bg-indigo-500 disabled:opacity-50"
                    >
                      {verifying === receipt.id ? '...' : 'Verify'}
                    </button>
                  </div>
                ))}
                {openMaintenance.map((req: any) => (
                  <div key={req.id} className="flex items-center justify-between bg-slate-50 p-2 rounded text-xs">
                    <div>
                      <span className="font-bold text-[10px] text-rose-600 uppercase mr-1.5">{req.urgency}</span>
                      <span className="font-semibold text-slate-900">{req.title}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate('properties')}
                      className="text-indigo-600 font-semibold text-xs hover:underline"
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Direct Operator Actions */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Quick Actions</h4>
              <span className="text-[11px] text-slate-400 font-medium">Direct Shortcuts</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onOpenTenancyDrawer}
                className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-left transition-all"
              >
                <Plus className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-900 leading-none">Setup Tenancy</p>
                  <p className="text-[10px] text-slate-500 mt-1">3-step wizard</p>
                </div>
              </button>

              <button
                type="button"
                onClick={onOpenPropertyDrawer}
                className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-left transition-all"
              >
                <Building2 className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-900 leading-none">Add Property</p>
                  <p className="text-[10px] text-slate-500 mt-1">New inventory</p>
                </div>
              </button>

              <button
                type="button"
                onClick={onOpenTenantDrawer}
                className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-left transition-all"
              >
                <Users className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-900 leading-none">Create Tenant</p>
                  <p className="text-[10px] text-slate-500 mt-1">Onboard tenant</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('reports')}
                className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-left transition-all"
              >
                <FileText className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-900 leading-none">View Reports</p>
                  <p className="text-[10px] text-slate-500 mt-1">P&L & Rent Roll</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
