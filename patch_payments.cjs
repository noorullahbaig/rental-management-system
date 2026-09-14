const fs = require('fs');

let content = fs.readFileSync('src/components/TenantPortal.tsx', 'utf-8');

const oldPaymentsStart = content.indexOf('function PaymentsSection(');
const oldPaymentsEnd = content.indexOf('// Maintenance Section', oldPaymentsStart);

const newPayments = `function PaymentsSection({ tenancy, paymentReceipts, currency, formatDate, getStatusColor, onUpload }: any) {
  const obligations = generateRentObligations(tenancy, paymentReceipts);
  const nextObligation = obligations.find(o => o.status === 'UNPAID' || o.status === 'OVERDUE') || obligations[0];

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
                    <span className={\`text-xs px-3 py-1.5 rounded-full border \${getStatusColor(obl.status)}\`}>
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

`;

content = content.substring(0, oldPaymentsStart) + newPayments + content.substring(oldPaymentsEnd);
fs.writeFileSync('src/components/TenantPortal.tsx', content);
