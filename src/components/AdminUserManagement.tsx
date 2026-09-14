import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Edit3, Trash2, Power, PowerOff, X, Check, Search } from 'lucide-react'

interface User {
  id: string
  email: string
  username: string | null
  role: string
  status: string
  firstName: string
  lastName: string
  createdAt: string
  lastLoginAt: string | null
  tenantProfile?: any
}

export function AdminUserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [createDrawer, setCreateDrawer] = useState(false)
  const [editDrawer, setEditDrawer] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [form, setForm] = useState({
    email: '',
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'EMPLOYEE' as 'ADMIN' | 'EMPLOYEE' | 'TENANT',
    tenantId: '',
  })
  const [tenants, setTenants] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadUsers()
    loadTenants()
  }, [])

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Failed to load users', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTenants = async () => {
    try {
      const res = await fetch('/api/tenants')
      if (res.ok) {
        const data = await res.json()
        setTenants(data.tenants)
      }
    } catch (error) {
      console.error('Failed to load tenants', error)
    }
  }

  const createUser = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        await loadUsers()
        setCreateDrawer(false)
        resetForm()
        alert('User created successfully!')
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to create user')
      }
    } catch (error) {
      alert('Failed to create user')
    } finally {
      setSubmitting(false)
    }
  }

  const updateUser = async () => {
    if (!selectedUser) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          username: form.username,
          firstName: form.firstName,
          lastName: form.lastName,
          role: form.role,
          status: selectedUser.status,
        }),
      })
      if (res.ok) {
        await loadUsers()
        setEditDrawer(false)
        setSelectedUser(null)
        resetForm()
        alert('User updated successfully!')
      } else {
        alert('Failed to update user')
      }
    } catch (error) {
      alert('Failed to update user')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleUserStatus = async (user: User) => {
    const endpoint = user.status === 'ACTIVE' ? 'suspend' : 'activate'
    try {
      const res = await fetch(`/api/users/${user.id}/${endpoint}`, {
        method: 'POST',
      })
      if (res.ok) {
        await loadUsers()
      }
    } catch (error) {
      alert('Failed to update user status')
    }
  }

  const deleteUser = async (user: User) => {
    if (!confirm(`Delete user ${user.email}? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        await loadUsers()
        alert('User deleted successfully')
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete user')
      }
    } catch (error) {
      alert('Failed to delete user')
    }
  }

  const openEdit = (user: User) => {
    setSelectedUser(user)
    setForm({
      email: user.email,
      username: user.username || '',
      password: '',
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as any,
      tenantId: user.tenantProfile?.tenantId || '',
    })
    setEditDrawer(true)
  }

  const resetForm = () => {
    setForm({
      email: '',
      username: '',
      password: '',
      firstName: '',
      lastName: '',
      role: 'EMPLOYEE',
      tenantId: '',
    })
  }

  const filteredUsers = users.filter((user) => {
    const q = search.toLowerCase()
    return (
      user.email.toLowerCase().includes(q) ||
      user.firstName.toLowerCase().includes(q) ||
      user.lastName.toLowerCase().includes(q) ||
      (user.username && user.username.toLowerCase().includes(q))
    )
  })

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      ADMIN: 'bg-purple-100 text-purple-700 border-purple-200',
      EMPLOYEE: 'bg-blue-100 text-blue-700 border-blue-200',
      TENANT: 'bg-green-100 text-green-700 border-green-200',
    }
    return colors[role] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  const getStatusBadgeColor = (status: string) => {
    return status === 'ACTIVE'
      ? 'bg-green-100 text-green-700 border-green-200'
      : 'bg-red-100 text-red-700 border-red-200'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-4 text-slate-600">Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">User Management</h2>
          <p className="text-sm text-slate-600 mt-1">Manage system users and access control</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setCreateDrawer(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create User
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">User</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Email</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Role</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Last Login</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-slate-900">
                      {user.firstName} {user.lastName}
                    </p>
                    {user.username && <p className="text-sm text-slate-500">@{user.username}</p>}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{user.email}</td>
                <td className="px-6 py-4">
                  <span className={`text-xs px-2 py-1 rounded-full border ${getRoleBadgeColor(user.role)}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-xs px-2 py-1 rounded-full border ${getStatusBadgeColor(user.status)}`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEdit(user)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit3 className="w-4 h-4 text-slate-600" />
                    </button>
                    <button
                      onClick={() => toggleUserStatus(user)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      title={user.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                    >
                      {user.status === 'ACTIVE' ? (
                        <PowerOff className="w-4 h-4 text-orange-600" />
                      ) : (
                        <Power className="w-4 h-4 text-green-600" />
                      )}
                    </button>
                    <button
                      onClick={() => deleteUser(user)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-slate-500">No users found</div>
        )}
      </div>

      {/* Create User Drawer */}
      {createDrawer && (
        <Drawer title="Create User" onClose={() => setCreateDrawer(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">First Name *</label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Last Name *</label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-4 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Username (Optional)</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-4 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Password *</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-4 py-2"
                placeholder="Minimum 8 characters"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Role *</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as any })}
                className="w-full border border-slate-300 rounded-lg px-4 py-2"
              >
                <option value="ADMIN">Admin</option>
                <option value="EMPLOYEE">Employee</option>
                <option value="TENANT">Tenant</option>
              </select>
            </div>

            {form.role === 'TENANT' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Link to Tenant</label>
                <select
                  value={form.tenantId}
                  onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2"
                >
                  <option value="">Select Tenant...</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name} ({tenant.email})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6 pt-6 border-t border-slate-200">
            <button
              onClick={() => setCreateDrawer(false)}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={createUser}
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </Drawer>
      )}

      {/* Edit User Drawer */}
      {editDrawer && selectedUser && (
        <Drawer title="Edit User" onClose={() => setEditDrawer(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">First Name *</label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Last Name *</label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-4 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-4 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Role *</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as any })}
                className="w-full border border-slate-300 rounded-lg px-4 py-2"
              >
                <option value="ADMIN">Admin</option>
                <option value="EMPLOYEE">Employee</option>
                <option value="TENANT">Tenant</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-6 border-t border-slate-200">
            <button
              onClick={() => setEditDrawer(false)}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={updateUser}
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50"
            >
              {submitting ? 'Updating...' : 'Update User'}
            </button>
          </div>
        </Drawer>
      )}
    </div>
  )
}

function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
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
      </motion.div>
    </div>
  )
}
