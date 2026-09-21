import React, { useState, useEffect } from 'react';
import { useCurrency } from '../../contexts/CurrencyContext';
import axios from 'axios';
import { FileText, Plus, Filter, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { DataTable } from '../../components/common/DataTable';
import { SearchInput } from '../../components/ui/SearchInput';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

const Quotes = () => {
  const [quotes, setQuotes] = useState([]);
  const { formatCurrency, currencySymbol } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/v1/quotes', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setQuotes(res.data);
    } catch (error) {
      console.error('Failed to fetch quotes', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredQuotes = quotes.filter(q => 
    q.quoteNumber.toLowerCase().includes(search.toLowerCase()) || 
    q.customerSnapshot?.name.toLowerCase().includes(search.toLowerCase()) ||
    q.branchId?.name.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACCEPTED':
        return <Badge variant="success">{status}</Badge>;
      case 'CONVERTED':
        return <Badge className="bg-purple-500 hover:bg-purple-600 text-white">{status}</Badge>;
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
    if (window.confirm('Are you sure you want to delete this quote?')) {
      try {
        await axios.delete(`http://localhost:5000/api/v1/quotes/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        fetchQuotes();
      } catch (error) {
        console.error('Error deleting quote', error);
        alert('Failed to delete quote');
      }
    }
  };

  const columns = [
    {
      header: 'Quote #',
      accessorKey: 'quoteNumber',
      cell: (row) => (
        <div>
          <span className="font-mono font-medium text-blue-600">{row.quoteNumber}</span>
          {row.revisionNumber > 1 && (
            <span className="ml-2 text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">v{row.revisionNumber}</span>
          )}
        </div>
      )
    },
    {
      header: 'Date',
      accessorKey: 'quoteDate',
      cell: (row) => <span className="text-slate-600 font-medium">{format(new Date(row.quoteDate), 'MMM d, yyyy')}</span>
    },
    {
      header: 'Branch',
      accessorKey: 'branchId',
      cell: (row) => <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold uppercase tracking-wider">{row.branchId?.name}</span>
    },
    {
      header: 'Customer',
      accessorKey: 'customerSnapshot.name',
      cell: (row) => <span className="font-bold text-slate-800">{row.customerSnapshot?.name}</span>
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
          {row.status === 'DRAFT' && hasPermission('EDIT_QUOTES') ? (
            <button 
              onClick={() => navigate(`/sales/quotes/edit/${row._id}`)}
              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
              title="Edit Quote"
            >
              <Edit className="h-4 w-4" />
            </button>
          ) : (
            <button 
              onClick={() => navigate(`/sales/quotes/edit/${row._id}`)}
              className="p-1.5 text-slate-400 hover:text-green-600 rounded-md hover:bg-green-50 transition-colors"
              title="View Quote"
            >
              <FileText className="h-4 w-4" />
            </button>
          )}
          {hasPermission('DELETE_QUOTES') && (
            <button 
              onClick={() => handleDelete(row._id)}
              className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
      <PageHeader 
        title="Quotations"
        description="Manage commercial offers and quotes for your customers."
        icon={<FileText className="text-blue-600 h-8 w-8" />}
        actions={
          hasPermission('CREATE_QUOTES') && (
            <Button onClick={() => navigate('/sales/quotes/new')} leftIcon={<Plus className="h-4 w-4" />}>
              Create Quote
            </Button>
          )
        }
      />

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border flex gap-4 bg-muted/30">
          <div className="flex-1">
            <SearchInput 
              placeholder="Search by Quote #, Customer, or Branch..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" leftIcon={<Filter className="h-4 w-4" />}>
            Filter
          </Button>
        </div>

        <DataTable 
          columns={columns}
          data={filteredQuotes}
          isLoading={loading}
          emptyTitle="No quotes found"
          emptyDescription="There are no quotations matching your search criteria."
        />
      </Card>
    </div>
  );
};

export default Quotes;
