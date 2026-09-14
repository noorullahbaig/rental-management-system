const fs = require('fs');
let content = fs.readFileSync('src/api.ts', 'utf-8');

const fetcher = `
export async function fetchDashboardStats() {
  return request('/dashboard-stats')
}
`;

content += fetcher;
fs.writeFileSync('src/api.ts', content);
