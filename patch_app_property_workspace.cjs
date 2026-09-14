const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add PropertyWorkspace import
if (!content.includes("import PropertyWorkspace from './components/PropertyWorkspace'")) {
  content = content.replace(
    "import AdminDashboard from './components/AdminDashboard'",
    "import AdminDashboard from './components/AdminDashboard'\nimport PropertyWorkspace from './components/PropertyWorkspace'"
  );
}

// 2. Add wizard step states
if (!content.includes('const [propertyWizardStep,')) {
  content = content.replace(
    'const [propertyDrawer, setPropertyDrawer] = useState(false)',
    'const [propertyDrawer, setPropertyDrawer] = useState(false)\n  const [propertyWizardStep, setPropertyWizardStep] = useState(1)'
  );
}

if (!content.includes('const [propertyEditWizardStep,')) {
  content = content.replace(
    'const [propertyEditDrawer, setPropertyEditDrawer] = useState(false)',
    'const [propertyEditDrawer, setPropertyEditDrawer] = useState(false)\n  const [propertyEditWizardStep, setPropertyEditWizardStep] = useState(1)'
  );
}

// 3. Replace section === 'properties' block
const propStart = content.indexOf("{section === 'properties' && (");
const propEnd = content.indexOf("{section === 'tenants' && (", propStart);

if (propStart !== -1 && propEnd !== -1) {
  const newPropBlock = `{section === 'properties' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <PropertyWorkspace
                    properties={state.properties}
                    tenancies={state.tenancies}
                    tenants={state.tenants}
                    selectedPropertyId={selectedPropertyId}
                    onSelectProperty={setSelectedPropertyId}
                    onOpenCreateProperty={() => {
                      setPropertyWizardStep(1);
                      setPropertyDrawer(true);
                    }}
                    onOpenEditProperty={(prop) => {
                      setPropertyEditWizardStep(1);
                      openEditProperty(prop);
                    }}
                    onDeleteProperty={deleteProperty}
                    onOpenRenovationDrawer={(propId) => {
                      setSelectedPropertyId(propId);
                      setRenovationDrawer(true);
                    }}
                    onEditRenovation={(renovation, propId) => {
                      openEditRenovation(renovation, propId);
                    }}
                    onOpenTenancyDrawer={(propId) => {
                      if (propId) setSelectedPropertyId(propId);
                      setTenancyDrawer(true);
                    }}
                    onNavigate={setSection}
                  />
                </div>
              )}

              `;
  content = content.substring(0, propStart) + newPropBlock + content.substring(propEnd);
  console.log("Replaced properties section successfully.");
} else {
  console.error("Could not find section === 'properties' block");
}

fs.writeFileSync('src/App.tsx', content);
