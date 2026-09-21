const fs = require('fs');
const path = require('path');

const pages = [
  { path: 'sales/ProForma.jsx', name: 'Pro-Forma Invoices' },
  { path: 'sales/DeliveryNotes.jsx', name: 'Delivery Notes' },
  { path: 'sales/TaxInvoices.jsx', name: 'Tax Invoices' },
  { path: 'purchase/GRN.jsx', name: 'Goods Receipt Notes (GRN)' }
];

pages.forEach(p => {
  const fullPath = path.join(__dirname, 'src', 'pages', p.path);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const code = `import React from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardContent } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { FileText } from 'lucide-react';

const Page = () => (
  <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
    <PageHeader title="${p.name}" description="Manage ${p.name.toLowerCase()} for your business." />
    <Card>
      <CardContent className="pt-6 min-h-[400px] flex items-center justify-center">
        <EmptyState icon={<FileText className="h-12 w-12 text-muted-foreground/50" />} title="No ${p.name.toLowerCase()} found" description="This module is currently being built out." />
      </CardContent>
    </Card>
  </div>
);

export default Page;`;
  fs.writeFileSync(fullPath, code);
});
