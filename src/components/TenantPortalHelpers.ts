export function generateRentObligations(tenancy: any, paymentReceipts: any[]) {
  if (!tenancy) return [];
  
  const obligations = [];
  const start = new Date(tenancy.commencementDate);
  const end = new Date();
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
    const dueDateStr = `${year}-${month.toString().padStart(2, '0')}-${dueDay.toString().padStart(2, '0')}`;
    const dueDate = new Date(year, month - 1, dueDay);
    
    const rc = tenancy.rentCollections?.find((r: any) => r.expectedCollectionDate.startsWith(monthStr));
    const receipt = paymentReceipts.find((r: any) => r.paymentDate.startsWith(monthStr));
    
    let status = 'UNPAID';
    if (rc && rc.amountCollected >= tenancy.monthlyGross) {
      status = 'PAID';
    } else if (receipt) {
      if (receipt.verificationStatus === 'VERIFIED') status = 'PAID';
      else if (receipt.verificationStatus === 'REJECTED') status = 'REJECTED';
      else status = 'PENDING_VERIFICATION';
    } else if (dueDate < new Date()) {
      status = 'OVERDUE';
    }
    
    obligations.push({
      id: `obl-${monthStr}`,
      monthLabel: dueDate.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' }),
      dueDateStr,
      dueDateObj: dueDate,
      amount: tenancy.monthlyGross,
      status,
      rc,
      receipt
    });
    
    current.setMonth(current.getMonth() + 1);
  }
  
  return obligations.sort((a, b) => b.dueDateStr.localeCompare(a.dueDateStr));
}
