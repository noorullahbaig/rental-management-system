const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Add state
if (!content.includes('const [tenancyWizardStep,')) {
  content = content.replace(
    'const [tenancyDrawer, setTenancyDrawer] = useState(false)',
    'const [tenancyDrawer, setTenancyDrawer] = useState(false)\n  const [tenancyWizardStep, setTenancyWizardStep] = useState(1)'
  );
}

// Reset step on open
content = content.replace(
  'setTenancyDrawer(open)\n          if (!open) setTenancyCreateError(\'\')',
  'setTenancyDrawer(open)\n          if (!open) { setTenancyCreateError(\'\'); setTenancyWizardStep(1); }'
);

const drawerTitleIndex = content.indexOf('title="Add Tenancy"');
const footerStart = content.indexOf('footer={\n          <SaveButton', drawerTitleIndex);

if (footerStart > 0) {
  const footerEnd = content.indexOf('          </SaveButton>\n        }', footerStart) + 33;
  
  const newFooter = `footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map(s => (
                <div key={s} className={\`w-12 h-2 rounded-full transition-colors duration-300 \${tenancyWizardStep >= s ? 'bg-indigo-600' : 'bg-slate-200'}\`} />
              ))}
            </div>
            <div className="flex items-center gap-3">
              {tenancyWizardStep > 1 && (
                <button
                  type="button"
                  onClick={() => setTenancyWizardStep(tenancyWizardStep - 1)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Back
                </button>
              )}
              {tenancyWizardStep < 4 ? (
                <button
                  type="button"
                  onClick={() => setTenancyWizardStep(tenancyWizardStep + 1)}
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors"
                >
                  Next Step
                </button>
              ) : (
                <SaveButton
                  onClick={createTenancy}
                  disabled={!selectedPropertyId || !tenancyDraft.tenantId || !tenancyDraft.expirationDate}
                  busy={tenancyCreateSaving}
                  busyLabel="Saving..."
                  error={tenancyCreateError}
                >
                  Save Tenancy
                </SaveButton>
              )}
            </div>
          </div>
        }`;
        
  content = content.substring(0, footerStart) + newFooter + content.substring(footerEnd);
} else {
  console.log("Could not find footer!");
}

// Now the specific SectionCards inside the Tenancy Drawer
const sec1Start = content.indexOf('<SectionCard\n            title="Tenant and property assignment"', drawerTitleIndex);
content = content.substring(0, sec1Start) + '{tenancyWizardStep === 1 && (<div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-4">' + content.substring(sec1Start);

const sec2Start = content.indexOf('<SectionCard\n            title="Dates and terms"', sec1Start);
content = content.substring(0, sec2Start) + '</div>)}\n          {tenancyWizardStep === 2 && (<div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-4">' + content.substring(sec2Start);

const sec3Start = content.indexOf('<SectionCard\n            title="Financial setup"', sec2Start);
content = content.substring(0, sec3Start) + '</div>)}\n          {tenancyWizardStep === 3 && (<div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-4">' + content.substring(sec3Start);

const sec4Start = content.indexOf('<SectionCard\n            title="Utilities & accounts"', sec3Start);
content = content.substring(0, sec4Start) + '</div>)}\n          {tenancyWizardStep === 4 && (<div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-4">' + content.substring(sec4Start);

// Close the 4th step!
// Find the closing Drawer tags for the Tenancy Drawer
const sec4End = content.indexOf('          </SectionCard>\n        </div>\n      </Drawer>', sec4Start);
content = content.substring(0, sec4End) + '          </SectionCard>\n          </div>)}\n        </div>\n      </Drawer>' + content.substring(sec4End + 55);

fs.writeFileSync('src/App.tsx', content);
