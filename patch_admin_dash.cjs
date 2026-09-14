const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf-8');

content = content.replace(
  "await fetch(`/api/payment-receipts/${id}/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' } })",
  "await fetch(`/api/payment-receipts/${id}/verify`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ verificationStatus: 'VERIFIED' }) })"
);

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
