import React, { useEffect, useState } from 'react'
import { 
  Building2, 
  DollarSign, 
  ClipboardCheck, 
  Wrench, 
  CheckCircle, 
  CalendarClock, 
  ArrowUpRight, 
  AlertCircle,
  Sparkles
} from 'lucide-react'
import { fetchDashboardStats } from '../api'

export default function AdminDashboard({ onNavigate }: { onNavigate: (section: any) => void }) {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState<string | null>(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const data = await fetchDashboardStats()
      setStats(data)
    } catch (err) {
      console.error('Failed to load dashboard stats', err)
    } finally {
      setLoading(false)
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
      await loadStats()
    } catch (err) {
      console.error('Failed to verify', err)
    } finally {
      setVerifying(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  if (!stats) return <div className="p-4 text-sm text-slate-500">Unable to load dashboard.</div>

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: 0 }).format(val)

  const totalAttentionItems = (stats.pendingReceipts?.length || 0) + (stats.openMaintenance?.length || 0)

  return (
    <div className="space-y-4 max-w-[1400px]">
      {/* TIER 1: The Pulse (Compact, Calm Metrics) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Occupancy Card */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 tracking-wide uppercase">Portfolio Occupancy</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-slate-900">{stats.metrics.occupancyRate}%</span>
              <span className="text-xs text-slate-500 font-medium">
                {stats.metrics.activeTenancies} of {stats.metrics.totalProperties} units
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        {/* Monthly Rent Roll */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 tracking-wide uppercase">Monthly Rent Roll</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-slate-900">
                {formatCurrency(stats.metrics.currentMonthExpected)}
              </span>
              <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                Active Leases
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Operational Attention Required */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 tracking-wide uppercase">Immediate Action</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-slate-900">
                {totalAttentionItems === 0 ? '0' : totalAttentionItems}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                totalAttentionItems === 0 ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'
              }`}>
                {totalAttentionItems === 0 ? 'All clear' : 'Tasks need review'}
              </span>
            </div>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            totalAttentionItems === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
          }`}>
            {totalAttentionItems === 0 ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          </div>
        </div>
      </div>

      {/* TIER 2: Action Hub (Adaptive: Compact when clean, expansive only when busy) */}
      {totalAttentionItems === 0 ? (
        <div className="bg-gradient-to-r from-emerald-50/80 via-white to-slate-50/50 rounded-xl border border-emerald-200/70 px-5 py-3.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 flex-shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Operations in Order</p>
              <p className="text-xs text-slate-500">No payment receipts pending verification and zero open maintenance tickets.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('properties')}
              className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
            >
              View Properties
            </button>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              Monthly Reports
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[220px]">
          {/* Column A: Verifications */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-amber-600" />
                <h4 className="text-xs font-bold uppercase text-slate-700">Receipts Awaiting Approval</h4>
              </div>
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                {stats.pendingReceipts.length}
              </span>
            </div>
            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {stats.pendingReceipts.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No receipts waiting for approval.</p>
              ) : (
                stats.pendingReceipts.map((receipt: any) => (
                  <div key={receipt.id} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg text-xs">
                    <div>
                      <p className="font-semibold text-slate-900">{receipt.tenancy?.tenant?.name || 'Tenant'}</p>
                      <p className="text-slate-500 text-[11px]">{formatCurrency(receipt.amount)} • {new Date(receipt.paymentDate).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={receipt.receiptUrl} target="_blank" rel="noreferrer" className="text-indigo-600 font-medium hover:underline">
                        File
                      </a>
                      <button
                        onClick={() => handleVerify(receipt.id)}
                        disabled={verifying === receipt.id}
                        className="bg-indigo-600 text-white font-medium px-2.5 py-1 rounded hover:bg-indigo-500 disabled:opacity-50"
                      >
                        {verifying === receipt.id ? '...' : 'Approve'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Column B: Maintenance */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-rose-600" />
                <h4 className="text-xs font-bold uppercase text-slate-700">Open Maintenance Issues</h4>
              </div>
              <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                {stats.openMaintenance.length}
              </span>
            </div>
            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {stats.openMaintenance.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">Zero maintenance requests open.</p>
              ) : (
                stats.openMaintenance.map((req: any) => (
                  <div key={req.id} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg text-xs">
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          req.urgency === 'EMERGENCY' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {req.urgency}
                        </span>
                        <p className="font-semibold text-slate-900">{req.title}</p>
                      </div>
                      <p className="text-slate-500 text-[11px]">{req.tenancy?.property?.serialNumber || 'Unit'} • {req.tenancy?.tenant?.name}</p>
                    </div>
                    <button
                      onClick={() => onNavigate('properties')}
                      className="text-indigo-600 font-semibold text-xs flex items-center hover:underline"
                    >
                      View
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TIER 3: Lease Horizon & Renewals (Comfortably above fold) */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Lease Renewals Watch (Next 90 Days)</h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {stats.expiringLeases?.length || 0} leases due for review
          </span>
        </div>

        <div className="p-4">
          {!stats.expiringLeases || stats.expiringLeases.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">No leases expiring in the next 90 days.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {stats.expiringLeases.map((lease: any) => {
                const isUrgent = lease.daysRemaining <= 30
                return (
                  <div 
                    key={lease.id} 
                    className="border border-slate-200/80 rounded-xl p-3 hover:border-indigo-200 transition-colors bg-white flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <p className="font-bold text-sm text-slate-900 truncate">{lease.tenant?.name || 'Tenant'}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                          isUrgent ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {lease.daysRemaining <= 0 ? 'Overdue' : `${lease.daysRemaining} days left`}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1 mb-2">
                        {lease.property?.serialNumber} · {lease.property?.address?.streetAddress || lease.property?.projectName}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between mt-1">
                      <span className="text-xs font-bold text-slate-700">
                        {formatCurrency(lease.monthlyGross || 0)} <span className="text-[10px] font-normal text-slate-400">/mo</span>
                      </span>
                      <button 
                        onClick={() => onNavigate('tenants')} 
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                      >
                        Review Lease <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
