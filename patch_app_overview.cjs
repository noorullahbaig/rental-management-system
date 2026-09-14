const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add Import
content = content.replace(
  "import { Building2, Plus, Search,",
  "import AdminDashboard from './components/AdminDashboard'\nimport { Building2, Plus, Search,"
);

// 2. Replace section === 'overview' content
const startIdx = content.indexOf("{section === 'overview' && (");
const endIdx = content.indexOf("{section === 'properties' && (", startIdx);

if (startIdx !== -1 && endIdx !== -1) {
  const newOverview = `{section === 'overview' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <AdminDashboard onNavigate={setSection} />
                </div>
              )}

              `;
  content = content.substring(0, startIdx) + newOverview + content.substring(endIdx);
  fs.writeFileSync('src/App.tsx', content);
  console.log("App.tsx patched successfully.");
} else {
  console.log("Could not find overview section.");
}
