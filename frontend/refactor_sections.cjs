const fs = require('fs');
let content = fs.readFileSync('src/pages/hr/EmployeeForm.jsx', 'utf8');

const sections = [
  { id: 'personal', title: 'Personal Information', sub: 'Legal identification details, biometric photograph, and personal status.' },
  { id: 'employment', title: 'Employment Details', sub: 'Contractual terms, organizational hierarchy, department mapping, and probation cycle.' },
  { id: 'contact', title: 'Contact & Address', sub: 'Communication channels and residential locations.' },
  { id: 'family', title: 'Family Members', sub: 'Dependents and family details.' },
  { id: 'emergency', title: 'Emergency Contacts', sub: 'Who to reach out to in case of an emergency.' },
  { id: 'identity', title: 'Identity & Documents', sub: 'Legal identification and compliance documents.' },
  { id: 'payroll', title: 'Payroll & Bank', sub: 'Compensation package and financial routing details.' },
  { id: 'attendance', title: 'Attendance & Shifts', sub: 'Time tracking and scheduling configuration.' },
  { id: 'erp', title: 'ERP System Access', sub: 'Link to system user accounts for login access.' }
];

sections.forEach((sec, idx) => {
  let blockRegex = new RegExp('{activeTab === \\\'' + sec.id + '\\\' && \\(\\s*(<div className="space-y-8 animate-in fade-in duration-300">)');
  content = content.replace(blockRegex, '<div id="section-' + sec.id + '" className="space-y-8 scroll-mt-24 pb-12 border-b border-slate-100 last:border-0">');
  
  let headerRegex = new RegExp('<div className="mb-6">\\s*<h3 className="text-2xl font-light text-slate-900 tracking-tight">[^<]*</h3>\\s*<p className="text-sm text-slate-500 mt-1">[^<]*</p>\\s*</div>');
  
  let newHeader = `
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
      <div>
        <h3 className="text-lg font-bold text-slate-800">${sec.title}</h3>
        <p className="text-xs text-slate-500 mt-1">${sec.sub}</p>
      </div>
      <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">Step ${idx+1} of 9</span>
    </div>`;
    
  content = content.replace(headerRegex, newHeader);
});

// Remove closing )} for the activeTab wrappers
content = content.replace(/\)\}\s*(?=\{activeTab ===)/g, '');
content = content.replace(/\)\}\s*(?=<\/div>\s*<\/form>)/g, '');

fs.writeFileSync('src/pages/hr/EmployeeForm.jsx', content);
console.log('Success');
