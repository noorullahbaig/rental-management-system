const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Patch Add Property Drawer (propertyDrawer)
const createDrawerStart = content.indexOf('title="Add Property"');
const createFooterStart = content.indexOf('footer={\n          <SaveButton\n            onClick={createProperty}', createDrawerStart);
const createFooterEnd = content.indexOf('</SaveButton>\n        }', createFooterStart) + 24;

const newCreateFooter = `footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex gap-1.5 items-center">
              <span className="text-xs font-bold text-slate-500">Step {propertyWizardStep} of 2:</span>
              <span className="text-xs font-semibold text-slate-800">
                {propertyWizardStep === 1 ? 'Location & Identity' : 'Valuation & Specs'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {propertyWizardStep === 2 && (
                <button
                  type="button"
                  onClick={() => setPropertyWizardStep(1)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Back
                </button>
              )}
              {propertyWizardStep === 1 ? (
                <button
                  type="button"
                  onClick={() => setPropertyWizardStep(2)}
                  disabled={!propertyDraft.address.streetAddress}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
                >
                  Next: Valuation & Specs
                </button>
              ) : (
                <SaveButton
                  onClick={createProperty}
                  disabled={!propertyDraft.address.streetAddress}
                  busy={propertyCreateSaving}
                  busyLabel="Saving..."
                  error={propertyCreateError}
                >
                  Save Property
                </SaveButton>
              )}
            </div>
          </div>
        }`;

content = content.substring(0, createFooterStart) + newCreateFooter + content.substring(createFooterEnd);

// Reset step on open
content = content.replace(
  "setPropertyDrawer(open)\n          if (!open) setPropertyCreateError('')",
  "setPropertyDrawer(open)\n          if (!open) { setPropertyCreateError(''); setPropertyWizardStep(1); }"
);

// Wrap step 1 and step 2 inside propertyDrawer
const pIdentityStart = content.indexOf('<SectionCard title="Identity" description="Start with the property class', createDrawerStart);
content = content.substring(0, pIdentityStart) + '{propertyWizardStep === 1 && (<div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">' + content.substring(pIdentityStart);

const pValuationStart = content.indexOf('<SectionCard title="Ownership and value"', pIdentityStart);
content = content.substring(0, pValuationStart) + '</div>)}\n          {propertyWizardStep === 2 && (<div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">' + content.substring(pValuationStart);

const pCreateEnd = content.indexOf('          </SectionCard>\n        </div>\n      </Drawer>\n\n      <Drawer\n        title="Add Tenant"', pValuationStart);
content = content.substring(0, pCreateEnd) + '          </SectionCard>\n          </div>)}\n        </div>\n      </Drawer>\n\n      <Drawer\n        title="Add Tenant"' + content.substring(pCreateEnd + 90);

// 2. Patch Edit Property Drawer (propertyEditDrawer)
const editDrawerStart = content.indexOf('title="Edit Property"');
const editFooterStart = content.indexOf('footer={\n          <SaveButton\n            onClick={updateProperty}', editDrawerStart);
const editFooterEnd = content.indexOf('</SaveButton>\n        }', editFooterStart) + 24;

const newEditFooter = `footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex gap-1.5 items-center">
              <span className="text-xs font-bold text-slate-500">Step {propertyEditWizardStep} of 2:</span>
              <span className="text-xs font-semibold text-slate-800">
                {propertyEditWizardStep === 1 ? 'Location & Identity' : 'Valuation & Specs'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {propertyEditWizardStep === 2 && (
                <button
                  type="button"
                  onClick={() => setPropertyEditWizardStep(1)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Back
                </button>
              )}
              {propertyEditWizardStep === 1 ? (
                <button
                  type="button"
                  onClick={() => setPropertyEditWizardStep(2)}
                  disabled={!propertyEditDraft.address.streetAddress}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
                >
                  Next: Valuation & Specs
                </button>
              ) : (
                <SaveButton
                  onClick={updateProperty}
                  disabled={!propertyEditDraft.address.streetAddress}
                  busy={propertyEditSaving}
                  busyLabel="Updating..."
                  error={propertyEditError}
                >
                  Update Property
                </SaveButton>
              )}
            </div>
          </div>
        }`;

content = content.substring(0, editFooterStart) + newEditFooter + content.substring(editFooterEnd);

// Reset step on edit open
content = content.replace(
  "setPropertyEditDrawer(open)\n          if (!open) setPropertyEditError('')",
  "setPropertyEditDrawer(open)\n          if (!open) { setPropertyEditError(''); setPropertyEditWizardStep(1); }"
);

// Wrap step 1 and step 2 inside propertyEditDrawer
const peIdentityStart = content.indexOf('<SectionCard title="Identity" description="Property class used in searches', editDrawerStart);
content = content.substring(0, peIdentityStart) + '{propertyEditWizardStep === 1 && (<div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">' + content.substring(peIdentityStart);

const peValuationStart = content.indexOf('<SectionCard title="Ownership and value"', peIdentityStart);
content = content.substring(0, peValuationStart) + '</div>)}\n          {propertyEditWizardStep === 2 && (<div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">' + content.substring(peValuationStart);

const peEditEnd = content.indexOf('          </SectionCard>\n        </div>\n      </Drawer>\n\n      <Drawer\n        title="Edit Tenant"', peValuationStart);
content = content.substring(0, peEditEnd) + '          </SectionCard>\n          </div>)}\n        </div>\n      </Drawer>\n\n      <Drawer\n        title="Edit Tenant"' + content.substring(peEditEnd + 90);

fs.writeFileSync('src/App.tsx', content);
console.log("Successfully patched propertyDrawer and propertyEditDrawer into 2-step wizards!");
