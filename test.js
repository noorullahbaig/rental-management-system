const tenancy = { commencementDate: '2025-12-01', expirationDate: '2026-12-01', dateOfCollection: '2026-05-01', monthlyGross: 3500, rentCollections: [{expectedCollectionDate: '2026-05-01', amountCollected: 3500}] };
const paymentReceipts = [];
  const obligations = [];
  const start = new Date(tenancy.commencementDate);
  const end = new Date("2026-09-14");
  end.setMonth(end.getMonth() + 1); // look ahead 1 month
  const expiry = new Date(tenancy.expirationDate);
  
  const actualEnd = end > expiry ? expiry : end;
  
  let current = new Date(start.getFullYear(), start.getMonth(), 1);
  const endLimit = new Date(actualEnd.getFullYear(), actualEnd.getMonth(), 1);
  
  while (current <= endLimit) {
    const year = current.getFullYear();
    const month = current.getMonth() + 1; // 1-12
    const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
    const dueDay = parseInt(tenancy.dateOfCollection.split('-')[2] || '1', 10);
    const dueDate = new Date(year, month - 1, dueDay);
    const dueDateStr = dueDate.toISOString().split('T')[0];
    
    const rc = tenancy.rentCollections?.find(r => r.expectedCollectionDate.startsWith(monthStr));
    const receipt = paymentReceipts.find(r => r.paymentDate.startsWith(monthStr));
    
    let status = 'UNPAID';
    if (rc && rc.amountCollected >= tenancy.monthlyGross) status = 'PAID';
    
    obligations.push({ monthLabel: monthStr, dueDate: dueDateStr, status });
    current.setMonth(current.getMonth() + 1);
  }
console.log(obligations);
