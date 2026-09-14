const fs = require('fs');

let content = fs.readFileSync('functions/api/[[route]].ts', 'utf-8');

const oldStart = content.indexOf("// --- DASHBOARD STATS ---");
const oldEnd = content.indexOf("app.get('/properties'", oldStart);

const newRoute = `// --- DASHBOARD STATS ---
app.get('/dashboard-stats', requireRole('ADMIN', 'EMPLOYEE'), async (c) => {
  const prisma = c.var.prisma
  
  // 1. Total Properties
  const totalProperties = await prisma.property.count()
  
  // 2. Active Tenancies (Status in Active, Late Collection, Expiring and not closed early)
  const allTenancies = await prisma.tenancy.findMany({
    include: {
      tenant: true,
      property: true,
    }
  })
  
  const activeTenanciesList = allTenancies.filter((t: any) => 
    !t.closedEarly && t.status !== 'Closed Early' && t.status !== 'Expired'
  )
  const activeCount = activeTenanciesList.length
  
  // Calculate total monthly gross rent of all active tenancies
  const monthlyGrossTotal = activeTenanciesList.reduce((sum: number, t: any) => sum + (t.monthlyGross || 0), 0)
  
  // 3. Pending Verifications
  const pendingReceipts = await prisma.paymentReceipt.findMany({
    where: { verificationStatus: 'PENDING' },
    include: { tenancy: { include: { tenant: true, property: true } } },
    orderBy: { uploadedAt: 'desc' }
  })
  
  // 4. Open Maintenance
  const openMaintenance = await prisma.maintenanceRequest.findMany({
    where: { status: { in: ['SUBMITTED', 'ACKNOWLEDGED', 'IN_PROGRESS'] } },
    include: { tenancy: { include: { tenant: true, property: true } } },
    orderBy: { submittedDate: 'desc' }
  })
  
  // 5. Expiring Leases (within next 90 days or overdue for renewal)
  const now = new Date()
  const in90Days = new Date()
  in90Days.setDate(in90Days.getDate() + 90)
  
  const expiringLeases = activeTenanciesList
    .map((t: any) => {
      const expDate = new Date(t.expirationDate)
      const diffTime = expDate.getTime() - now.getTime()
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return {
        ...t,
        daysRemaining
      }
    })
    .filter((t: any) => t.daysRemaining <= 90)
    .sort((a: any, b: any) => a.daysRemaining - b.daysRemaining)

  return c.json({
    metrics: {
      totalProperties,
      activeTenancies: activeCount,
      occupancyRate: totalProperties > 0 ? Math.round((activeCount / totalProperties) * 100) : 0,
      currentMonthExpected: monthlyGrossTotal,
      currentMonthCollected: 0,
    },
    pendingReceipts,
    openMaintenance,
    expiringLeases
  })
})
`;

content = content.substring(0, oldStart) + newRoute + content.substring(oldEnd);
fs.writeFileSync('functions/api/[[route]].ts', content);
console.log("Backend stats route patched successfully.");
