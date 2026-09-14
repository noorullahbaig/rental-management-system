const fs = require('fs');

let content = fs.readFileSync('functions/api/[[route]].ts', 'utf-8');

const routeCode = `

// --- DASHBOARD STATS ---
app.get('/dashboard-stats', requireRole('ADMIN', 'EMPLOYEE'), async (c) => {
  const prisma = c.var.prisma
  
  // 1. Metrics
  const totalProperties = await prisma.property.count()
  const activeTenancies = await prisma.tenancy.count({
    where: { status: 'ACTIVE' }
  })
  
  // 2. Pending Verifications
  const pendingReceipts = await prisma.paymentReceipt.findMany({
    where: { verificationStatus: 'PENDING' },
    include: { tenancy: { include: { tenant: true, property: true } } },
    orderBy: { uploadedAt: 'desc' }
  })
  
  // 3. Open Maintenance
  const openMaintenance = await prisma.maintenanceRequest.findMany({
    where: { status: { in: ['SUBMITTED', 'ACKNOWLEDGED', 'IN_PROGRESS'] } },
    include: { tenancy: { include: { tenant: true, property: true } } },
    orderBy: { submittedDate: 'desc' }
  })
  
  // 4. Expiring Leases (within next 60 days)
  const now = new Date()
  const in60Days = new Date()
  in60Days.setDate(in60Days.getDate() + 60)
  
  const expiringLeases = await prisma.tenancy.findMany({
    where: {
      status: 'ACTIVE',
      // We do a simple fetch all active and filter in memory since sqlite string dates are hard to compare reliably sometimes
    },
    include: { tenant: true, property: true }
  })
  
  const filteredExpiring = expiringLeases.filter((t: any) => {
    const expDate = new Date(t.expirationDate)
    return expDate <= in60Days && expDate >= now
  }).sort((a: any, b: any) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime())

  // Calculate current month expected rent vs collected (Optional, but let's do a simple version based on rentCollections)
  const currentMonthPrefix = now.toISOString().slice(0, 7) // YYYY-MM
  const currentMonthCollections = await prisma.rentCollectionRecord.findMany({
    where: { expectedCollectionDate: { startsWith: currentMonthPrefix } }
  })
  
  const totalExpectedRent = currentMonthCollections.reduce((sum: number, rc: any) => sum + (rc.expectedAmount || 0), 0)
  const totalCollectedRent = currentMonthCollections.reduce((sum: number, rc: any) => sum + rc.amountCollected, 0)
  
  return c.json({
    metrics: {
      totalProperties,
      activeTenancies,
      occupancyRate: totalProperties > 0 ? Math.round((activeTenancies / totalProperties) * 100) : 0,
      currentMonthExpected: totalExpectedRent,
      currentMonthCollected: totalCollectedRent
    },
    pendingReceipts,
    openMaintenance,
    expiringLeases: filteredExpiring
  })
})
`;

const targetAnchor = "app.get('/properties'";
const insertIndex = content.indexOf(targetAnchor);

if (insertIndex !== -1) {
  content = content.substring(0, insertIndex) + routeCode + content.substring(insertIndex);
  fs.writeFileSync('functions/api/[[route]].ts', content);
  console.log("Backend route added successfully.");
} else {
  console.log("Could not find anchor.");
}
