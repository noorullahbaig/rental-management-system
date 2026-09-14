import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { generateRentObligations } from './TenantPortalHelpers'
import {
  Bell,
  Home,
  CreditCard,
  Wrench,
  Zap,
  FileText,
  User,
  LogOut,
  Upload,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  Send,
  ChevronDown,
  Plus,
  Download,
} from 'lucide-react'

type Section = 'dashboard' | 'tenancy' | 'payments' | 'maintenance' | 'utilities' | 'documents' | 'profile'

interface TenantPortalProps {
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    role: string
  }
  onLogout: () => void
}

export function TenantPortal({ user, onLogout }: TenantPortalProps) {
  const [section, setSection] = useState<Section>('dashboard')
  const [tenancy, setTenancy] = useState<any>(null)
  const [property, setProperty] = useState<any>(null)
  const [maintenanceRequests, setMaintenanceRequests] = useState<any[]>([])
  const [paymentReceipts, setPaymentReceipts] = useState<any[]>([])
  const [utilityBills, setUtilityBills] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [showMobileNav, setShowMobileNav] = useState(false)
  
  // Maintenance form state
  const [maintenanceDrawer, setMaintenanceDrawer] = useState(false)
  const [maintenanceForm, setMaintenanceForm] = useState({
    category: 'PLUMBING' as const,
    title: '',
    description: '',
    urgency: 'MEDIUM' as const,
  })
  const [maintenanceSubmitting, setMaintenanceSubmitting] = useState(false)
  
  // Payment receipt form state
  const [paymentDrawer, setPaymentDrawer] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    amount: '',
    paymentMethod: 'BANK_TRANSFER' as const,
    referenceNumber: '',
    notes: '',
  })
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)
  
  // Utility bill form state
  const [utilityDrawer, setUtilityDrawer] = useState(false)
  const [utilityForm, setUtilityForm] = useState({
    billType: 'ELECTRICITY' as const,
    billMonth: new Date().toISOString().slice(0, 7),
    amount: '',
    dueDate: '',
    notes: '',
  })
  const [utilitySubmitting, setUtilitySubmitting] = useState(false)

  useEffect(() => {
    loadTenancyData()
    loadMaintenanceRequests()
    loadPaymentReceipts()
    loadUtilityBills()
    loadNotifications()
  }, [])

  const loadTenancyData = async () => {
    try {
      const res = await fetch('/api/tenant/my-tenancy')
      if (res.ok) {
        const data = await res.json()
        setTenancy(data.tenancies[0] || null)
      }
    } catch (error) {
      console.error('Failed to load tenancy data', error)
    }
  }

  const loadMaintenanceRequests = async () => {
    try {
      const res = await fetch('/api/maintenance-requests')
      if (res.ok) {
        const data = await res.json()
        setMaintenanceRequests(data.requests)
      }
    } catch (error) {
      console.error('Failed to load maintenance requests', error)
    }
  }

  const loadPaymentReceipts = async () => {
    try {
      const res = await fetch('/api/payment-receipts')
      if (res.ok) {
        const data = await res.json()
        setPaymentReceipts(data.receipts)
      }
    } catch (error) {
      console.error('Failed to load payment receipts', error)
    }
  }

  const loadUtilityBills = async () => {
    try {
      const res = await fetch('/api/utility-bills')
      if (res.ok) {
        const data = await res.json()
        setUtilityBills(data.bills)
      }
    } catch (error) {
      console.error('Failed to load utility bills', error)
    }
  }

  const loadNotifications = async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications)
      }
    } catch (error) {
      console.error('Failed to load notifications', error)
    }
  }

  const submitMaintenanceRequest = async () => {
    if (!tenancy || !maintenanceForm.title || !maintenanceForm.description) return
    
    setMaintenanceSubmitting(true)
    try {
      const res = await fetch('/api/maintenance-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenancyId: tenancy.id,
          ...maintenanceForm,
        }),
      })
      
      if (res.ok) {
        await loadMaintenanceRequests()
        await loadNotifications()
        setMaintenanceDrawer(false)
        setMaintenanceForm({
          category: 'PLUMBING',
          title: '',
          description: '',
          urgency: 'MEDIUM',
        })
        alert('Maintenance request submitted successfully!')
      } else {
        alert('Failed to submit maintenance request')
      }
    } catch (error) {
      alert('Failed to submit maintenance request')
    } finally {
      setMaintenanceSubmitting(false)
    }
  }

  const submitPaymentReceipt = async () => {
    if (!tenancy || !paymentForm.amount) return
    
    setPaymentSubmitting(true)
    try {
      const res = await fetch('/api/payment-receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenancyId: tenancy.id,
          ...paymentForm,
          amount: parseFloat(paymentForm.amount),
          fileName: `receipt_${Date.now()}.pdf`,
        }),
      })
      
      if (res.ok) {
        await loadPaymentReceipts()
        await loadNotifications()
        setPaymentDrawer(false)
        setPaymentForm({
          paymentDate: new Date().toISOString().split('T')[0],
          amount: '',
          paymentMethod: 'BANK_TRANSFER',
          referenceNumber: '',
          notes: '',
        })
        alert('Payment receipt uploaded successfully!')
      } else {
        alert('Failed to upload payment receipt')
      }
    } catch (error) {
      alert('Failed to upload payment receipt')
    } finally {
      setPaymentSubmitting(false)
    }
  }

  const submitUtilityBill = async () => {
    if (!tenancy || !utilityForm.amount) return
    
    setUtilitySubmitting(true)
    try {
      const res = await fetch('/api/utility-bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenancyId: tenancy.id,
          ...utilityForm,
          amount: parseFloat(utilityForm.amount),
          fileName: `bill_${utilityForm.billType}_${utilityForm.billMonth}.pdf`,
        }),
      })
      
      if (res.ok) {
        await loadUtilityBills()
        setUtilityDrawer(false)
        setUtilityForm({
          billType: 'ELECTRICITY',
          billMonth: new Date().toISOString().slice(0, 7),
          amount: '',
          dueDate: '',
          notes: '',
        })
        alert('Utility bill uploaded successfully!')
      } else {
        alert('Failed to upload utility bill')
      }
    } catch (error) {
      alert('Failed to upload utility bill')
    } finally {
      setUtilitySubmitting(false)
    }
  }

  const markNotificationRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PUT' })
      await loadNotifications()
    } catch (error) {
      console.error('Failed to mark notification as read', error)
    }
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  const navItems = [
    { id: 'dashboard' as Section, label: 'Dashboard', icon: Home },
    { id: 'tenancy' as Section, label: 'My Tenancy', icon: FileText },
    { id: 'payments' as Section, label: 'Payments', icon: CreditCard },
    { id: 'maintenance' as Section, label: 'Maintenance', icon: Wrench },
    { id: 'utilities' as Section, label: 'Utility Bills', icon: Zap },
    { id: 'profile' as Section, label: 'Profile', icon: User },
  ]

  const currency = (value: number) =>
    new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(value || 0)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      VERIFIED: 'bg-green-500/10 text-green-600 border-green-500/20',
      REJECTED: 'bg-red-500/10 text-red-600 border-red-500/20',
      SUBMITTED: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      ACKNOWLEDGED: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
      IN_PROGRESS: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      RESOLVED: 'bg-green-500/10 text-green-600 border-green-500/20',
      CLOSED: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
      UPLOADED: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      PAID: 'bg-green-500/10 text-green-600 border-green-500/20',
      OVERDUE: 'bg-red-500/10 text-red-600 border-red-500/20',
      UNPAID: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
      PENDING_VERIFICATION: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    }
    return colors[status] || 'bg-gray-500/10 text-gray-600 border-gray-500/20'
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col border-r border-slate-200 bg-white">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Home className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Tenant Portal</h2>
              <p className="text-xs text-slate-500">{user.firstName} {user.lastName}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                section === item.id
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Navigation */}
      {showMobileNav && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm" onClick={() => setShowMobileNav(false)}>
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="w-64 h-full bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900">Tenant Portal</h2>
              <p className="text-xs text-slate-500">{user.firstName} {user.lastName}</p>
            </div>
            <nav className="p-4 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setSection(item.id)
                    setShowMobileNav(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
                    section === item.id
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-slate-600'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              ))}
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </nav>
          </motion.div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowMobileNav(true)}
                className="md:hidden p-2 hover:bg-slate-100 rounded-lg"
              >
                <Home className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">
                  {navItems.find(item => item.id === section)?.label}
                </h1>
                <p className="text-sm text-slate-500">Welcome back, {user.firstName}!</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <Bell className="w-5 h-5 text-slate-600" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 z-50">
                    <div className="p-4 border-b border-slate-200">
                      <h3 className="font-semibold text-slate-900">Notifications</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                          <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>No notifications</p>
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`p-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${
                              !notif.isRead ? 'bg-blue-50/50' : ''
                            }`}
                            onClick={() => markNotificationRead(notif.id)}
                          >
                            <p className="font-medium text-sm text-slate-900">{notif.title}</p>
                            <p className="text-xs text-slate-600 mt-1">{notif.message}</p>
                            <p className="text-xs text-slate-400 mt-2">{formatDate(notif.createdAt)}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">
          <AnimatePresence mode="wait">
            {section === 'dashboard' && (
              <DashboardSection
                tenancy={tenancy}
                maintenanceRequests={maintenanceRequests}
                paymentReceipts={paymentReceipts}
                currency={currency}
                formatDate={formatDate}
                getStatusColor={getStatusColor}
              />
            )}

            {section === 'tenancy' && (
              <TenancySection tenancy={tenancy} currency={currency} formatDate={formatDate} />
            )}

            {section === 'payments' && (
              <PaymentsSection
                tenancy={tenancy}
                paymentReceipts={paymentReceipts}
                currency={currency}
                formatDate={formatDate}
                getStatusColor={getStatusColor}
                onUpload={() => setPaymentDrawer(true)}
              />
            )}

            {section === 'maintenance' && (
              <MaintenanceSection
                maintenanceRequests={maintenanceRequests}
                formatDate={formatDate}
                getStatusColor={getStatusColor}
                onSubmit={() => setMaintenanceDrawer(true)}
              />
            )}

            {section === 'utilities' && (
              <UtilitiesSection
                utilityBills={utilityBills}
                currency={currency}
                formatDate={formatDate}
                getStatusColor={getStatusColor}
                onUpload={() => setUtilityDrawer(true)}
              />
            )}

            {section === 'profile' && <ProfileSection user={user} tenancy={tenancy} />}
          </AnimatePresence>
        </main>
      </div>

      {/* Maintenance Request Drawer */}
      {maintenanceDrawer && (
        <Drawer
          title="Submit Maintenance Request"
          open={maintenanceDrawer}
          onClose={() => setMaintenanceDrawer(false)}
          onSubmit={submitMaintenanceRequest}
          submitting={maintenanceSubmitting}
        >
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-3">What kind of issue is this?</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { id: 'PLUMBING', label: 'Plumbing', icon: Zap },
                  { id: 'ELECTRICAL', label: 'Electrical', icon: Zap },
                  { id: 'AC', label: 'A/C', icon: Zap },
                  { id: 'APPLIANCES', label: 'Appliances', icon: Wrench },
                  { id: 'OTHER', label: 'Other', icon: AlertCircle },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setMaintenanceForm({ ...maintenanceForm, category: cat.id as any })}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                      maintenanceForm.category === cat.id
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <cat.icon className={`w-6 h-6 mb-2 ${maintenanceForm.category === cat.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className="text-sm font-medium">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-3">How urgent is this?</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'LOW', label: 'Low', desc: 'Can wait a few days', color: 'bg-slate-100 hover:bg-slate-200 border-slate-200', active: 'border-slate-500 ring-2 ring-slate-200' },
                  { id: 'MEDIUM', label: 'Medium', desc: 'Needs attention soon', color: 'bg-blue-50 hover:bg-blue-100 border-blue-200', active: 'border-blue-500 ring-2 ring-blue-200' },
                  { id: 'HIGH', label: 'High', desc: 'Urgent, prevents normal use', color: 'bg-orange-50 hover:bg-orange-100 border-orange-200', active: 'border-orange-500 ring-2 ring-orange-200' },
                  { id: 'EMERGENCY', label: 'Emergency', desc: 'Safety hazard / severe damage', color: 'bg-red-50 hover:bg-red-100 border-red-200', active: 'border-red-500 ring-2 ring-red-200 text-red-700' },
                ].map((urg) => (
                  <button
                    key={urg.id}
                    onClick={() => setMaintenanceForm({ ...maintenanceForm, urgency: urg.id as any })}
                    className={`text-left p-3 rounded-xl border transition-all ${urg.color} ${
                      maintenanceForm.urgency === urg.id ? urg.active : ''
                    }`}
                  >
                    <div className="font-semibold text-sm">{urg.label}</div>
                    <div className="text-xs opacity-70 mt-1">{urg.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Issue Title</label>
                <input
                  type="text"
                  value={maintenanceForm.title}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, title: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="E.g., Kitchen sink is leaking"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Detailed Description</label>
                <textarea
                  value={maintenanceForm.description}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-3 h-32 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  placeholder="Please describe the issue in detail. When did it start? What exactly is broken?"
                />
              </div>
            </div>
          </div>
        </Drawer>
      )}

            {paymentDrawer && (
        <Drawer
          title="Upload Payment Receipt"
          open={paymentDrawer}
          onClose={() => setPaymentDrawer(false)}
          onSubmit={submitPaymentReceipt}
          submitting={paymentSubmitting}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Payment Date</label>
              <input
                type="date"
                value={paymentForm.paymentDate}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-4 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Amount (MYR)</label>
              <input
                type="number"
                step="0.01"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-4 py-2"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Payment Method</label>
              <select
                value={paymentForm.paymentMethod}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as any })}
                className="w-full border border-slate-300 rounded-lg px-4 py-2"
              >
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CASH">Cash</option>
                <option value="CHEQUE">Cheque</option>
                <option value="ONLINE">Online Payment</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Reference Number</label>
              <input
                type="text"
                value={paymentForm.referenceNumber}
                onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-4 py-2"
                placeholder="Transaction reference"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Notes (Optional)</label>
              <textarea
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-4 py-2 h-24"
                placeholder="Additional notes..."
              />
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
              <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="text-sm text-slate-600">Upload receipt (simulated)</p>
              <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG accepted</p>
            </div>
          </div>
        </Drawer>
      )}

      {/* Utility Bill Drawer */}
      {utilityDrawer && (
        <Drawer
          title="Upload Utility Bill"
          open={utilityDrawer}
          onClose={() => setUtilityDrawer(false)}
          onSubmit={submitUtilityBill}
          submitting={utilitySubmitting}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Bill Type</label>
              <select
                value={utilityForm.billType}
                onChange={(e) => setUtilityForm({ ...utilityForm, billType: e.target.value as any })}
                className="w-full border border-slate-300 rounded-lg px-4 py-2"
              >
                <option value="ELECTRICITY">Electricity</option>
                <option value="WATER">Water</option>
                <option value="GAS">Gas</option>
                <option value="INTERNET">Internet</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Bill Month</label>
              <input
                type="month"
                value={utilityForm.billMonth}
                onChange={(e) => setUtilityForm({ ...utilityForm, billMonth: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-4 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Amount (MYR)</label>
              <input
                type="number"
                step="0.01"
                value={utilityForm.amount}
                onChange={(e) => setUtilityForm({ ...utilityForm, amount: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-4 py-2"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Due Date</label>
              <input
                type="date"
                value={utilityForm.dueDate}
                onChange={(e) => setUtilityForm({ ...utilityForm, dueDate: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-4 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Notes (Optional)</label>
              <textarea
                value={utilityForm.notes}
                onChange={(e) => setUtilityForm({ ...utilityForm, notes: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-4 py-2 h-24"
                placeholder="Additional notes..."
              />
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
              <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="text-sm text-slate-600">Upload bill (simulated)</p>
              <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG accepted</p>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  )
}

// Dashboard Section
function DashboardSection({ tenancy, maintenanceRequests, paymentReceipts, currency, formatDate, getStatusColor }: any) {
  const pendingMaintenance = maintenanceRequests.filter((r: any) => r.status === 'SUBMITTED' || r.status === 'ACKNOWLEDGED').length
  const pendingPayments = paymentReceipts.filter((r: any) => r.verificationStatus === 'PENDING').length
  const rentObligations = generateRentObligations(tenancy, paymentReceipts);
  const nextObligation = rentObligations.find((o: any) => o.status === 'UNPAID' || o.status === 'OVERDUE') || rentObligations[0];


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Next Rent Due</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {nextObligation ? currency(nextObligation.amount) : (tenancy ? currency(tenancy.monthlyGross) : '-')}
              </p>
              {nextObligation && (
                <p className={`text-xs mt-1 font-medium ${nextObligation.status === 'OVERDUE' ? 'text-red-500' : 'text-slate-500'}`}>
                  {nextObligation.status === 'OVERDUE' ? 'Overdue!' : `Due ${formatDate(nextObligation.dueDateStr)}`}
                </p>
              )}
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Pending Requests</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{pendingMaintenance}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Wrench className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Payment Verifications</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{pendingPayments}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Lease Info */}
      {tenancy && (
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-4">Lease Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-indigo-100 text-sm">Property</p>
              <p className="font-semibold mt-1">{tenancy.property.streetAddress}</p>
            </div>
            <div>
              <p className="text-indigo-100 text-sm">Lease Start</p>
              <p className="font-semibold mt-1">{formatDate(tenancy.commencementDate)}</p>
            </div>
            <div>
              <p className="text-indigo-100 text-sm">Lease End</p>
              <p className="font-semibold mt-1">{formatDate(tenancy.expirationDate)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-4">Recent Maintenance</h3>
          {maintenanceRequests.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No maintenance requests yet</p>
          ) : (
            <div className="space-y-3">
              {maintenanceRequests.slice(0, 3).map((request: any) => (
                <div key={request.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                  <Wrench className="w-5 h-5 text-slate-400" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900 truncate">{request.title}</p>
                    <p className="text-xs text-slate-500">{formatDate(request.submittedDate)}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(request.status)}`}>
                    {request.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-4">Recent Payments</h3>
          {paymentReceipts.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No payment receipts yet</p>
          ) : (
            <div className="space-y-3">
              {paymentReceipts.slice(0, 3).map((receipt: any) => (
                <div key={receipt.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                  <CreditCard className="w-5 h-5 text-slate-400" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900">{currency(receipt.amount)}</p>
                    <p className="text-xs text-slate-500">{formatDate(receipt.paymentDate)}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(receipt.verificationStatus)}`}>
                    {receipt.verificationStatus}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Tenancy Section
function TenancySection({ tenancy, currency, formatDate }: any) {
  if (!tenancy) {
    return (
      <div className="bg-white rounded-xl p-12 text-center">
        <Home className="w-16 h-16 mx-auto text-slate-300 mb-4" />
        <p className="text-slate-600">No active tenancy found</p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <h3 className="font-semibold text-lg text-slate-900 mb-6">Property Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm text-slate-600">Address</label>
            <p className="font-medium text-slate-900 mt-1">
              {tenancy.property.unitNumber} {tenancy.property.streetAddress}
            </p>
            <p className="text-slate-600">{tenancy.property.cityState}</p>
          </div>
          <div>
            <label className="text-sm text-slate-600">Property Type</label>
            <p className="font-medium text-slate-900 mt-1">{tenancy.property.kind}</p>
          </div>
          <div>
            <label className="text-sm text-slate-600">Project Name</label>
            <p className="font-medium text-slate-900 mt-1">{tenancy.property.projectName}</p>
          </div>
          <div>
            <label className="text-sm text-slate-600">Developer</label>
            <p className="font-medium text-slate-900 mt-1">{tenancy.property.developerName}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <h3 className="font-semibold text-lg text-slate-900 mb-6">Lease Terms</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="text-sm text-slate-600">Commencement Date</label>
            <p className="font-medium text-slate-900 mt-1">{formatDate(tenancy.commencementDate)}</p>
          </div>
          <div>
            <label className="text-sm text-slate-600">Expiration Date</label>
            <p className="font-medium text-slate-900 mt-1">{formatDate(tenancy.expirationDate)}</p>
          </div>
          <div>
            <label className="text-sm text-slate-600">Tenure</label>
            <p className="font-medium text-slate-900 mt-1">{tenancy.tenure}</p>
          </div>
          <div>
            <label className="text-sm text-slate-600">Monthly Rent</label>
            <p className="font-semibold text-lg text-green-600 mt-1">{currency(tenancy.monthlyGross)}</p>
          </div>
          <div>
            <label className="text-sm text-slate-600">Rental Deposit</label>
            <p className="font-medium text-slate-900 mt-1">{currency(tenancy.rentalDeposit)}</p>
          </div>
          <div>
            <label className="text-sm text-slate-600">Status</label>
            <p className="font-medium text-slate-900 mt-1">{tenancy.status}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <h3 className="font-semibold text-lg text-slate-900 mb-6">Utility Accounts</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="text-sm text-slate-600">Air Selangor</label>
            <p className="font-medium text-slate-900 mt-1">{tenancy.airSelangorAccount || '-'}</p>
          </div>
          <div>
            <label className="text-sm text-slate-600">TNB Account</label>
            <p className="font-medium text-slate-900 mt-1">{tenancy.tnbAccount || '-'}</p>
          </div>
          <div>
            <label className="text-sm text-slate-600">TM Account</label>
            <p className="font-medium text-slate-900 mt-1">{tenancy.tmAccount || '-'}</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Payments Section
function PaymentsSection({ tenancy, paymentReceipts, currency, formatDate, getStatusColor, onUpload }: any) {
  const obligations = generateRentObligations(tenancy, paymentReceipts);
  const nextObligation = obligations.find((o: any) => o.status === 'UNPAID' || o.status === 'OVERDUE') || obligations[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Rent Obligations & History</h2>
          <p className="text-sm text-slate-600">Track your monthly rent payments</p>
        </div>
      </div>

      {nextObligation && (
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-8 text-white relative overflow-hidden shadow-lg border border-indigo-400">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <p className="text-indigo-100 font-medium tracking-wide uppercase text-sm mb-1">
                {nextObligation.status === 'OVERDUE' ? 'Action Required' : 'Next Payment Due'}
              </p>
              <h3 className="text-3xl font-bold mb-1">{nextObligation.monthLabel} Rent</h3>
              <p className="text-xl font-medium text-white/90">{currency(nextObligation.amount)}</p>
            </div>
            
            <div className="flex flex-col items-start md:items-end gap-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-200" />
                <span className="text-lg">
                  {nextObligation.status === 'OVERDUE' 
                    ? <span className="text-red-300 font-semibold">Overdue! (Due {formatDate(nextObligation.dueDateStr)})</span>
                    : <span className="text-indigo-100">Due {formatDate(nextObligation.dueDateStr)}</span>
                  }
                </span>
              </div>
              {(nextObligation.status === 'UNPAID' || nextObligation.status === 'OVERDUE' || nextObligation.status === 'REJECTED') && (
                <button
                  onClick={onUpload}
                  className="bg-white text-indigo-600 hover:bg-slate-50 px-6 py-3 rounded-lg font-semibold shadow-sm transition-colors w-full md:w-auto"
                >
                  Upload Receipt
                </button>
              )}
            </div>
          </div>
          <div className="absolute -right-20 -top-20 opacity-10">
            <CreditCard className="w-64 h-64" />
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-800">Rent Payment Schedule</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Month</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Due Date</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Amount</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {obligations.map((obl: any) => (
                <tr key={obl.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{obl.monthLabel}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{formatDate(obl.dueDateStr)}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">{currency(obl.amount)}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-3 py-1.5 rounded-full border ${getStatusColor(obl.status)}`}>
                      {obl.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {(obl.status === 'UNPAID' || obl.status === 'OVERDUE' || obl.status === 'REJECTED') ? (
                      <button onClick={onUpload} className="text-indigo-600 hover:text-indigo-700 text-sm font-medium transition-colors">
                        Pay Now
                      </button>
                    ) : (
                      <span className="text-slate-400 text-sm flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" /> Settled
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {obligations.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No obligations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  )
}

// Maintenance Section
function MaintenanceSection({ maintenanceRequests, formatDate, getStatusColor, onSubmit }: any) {
  const getTimelineSteps = (status: string) => {
    const steps = [
      { id: 'SUBMITTED', label: 'Submitted' },
      { id: 'ACKNOWLEDGED', label: 'Acknowledged' },
      { id: 'IN_PROGRESS', label: 'In Progress' },
      { id: 'RESOLVED', label: 'Resolved' }
    ];
    
    // Map CLOSED to RESOLVED for visual purposes if needed, though usually it's a final state.
    const currentIndex = steps.findIndex(s => s.id === status) !== -1 
      ? steps.findIndex(s => s.id === status) 
      : status === 'CLOSED' ? 3 : 0;
      
    return steps.map((step, index) => ({
      ...step,
      isCompleted: index <= currentIndex,
      isCurrent: index === currentIndex
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Maintenance Requests</h2>
          <p className="text-sm text-slate-600">Track and manage your property issues</p>
        </div>
        <button
          onClick={onSubmit}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors shadow-sm font-medium"
        >
          <Plus className="w-5 h-5" />
          New Request
        </button>
      </div>

      {maintenanceRequests.length === 0 ? (
        <div className="bg-slate-50 rounded-xl p-12 text-center border border-dashed border-slate-300">
          <Wrench className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Maintenance Issues</h3>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">Your property is in great shape! If you ever need repairs or assistance, submit a request here.</p>
          <button
            onClick={onSubmit}
            className="px-6 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium shadow-sm transition-colors"
          >
            Submit a Request
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {maintenanceRequests.map((request: any) => (
            <div key={request.id} className="bg-white rounded-xl p-0 border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
              {/* Left Side: Info */}
              <div className="p-6 md:w-1/3 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${getStatusColor(request.status)}`}>
                      {request.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 font-medium">
                      {request.urgency}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg leading-tight mb-2">{request.title}</h3>
                  <p className="text-sm text-slate-600 line-clamp-3 mb-4">{request.description}</p>
                </div>
                
                <div className="text-xs text-slate-500 space-y-1">
                  <p><span className="font-medium text-slate-700">Category:</span> {request.category}</p>
                  <p><span className="font-medium text-slate-700">Submitted:</span> {formatDate(request.submittedDate)}</p>
                </div>
              </div>

              {/* Right Side: Timeline & Comments */}
              <div className="p-6 md:w-2/3 flex flex-col justify-center">
                <h4 className="text-sm font-semibold text-slate-900 mb-6">Request Progress</h4>
                
                {/* Pizza Tracker Timeline */}
                <div className="relative flex items-center justify-between w-full max-w-lg mx-auto mb-8">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 rounded-full" />
                  <div 
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-indigo-500 rounded-full transition-all duration-500" 
                    style={{ width: `${(getTimelineSteps(request.status).filter(s => s.isCompleted).length - 1) * 33.33}%` }}
                  />
                  
                  {getTimelineSteps(request.status).map((step, i) => (
                    <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors duration-500 ${
                        step.isCompleted ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white border-slate-300 text-transparent'
                      }`}>
                        {step.isCompleted && <CheckCircle className="w-3 h-3" />}
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider absolute top-8 text-center w-24 -ml-9 ${
                        step.isCurrent ? 'text-indigo-600' : step.isCompleted ? 'text-slate-700' : 'text-slate-400'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>

                {request.comments.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Latest Updates</h4>
                    <div className="space-y-3">
                      {request.comments.map((comment: any) => (
                        <div key={comment.id} className="bg-slate-50 rounded-lg p-3 text-sm flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-indigo-700 font-bold text-xs">{comment.userName.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="text-slate-900 font-medium text-xs mb-0.5">
                              {comment.userName} <span className="text-slate-400 font-normal ml-2">{formatDate(comment.timestamp)}</span>
                            </p>
                            <p className="text-slate-600">{comment.comment}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// Utilities Section
function UtilitiesSection({ utilityBills, currency, formatDate, getStatusColor, onUpload }: any) {
  const outstandingBills = utilityBills.filter((b: any) => b.status === 'UPLOADED' || b.status === 'OVERDUE');
  const paidBills = utilityBills.filter((b: any) => b.status === 'PAID');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Utility Bills</h2>
          <p className="text-sm text-slate-600">Track and pay your utility obligations</p>
        </div>
        <button
          onClick={onUpload}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors shadow-sm font-medium"
        >
          <Upload className="w-4 h-4" />
          Upload Bill Receipt
        </button>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-orange-500" />
          Outstanding Bills
        </h3>
        {outstandingBills.length === 0 ? (
          <div className="bg-slate-50 rounded-xl p-8 text-center border border-dashed border-slate-300">
            <CheckCircle className="w-12 h-12 mx-auto text-green-400 mb-3" />
            <p className="text-slate-600 font-medium">All caught up!</p>
            <p className="text-sm text-slate-500">You have no outstanding utility bills.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {outstandingBills.map((bill: any) => (
              <div key={bill.id} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${bill.status === 'OVERDUE' ? 'bg-red-500' : 'bg-orange-500'}`} />
                <div className="flex items-center justify-between mb-3 pl-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                      <Zap className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{bill.billType}</h3>
                      <p className="text-xs text-slate-500">{bill.billMonth}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${getStatusColor(bill.status)}`}>
                    {bill.status}
                  </span>
                </div>
                <div className="pl-2 mt-4 flex items-end justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-0.5">Amount Due</p>
                    <span className="text-xl font-bold text-slate-900">{currency(bill.amount)}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 mb-1">Due: {formatDate(bill.dueDate)}</p>
                    <button onClick={onUpload} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                      Pay Now &rarr;
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          Paid History
        </h3>
        {paidBills.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border border-slate-200">
            <p className="text-slate-500">No payment history available.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Bill Type</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Month</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Amount</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Paid Date</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paidBills.map((bill: any) => (
                  <tr key={bill.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-slate-400" />
                      {bill.billType}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{bill.billMonth}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">{currency(bill.amount)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{bill.paidDate ? formatDate(bill.paidDate) : '-'}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs px-2.5 py-1 rounded-full border bg-green-500/10 text-green-600 border-green-500/20">
                        Paid
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// Profile Section
function ProfileSection({ user, tenancy }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <h3 className="font-semibold text-lg text-slate-900 mb-6">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm text-slate-600">First Name</label>
            <p className="font-medium text-slate-900 mt-1">{user.firstName}</p>
          </div>
          <div>
            <label className="text-sm text-slate-600">Last Name</label>
            <p className="font-medium text-slate-900 mt-1">{user.lastName}</p>
          </div>
          <div>
            <label className="text-sm text-slate-600">Email</label>
            <p className="font-medium text-slate-900 mt-1">{user.email}</p>
          </div>
          <div>
            <label className="text-sm text-slate-600">Role</label>
            <p className="font-medium text-slate-900 mt-1">{user.role}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <h3 className="font-semibold text-lg text-slate-900 mb-4">Account Settings</h3>
        <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
          Change Password
        </button>
      </div>
    </motion.div>
  )
}

// Drawer Component
function Drawer({ title, open, onClose, onSubmit, submitting, children }: any) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="relative w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        <div className="p-6 border-t border-slate-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
