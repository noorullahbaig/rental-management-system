const fs = require('fs');

let content = fs.readFileSync('src/components/TenantPortal.tsx', 'utf-8');

// Add import for generateRentObligations
if (!content.includes('generateRentObligations')) {
  content = content.replace("import { motion, AnimatePresence } from 'framer-motion'", "import { motion, AnimatePresence } from 'framer-motion'\nimport { generateRentObligations } from './TenantPortalHelpers'");
}

// Update getStatusColor
content = content.replace(
  "OVERDUE: 'bg-red-500/10 text-red-600 border-red-500/20',",
  "OVERDUE: 'bg-red-500/10 text-red-600 border-red-500/20',\n      UNPAID: 'bg-orange-500/10 text-orange-600 border-orange-500/20',\n      PENDING_VERIFICATION: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',"
);

// Replace DashboardSection pending logic
const dashboardRegex = /const pendingPayments = paymentReceipts\.filter\(\(r: any\) => r\.verificationStatus === 'PENDING'\)\.length/;
content = content.replace(dashboardRegex, `const pendingPayments = paymentReceipts.filter((r: any) => r.verificationStatus === 'PENDING').length
  const rentObligations = generateRentObligations(tenancy, paymentReceipts);
  const nextObligation = rentObligations.find(o => o.status === 'UNPAID' || o.status === 'OVERDUE') || rentObligations[0];
`);

const dashboardRentCard = /<p className="text-sm text-slate-600">Monthly Rent<\/p>\s*<p className="text-2xl font-bold text-slate-900 mt-1">\s*\{tenancy \? currency\(tenancy.monthlyGross\) : '-'\}\s*<\/p>/;
content = content.replace(dashboardRentCard, `<p className="text-sm text-slate-600">Next Rent Due</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {nextObligation ? currency(nextObligation.amount) : (tenancy ? currency(tenancy.monthlyGross) : '-')}
              </p>
              {nextObligation && (
                <p className={\`text-xs mt-1 font-medium \${nextObligation.status === 'OVERDUE' ? 'text-red-500' : 'text-slate-500'}\`}>
                  {nextObligation.status === 'OVERDUE' ? 'Overdue!' : \`Due \${formatDate(nextObligation.dueDateStr)}\`}
                </p>
              )}`);

fs.writeFileSync('src/components/TenantPortal.tsx', content);
