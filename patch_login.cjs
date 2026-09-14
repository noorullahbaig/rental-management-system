const fs = require('fs');
let content = fs.readFileSync('src/components/Login.tsx', 'utf-8');

const buttonsHTML = `
        <div className="mt-6 pt-6 border-t border-white/10">
          <p className="text-xs text-slate-400 text-center mb-3">
            Quick Login (Demo Accounts)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setEmail('admin@rental.com')
                setPassword('admin123')
              }}
              className="bg-white/10 hover:bg-white/20 border border-white/10 text-white text-sm font-medium py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Admin
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('tenant@rental.com')
                setPassword('tenant123')
              }}
              className="bg-white/10 hover:bg-white/20 border border-white/10 text-white text-sm font-medium py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              Tenant
            </button>
          </div>
        </div>
`;

content = content.replace(
  '<div className="mt-6 pt-6 border-t border-white/10">\n          <p className="text-xs text-slate-500 text-center">\n            Demo accounts: admin@rental.com / employee@rental.com / Check tenant email (password: admin123 / employee123 / tenant123)\n          </p>\n        </div>',
  buttonsHTML
);

fs.writeFileSync('src/components/Login.tsx', content);
