const fs = require('fs');
let content = fs.readFileSync('src/components/TenantPortal.tsx', 'utf-8');

// 1. Replace Maintenance Drawer
const oldDrawerStart = content.indexOf('{maintenanceDrawer && (');
const oldDrawerEnd = content.indexOf('      {paymentDrawer && (', oldDrawerStart);

const newDrawer = `{maintenanceDrawer && (
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
                    className={\`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all \${
                      maintenanceForm.category === cat.id
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50 text-slate-600'
                    }\`}
                  >
                    <cat.icon className={\`w-6 h-6 mb-2 \${maintenanceForm.category === cat.id ? 'text-indigo-600' : 'text-slate-400'}\`} />
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
                    className={\`text-left p-3 rounded-xl border transition-all \${urg.color} \${
                      maintenanceForm.urgency === urg.id ? urg.active : ''
                    }\`}
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

      `;

content = content.substring(0, oldDrawerStart) + newDrawer + content.substring(oldDrawerEnd);

// 2. Replace MaintenanceSection
const oldMaintStart = content.indexOf('function MaintenanceSection({');
const oldMaintEnd = content.indexOf('// Utilities Section', oldMaintStart);

const newMaint = `function MaintenanceSection({ maintenanceRequests, formatDate, getStatusColor, onSubmit }: any) {
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
                    <span className={\`text-xs px-2.5 py-1 rounded-full font-medium border \${getStatusColor(request.status)}\`}>
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
                    style={{ width: \`\${(getTimelineSteps(request.status).filter(s => s.isCompleted).length - 1) * 33.33}%\` }}
                  />
                  
                  {getTimelineSteps(request.status).map((step, i) => (
                    <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
                      <div className={\`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors duration-500 \${
                        step.isCompleted ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white border-slate-300 text-transparent'
                      }\`}>
                        {step.isCompleted && <CheckCircle className="w-3 h-3" />}
                      </div>
                      <span className={\`text-[10px] font-bold uppercase tracking-wider absolute top-8 text-center w-24 -ml-9 \${
                        step.isCurrent ? 'text-indigo-600' : step.isCompleted ? 'text-slate-700' : 'text-slate-400'
                      }\`}>
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

`;

content = content.substring(0, oldMaintStart) + newMaint + content.substring(oldMaintEnd);
fs.writeFileSync('src/components/TenantPortal.tsx', content);
