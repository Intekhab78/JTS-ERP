import React, { useState, useEffect } from 'react';
import { useCurrency } from '../../contexts/CurrencyContext';
import axios from 'axios';
import { FileCheck, Plus, Filter, Edit, Trash2, Printer, Download, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { DataTable } from '../../components/common/DataTable';
import { SearchInput } from '../../components/ui/SearchInput';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

const ProForma = () => {
  const [invoices, setInvoices] = useState([]);
  const { formatCurrency, currencySymbol } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const navigate = useNavigate();

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await axios.get('/api/v1/proforma', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setInvoices(res.data);
    } catch (error) {
      console.error('Failed to fetch pro-forma invoices', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(pf => {
    const matchesSearch = pf.pfNumber.toLowerCase().includes(search.toLowerCase()) || 
                          pf.customerSnapshot?.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || pf.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACCEPTED':
      case 'CONVERTED':
        return <Badge variant="success">{status}</Badge>;
      case 'REJECTED':
      case 'CANCELLED':
      case 'EXPIRED':
        return <Badge variant="destructive">{status}</Badge>;
      case 'SENT':
      case 'VIEWED':
        return <Badge variant="info">{status}</Badge>;
      default:
        return <Badge variant="warning">{status}</Badge>;
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this Pro-Forma Invoice?')) {
      try {
        await axios.delete(`/api/v1/proforma/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        fetchInvoices();
      } catch (error) {
        console.error('Error deleting pro-forma invoice', error);
        alert('Failed to delete Pro-Forma invoice');
      }
    }
  };

  const columns = [
    {
      header: 'PF #',
      accessorKey: 'pfNumber',
      cell: (row) => <span className="font-bold text-blue-600">{row.pfNumber}</span>
    },
    {
      header: 'Date',
      accessorKey: 'issueDate',
      cell: (row) => <span className="text-slate-600 font-medium">{format(new Date(row.issueDate), 'MMM d, yyyy')}</span>
    },
    {
      header: 'Customer',
      accessorKey: 'customerSnapshot.name',
      cell: (row) => <span className="font-bold text-slate-800">{row.customerSnapshot?.name}</span>
    },
    {
      header: 'Source',
      accessorKey: 'sourceType',
      cell: (row) => (
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {row.sourceType === 'MANUAL' ? 'Manual' : row.sourceType}
        </span>
      )
    },
    {
      header: 'Total',
      accessorKey: 'grandTotal',
      className: 'text-right',
      cell: (row) => <span className="font-extrabold text-slate-800">{currencySymbol}{row.grandTotal.toFixed(2)}</span>
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (row) => getStatusBadge(row.status)
    },
    {
      header: 'Actions',
      id: 'actions',
      className: 'text-right',
      cell: (row) => (
        <div className="flex justify-end gap-2">
          {hasPermission('PRINT_PROFORMA') && (
            <button 
              onClick={() => navigate(`/sales/proforma/print/${row._id}`)}
              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50 transition-colors"
              title="Print Pro-Forma"
            >
              <Printer className="h-4 w-4" />
            </button>
          )}
          {row.status === 'DRAFT' && hasPermission('EDIT_PROFORMA') ? (
            <button 
              onClick={() => navigate(`/sales/proforma/edit/${row._id}`)}
              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
              title="Edit Pro-Forma"
            >
              <Edit className="h-4 w-4" />
            </button>
          ) : (
            <button 
              onClick={() => navigate(`/sales/proforma/edit/${row._id}`)}
              className="p-1.5 text-slate-400 hover:text-green-600 rounded-md hover:bg-green-50 transition-colors"
              title="View Pro-Forma"
            >
              <FileCheck className="h-4 w-4" />
            </button>
          )}
          {hasPermission('DELETE_PROFORMA') && (
            <button 
              onClick={() => handleDelete(row._id)}
              className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
              title="Delete Pro-Forma"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )
    }
  ];

  const totalPFs = invoices.length;
  const draftPFs = invoices.filter(pf => pf.status === 'DRAFT').length;
  const sentPFs = invoices.filter(pf => ['SENT', 'VIEWED'].includes(pf.status)).length;
  const acceptedPFs = invoices.filter(pf => ['ACCEPTED', 'CONVERTED'].includes(pf.status)).length;

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6 pb-10">
      <PageHeader 
        title="Pro-Forma Invoices"
        description="Manage preliminary commercial documents for your customers."
        icon={<FileCheck className="text-blue-600 h-8 w-8" />}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" leftIcon={<Upload className="h-4 w-4" />}>
              Import
            </Button>
            <Button variant="outline" leftIcon={<Download className="h-4 w-4" />}>
              Export
            </Button>
            {hasPermission('CREATE_PROFORMA') && (
              <Button onClick={() => navigate('/sales/proforma/new')} leftIcon={<Plus className="h-4 w-4" />}>
                Create Pro-Forma
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-blue-500">
          <div className="text-slate-500 text-sm font-medium">Total Invoices</div>
          <div className="text-2xl font-bold text-slate-800">{totalPFs}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="text-slate-500 text-sm font-medium">Drafts</div>
          <div className="text-2xl font-bold text-slate-800">{draftPFs}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-indigo-500">
          <div className="text-slate-500 text-sm font-medium">Sent / Viewed</div>
          <div className="text-2xl font-bold text-slate-800">{sentPFs}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="text-slate-500 text-sm font-medium">Accepted / Converted</div>
          <div className="text-2xl font-bold text-slate-800">{acceptedPFs}</div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col md:flex-row gap-4 bg-muted/30">
          <div className="flex-1">
            <SearchInput 
              placeholder="Search by PF # or Customer..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-700"
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="VIEWED">Viewed</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="CONVERTED">Converted</option>
              <option value="REJECTED">Rejected</option>
              <option value="EXPIRED">Expired</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        <DataTable 
          columns={columns}
          data={filteredInvoices}
          isLoading={loading}
          emptyTitle="No pro-forma invoices found"
          emptyDescription="There are no pro-forma invoices matching your search criteria."
        />
      </Card>
    </div>
  );
};

export default ProForma;