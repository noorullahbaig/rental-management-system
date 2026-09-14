import React, { useState, useMemo } from 'react'
import { 
  Building2, 
  Users, 
  DollarSign, 
  Wrench, 
  Edit3, 
  Trash2, 
  Plus, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle,
  Search,
  ChevronRight,
  Maximize2,
  Calendar,
  Layers,
  ArrowUpRight
} from 'lucide-react'
import type { Property, Tenancy, Tenant, RenovationItem } from '../types'

type Section = 'overview' | 'properties' | 'tenants' | 'reports'

interface PropertyWorkspaceProps {
  properties: Property[]
  tenancies: Tenancy[]
  tenants: Tenant[]
  selectedPropertyId: string | null
  searchQuery?: string
  onSelectProperty: (id: string) => void
  onOpenCreateProperty: () => void
  onOpenEditProperty: (property: Property) => void
  onDeleteProperty: (id: string) => void
  onOpenRenovationDrawer: (propertyId: string) => void
  onEditRenovation: (renovation: RenovationItem, propertyId: string) => void
  onOpenTenancyDrawer: (propertyId?: string) => void
  onNavigate: (section: Section) => void
}

type TabType = 'specs' | 'lease' | 'renovations'
type FilterType = 'all' | 'occupied' | 'vacant'

export default function PropertyWorkspace({
  properties,
  tenancies,
  tenants,
  selectedPropertyId,
  onSelectProperty,
  onOpenCreateProperty,
  onOpenEditProperty,
  onDeleteProperty,
  onOpenRenovationDrawer,
  onEditRenovation,
  onOpenTenancyDrawer,
  onNavigate,
  searchQuery = '',
}: PropertyWorkspaceProps) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [activeTab, setActiveTab] = useState<TabType>('specs')

  // Find currently selected property or default to first
  const selectedProperty = useMemo(() => {
    return properties.find((p) => p.id === selectedPropertyId) || properties[0] || null
  }, [properties, selectedPropertyId])

  // Get active tenancy for any property
  const getActiveTenancy = (propId: string) => {
    return tenancies.find(
      (t) => t.propertyId === propId && !t.closedEarly && t.status !== 'Closed Early' && t.status !== 'Expired'
    )
  }

  // Selected property active tenancy and tenant
  const activeTenancy = selectedProperty ? getActiveTenancy(selectedProperty.id) : null
  const activeTenant = activeTenancy ? tenants.find((t) => t.id === activeTenancy.tenantId) : null

  // Filtered properties list
  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      const tenancy = getActiveTenancy(p.id)
      const isOccupied = !!tenancy

      if (filter === 'occupied' && !isOccupied) return false
      if (filter === 'vacant' && isOccupied) return false

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchSerial = p.serialNumber.toLowerCase().includes(query)
        const matchAddress = p.address.streetAddress.toLowerCase().includes(query) || p.address.unitNumber.toLowerCase().includes(query)
        const matchProject = p.projectName.toLowerCase().includes(query)
        return matchSerial || matchAddress || matchProject
      }

      return true
    })
  }, [properties, tenancies, filter, searchQuery])

  // Occupancy counts
  const occupiedCount = properties.filter((p) => !!getActiveTenancy(p.id)).length
  const vacantCount = properties.length - occupiedCount

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: 0 }).format(val)

  return (
    <div className="grid gap-3.5 xl:grid-cols-[1.05fr_1.25fr] max-w-[1400px] h-[calc(100vh-140px)] min-h-[520px]">
      {/* LEFT COLUMN: Properties Registry Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm flex flex-col overflow-hidden">
        {/* Top Control Bar: Clean Filter Pills */}
        <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                filter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({properties.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('occupied')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                filter === 'occupied' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              Occupied ({occupiedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('vacant')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                filter === 'vacant' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Vacant ({vacantCount})
            </button>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            {filteredProperties.length} of {properties.length} shown
          </span>
        </div>

        {/* Properties Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-100 sticky top-0 font-semibold z-10">
              <tr>
                <th className="px-3 py-2">Unit / Project</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Monthly Rent</th>
                <th className="px-3 py-2 text-right">Market Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProperties.map((property) => {
                const tenancy = getActiveTenancy(property.id)
                const isSelected = selectedProperty?.id === property.id

                return (
                  <tr
                    key={property.id}
                    onClick={() => onSelectProperty(property.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-indigo-50/80 font-medium' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-1 py-0.5 rounded">
                          {property.serialNumber}
                        </span>
                        <span className="font-semibold text-slate-900 truncate max-w-[140px]">
                          {property.address.unitNumber || property.projectName}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate max-w-[190px] mt-0.5">
                        {property.projectName ? `${property.projectName} · ` : ''}{property.address.streetAddress}
                      </p>
                    </td>
                    <td className="px-3 py-2.5">
                      {tenancy ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Occupied
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">
                          Vacant
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-slate-900">
                      {tenancy ? formatCurrency(tenancy.rentalTerms.monthlyGross) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-slate-700">
                      {formatCurrency(property.marketValue || property.spaPrice)}
                    </td>
                  </tr>
                )
              })}
              {filteredProperties.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-xs text-slate-400">
                    No properties matching this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RIGHT COLUMN: Unified Property Inspector */}
      {selectedProperty ? (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm flex flex-col overflow-hidden">
          {/* 1. Header Toolbar */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/40 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  {selectedProperty.address.unitNumber ? `Unit ${selectedProperty.address.unitNumber}` : selectedProperty.projectName}
                </h3>
                <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-200/70 px-1.5 py-0.5 rounded">
                  {selectedProperty.serialNumber}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                  {selectedProperty.kind} · {selectedProperty.ownership}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {selectedProperty.projectName ? `${selectedProperty.projectName}, ` : ''}{selectedProperty.address.streetAddress}, {selectedProperty.address.cityState}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onOpenEditProperty(selectedProperty)}
                className="flex items-center gap-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors"
                title="Edit Property"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDeleteProperty(selectedProperty.id)}
                className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-lg transition-colors"
                title="Delete Property"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 2. Compact Valuation Strip */}
          <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 grid grid-cols-4 gap-2 text-center text-xs">
            <div>
              <p className="text-[10px] text-slate-400 font-medium">Purchase SPA</p>
              <p className="font-bold text-slate-800">{formatCurrency(selectedProperty.spaPrice)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium">Market Value</p>
              <p className="font-bold text-slate-900">{formatCurrency(selectedProperty.marketValue)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium">Book Value</p>
              <p className="font-bold text-slate-800">{formatCurrency(selectedProperty.bookValue)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium">Gross Yield</p>
              <p className="font-bold text-emerald-600">
                {activeTenancy && selectedProperty.marketValue > 0
                  ? `${((activeTenancy.rentalTerms.monthlyGross * 12 / selectedProperty.marketValue) * 100).toFixed(1)}%`
                  : '—'}
              </p>
            </div>
          </div>

          {/* 3. Segmented Navigation Tabs */}
          <div className="px-4 pt-3 border-b border-slate-100 flex items-center gap-2">
            {[
              { id: 'specs', label: 'Specs & Inventory' },
              { id: 'lease', label: 'Active Lease & Deductions' },
              { id: 'renovations', label: `Renovations (${selectedProperty.renovations?.length || 0})` },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as TabType)}
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
            {/* TAB 1: Specs & Inventory */}
            {activeTab === 'specs' && (
              <div className="space-y-3.5">
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Physical Specifications</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 text-center">
                      <p className="text-[10px] text-slate-400 font-medium">Floor Area</p>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">
                        {selectedProperty.squareFeet ? `${selectedProperty.squareFeet} sqft` : '—'}
                      </p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 text-center">
                      <p className="text-[10px] text-slate-400 font-medium">Bedrooms</p>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">
                        {selectedProperty.numberOfRooms ? `${selectedProperty.numberOfRooms} Rooms` : '—'}
                      </p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 text-center">
                      <p className="text-[10px] text-slate-400 font-medium">Car Parks</p>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">
                        {selectedProperty.carParks ? `${selectedProperty.carParks} Bays` : '—'}
                      </p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 text-center">
                      <p className="text-[10px] text-slate-400 font-medium">Ceiling Fans</p>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">
                        {selectedProperty.ceilingFans ? `${selectedProperty.ceilingFans} Fans` : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Furnishings & Appliances</h4>
                  <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {selectedProperty.otherAppliances || 'No appliances or inventory recorded.'}
                    </p>
                  </div>
                </div>

                {selectedProperty.developerName && (
                  <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span>Developer: <strong className="text-slate-700">{selectedProperty.developerName}</strong></span>
                    <span>Class: <strong className="text-slate-700">{selectedProperty.kind}</strong></span>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Lease & Deductions */}
            {activeTab === 'lease' && (
              <div className="space-y-4">
                {activeTenancy ? (
                  <>
                    {/* Active Tenancy Card */}
                    <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-800">Leased to {activeTenant?.name}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-200/80 text-emerald-900">
                            {activeTenancy.status}
                          </span>
                        </div>
                        <p className="text-xs text-emerald-700 mt-1">
                          Commenced: {activeTenancy.commencementDate} · Expires: {activeTenancy.expirationDate}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold text-slate-900">{formatCurrency(activeTenancy.rentalTerms.monthlyGross)}</p>
                        <p className="text-[10px] text-slate-500">Net: {formatCurrency(activeTenancy.rentalTerms.monthlyNet)}/mo</p>
                      </div>
                    </div>

                    {/* Deductions Matrix */}
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Monthly Operating Outflows</h4>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-slate-50 border border-slate-200/80 p-2 rounded">
                          <p className="text-[10px] text-slate-400">Maintenance Fee</p>
                          <p className="font-semibold text-slate-900">{formatCurrency(activeTenancy.deductions.maintenanceCharges)}</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-200/80 p-2 rounded">
                          <p className="text-[10px] text-slate-400">Sinking Fund</p>
                          <p className="font-semibold text-slate-900">{formatCurrency(activeTenancy.deductions.sinkingFundPayment)}</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-200/80 p-2 rounded">
                          <p className="text-[10px] text-slate-400">Quit Rent</p>
                          <p className="font-semibold text-slate-900">{formatCurrency(activeTenancy.deductions.quitRent)}</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-200/80 p-2 rounded">
                          <p className="text-[10px] text-slate-400">Assessment</p>
                          <p className="font-semibold text-slate-900">{formatCurrency(activeTenancy.deductions.assessment)}</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-200/80 p-2 rounded">
                          <p className="text-[10px] text-slate-400">Fire Insurance</p>
                          <p className="font-semibold text-slate-900">{formatCurrency(activeTenancy.deductions.fireInsurancePremium)}</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-200/80 p-2 rounded">
                          <p className="text-[10px] text-slate-400">Cost of Funds</p>
                          <p className="font-semibold text-slate-900">{formatCurrency(activeTenancy.deductions.bankCostOfFunds)}</p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <h4 className="text-sm font-bold text-slate-800">Unit is Currently Vacant</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      There is no active tenancy attached to this property. Create a lease to start collecting rent.
                    </p>
                    <button
                      type="button"
                      onClick={() => onOpenTenancyDrawer(selectedProperty.id)}
                      className="mt-3.5 inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Setup Tenancy for this Unit
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Renovations & CapEx */}
            {activeTab === 'renovations' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Capital Expenditure Items</h4>
                  <button
                    type="button"
                    onClick={() => onOpenRenovationDrawer(selectedProperty.id)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Renovation
                  </button>
                </div>

                {selectedProperty.renovations && selectedProperty.renovations.length > 0 ? (
                  <div className="space-y-2">
                    {selectedProperty.renovations.map((renovation) => (
                      <div
                        key={renovation.id}
                        className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 flex items-center justify-between group hover:bg-white hover:border-indigo-200 transition-all text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{renovation.description}</p>
                          <p className="text-slate-500 text-[11px] mt-0.5">
                            {formatCurrency(renovation.amountPaid)} · {renovation.paymentDate || 'No date'} · Depreciates over {renovation.depreciationPeriod} yrs
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onEditRenovation(renovation, selectedProperty.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-all"
                          title="Edit Item"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-xs text-slate-500">No renovation or CapEx items recorded for this property.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 flex items-center justify-center">
          Select a property from the left roster to view details.
        </div>
      )}
    </div>
  )
}
