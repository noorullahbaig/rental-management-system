const fs = require('fs');
// Let's inspect createStarterState in server/state.ts to see the properties and tenancies seeded
const content = fs.readFileSync('server/state.ts', 'utf-8');
const match = content.match(/createStarterState = \(\): RentalSystemState => \(\{([\s\S]*?)\n\}\)/);
if (match) {
  console.log("Found createStarterState");
}
