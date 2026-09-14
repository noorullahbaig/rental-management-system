const fs = require('fs');
let content = fs.readFileSync('src/components/TenantPortal.tsx', 'utf-8');

const oldUtilStart = content.indexOf('// Utilities Section');
const oldUtilEnd = content.indexOf('// Profile Section', oldUtilStart);

const newUtil = `// Utilities Section
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
                <div className={\`absolute top-0 left-0 w-1 h-full \${bill.status === 'OVERDUE' ? 'bg-red-500' : 'bg-orange-500'}\`} />
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
                  <span className={\`text-xs px-2.5 py-1 rounded-full font-medium border \${getStatusColor(bill.status)}\`}>
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

`;
content = content.substring(0, oldUtilStart) + newUtil + content.substring(oldUtilEnd);
fs.writeFileSync('src/components/TenantPortal.tsx', content);
