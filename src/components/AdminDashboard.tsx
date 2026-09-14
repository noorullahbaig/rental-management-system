import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Building2, Users, AlertTriangle, CalendarClock, DollarSign, Wallet, ClipboardCheck, ArrowRight, Wrench, CheckCircle, Clock } from 'lucide-react'
import { fetchDashboardStats } from '../api' // I need to check if verifyPaymentReceipt exists, maybe just patch it in api.ts

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
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (id: string) => {
    try {
      setVerifying(id)
      await fetch(`/api/payment-receipts/${id}/verify`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ verificationStatus: 'VERIFIED' }) })
      await loadStats() // reload
    } catch (err) {
      console.error('Failed to verify', err)
    } finally {
      setVerifying(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!stats) return <div>Failed to load dashboard.</div>

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(val)

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="space-y-6">
      {/* TIER 1: The Pulse */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Occupancy Rate</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats.metrics.occupancyRate}%</h3>
            <p className="text-xs text-slate-400 mt-1">{stats.metrics.activeTenancies} / {stats.metrics.totalProperties} properties</p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
            <Building2 className="w-6 h-6" />
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Monthly Revenue</p>
            <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(stats.metrics.currentMonthCollected)}</h3>
            <p className="text-xs text-slate-400 mt-1">of {formatCurrency(stats.metrics.currentMonthExpected)} expected</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Pending Verifications</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats.pendingReceipts.length}</h3>
            <p className="text-xs text-slate-400 mt-1">Receipts await review</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-600">
            <ClipboardCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Active Issues</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats.openMaintenance.length}</h3>
            <p className="text-xs text-slate-400 mt-1">Maintenance requests open</p>
          </div>
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-600">
            <Wrench className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* TIER 2: Action Desk */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Column A: Verifications */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-900">Action Required: Verifications</h3>
            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full">{stats.pendingReceipts.length} Pending</span>
          </div>
          <div className="p-0 overflow-y-auto flex-1">
            {stats.pendingReceipts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                <CheckCircle className="w-12 h-12 mb-3 text-emerald-300" />
                <p>All caught up! No pending receipts.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {stats.pendingReceipts.map((receipt: any) => (
                  <div key={receipt.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="font-semibold text-sm text-slate-900">{receipt.tenancy?.tenant?.name || 'Unknown'}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{formatDate(receipt.paymentDate)} • {receipt.paymentMethod.replace('_', ' ')}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-bold text-emerald-600 text-sm">{formatCurrency(receipt.amount)}</p>
                      <a href={receipt.receiptUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 font-medium hover:underline">View File</a>
                      <button 
                        onClick={() => handleVerify(receipt.id)}
                        disabled={verifying === receipt.id}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded text-xs font-bold hover:bg-indigo-100 transition-colors disabled:opacity-50"
                      >
                        {verifying === receipt.id ? 'Verifying...' : 'Approve'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Column B: Maintenance */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-900">Maintenance Triage</h3>
            <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">{stats.openMaintenance.length} Open</span>
          </div>
          <div className="p-0 overflow-y-auto flex-1">
            {stats.openMaintenance.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                <CheckCircle className="w-12 h-12 mb-3 text-emerald-300" />
                <p>No open maintenance requests.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {stats.openMaintenance.map((req: any) => (
                  <div key={req.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          req.urgency === 'EMERGENCY' ? 'bg-red-100 text-red-700' : 
                          req.urgency === 'HIGH' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {req.urgency}
                        </span>
                        <h4 className="font-semibold text-sm text-slate-900">{req.title}</h4>
                      </div>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap bg-slate-100 px-2 py-0.5 rounded">
                        {req.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1 mb-2">{req.description}</p>
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs font-medium text-slate-700">{req.tenancy?.property?.serialNumber || 'Property'} • {req.tenancy?.tenant?.name}</p>
                      <button onClick={() => onNavigate('properties')} className="text-xs font-medium text-indigo-600 flex items-center gap-1 hover:underline">
                        Manage <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TIER 3: Risk Radar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="p-5 border-b border-slate-100 flex items-center gap-2 text-slate-900">
          <CalendarClock className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold">Risk Radar: Upcoming Renewals (60 Days)</h3>
        </div>
        <div className="p-5">
          {stats.expiringLeases.length === 0 ? (
            <p className="text-sm text-slate-500">No leases expiring in the next 60 days.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.expiringLeases.map((lease: any) => (
                <div key={lease.id} className="border border-slate-200 rounded-xl p-4 flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <p className="font-semibold text-sm">{lease.tenant?.name}</p>
                    <span className="bg-rose-50 text-rose-600 font-bold text-[10px] px-2 py-0.5 rounded">
                      Exp: {formatDate(lease.expirationDate)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">{lease.property?.address?.streetAddress}</p>
                  <button onClick={() => onNavigate('tenants')} className="mt-auto w-full py-2 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors">
                    Review Tenancy
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
