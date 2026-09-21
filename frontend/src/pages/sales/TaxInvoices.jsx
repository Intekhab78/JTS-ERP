import React, { useState, useEffect } from 'react';
import { useCurrency } from '../../contexts/CurrencyContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SearchInput } from '../../components/ui/SearchInput';
import { Eye, Printer, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const TaxInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const { formatCurrency, currencySymbol } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/v1/tax-invoices', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setInvoices(res.data);
      } catch (error) {
        console.error('Failed to fetch tax invoices:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID_FULL':
        return <Badge variant="success">Paid</Badge>;
      case 'PAID_PARTIAL':
        return <Badge variant="warning">Partial</Badge>;
      case 'SENT':
      case 'APPROVED':
        return <Badge variant="info">{status}</Badge>;
      case 'OVERDUE':
      case 'CANCELLED':
        return <Badge variant="destructive">{status}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const columns = [
    {
      header: 'Invoice #',
      accessorKey: 'invoiceNumber',
      cell: (row) => <span className="font-bold text-slate-800">{row.invoiceNumber}</span>
    },
    {
      header: 'Date',
      cell: (row) => format(new Date(row.issueDate), 'MMM dd, yyyy')
    },
    {
      header: 'Customer',
      cell: (row) => (
        <div>
          <div className="font-semibold text-slate-900">{row.customerSnapshot?.name}</div>
          <div className="text-xs text-slate-500">{row.customerSnapshot?.email || '-'}</div>
        </div>
      )
    },
    {
      header: 'Total',
      cell: (row) => <span className="font-black text-slate-900">{currencySymbol}{row.grandTotal.toFixed(2)}</span>
    },
    {
      header: 'Balance',
      cell: (row) => <span className="font-bold text-red-600">{currencySymbol}{row.balanceDue.toFixed(2)}</span>
    },
    {
      header: 'Status',
      cell: (row) => getStatusBadge(row.status)
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (row) => (
        <div className="flex justify-end gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-slate-400 hover:text-blue-600"
            onClick={() => navigate(`/sales/tax-invoices/edit/${row._id}`)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-slate-400 hover:text-indigo-600"
            onClick={() => window.open(`/sales/tax-invoices/${row._id}/print`, '_blank')}
          >
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  const filteredInvoices = invoices.filter(inv => 
    inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.customerSnapshot?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
      <PageHeader 
        title="Tax Invoices" 
        description="Manage tax invoices for your business." 
        actions={
          <Button onClick={() => navigate('/sales/tax-invoices/new')} className="bg-blue-600 hover:bg-blue-700 text-white">
            New Invoice
          </Button>
        }
      />
      
      <Card>
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="w-full sm:max-w-xs">
            <SearchInput 
              placeholder="Search invoices..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center items-center">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredInvoices}
            emptyTitle="No tax invoices found"
            emptyDescription="You haven't generated any tax invoices yet."
          />
        )}
      </Card>
    </div>
  );
};

export default TaxInvoices;