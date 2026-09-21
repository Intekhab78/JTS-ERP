import React, { useState, useEffect } from 'react';
import { useCurrency } from '../../contexts/CurrencyContext';
import axios from 'axios';
import { Receipt, Filter, Eye, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { DataTable } from '../../components/common/DataTable';
import { SearchInput } from '../../components/ui/SearchInput';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

const SalesHistory = () => {
  const [orders, setOrders] = useState([]);
  const { formatCurrency, currencySymbol } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/v1/sales', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setOrders(res.data);
    } catch (error) {
      console.error('Failed to fetch sales history', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(o => 
    o._id.toLowerCase().includes(search.toLowerCase()) || 
    o.customerName.toLowerCase().includes(search.toLowerCase()) ||
    o.branchId?.name.toLowerCase().includes(search.toLowerCase())
  );

  const getDerivedStatus = (row) => {
    if (row.source === 'POS' || row.status === 'COMPLETED') return 'COMPLETED';
    if (row.status === 'CANCELLED') return 'CANCELLED';
    if (row.status === 'DRAFT') return 'DRAFT';
    if (row.status === 'CONFIRMED') {
      if (row.deliveryStatus === 'PENDING') return 'CONFIRMED';
      if (row.deliveryStatus === 'PARTIAL') return 'PARTIALLY DELIVERED';
      if (row.deliveryStatus === 'DELIVERED') return 'DELIVERED';
    }
    return row.status;
  };

  const getStatusBadge = (statusStr) => {
    switch (statusStr) {
      case 'COMPLETED':
      case 'DELIVERED':
        return <Badge variant="success">{statusStr}</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">{statusStr}</Badge>;
      case 'DRAFT':
        return <Badge variant="secondary">{statusStr}</Badge>;
      case 'CONFIRMED':
        return <Badge className="bg-indigo-500 hover:bg-indigo-600 text-white">{statusStr}</Badge>;
      case 'PARTIALLY DELIVERED':
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">{statusStr}</Badge>;
      default:
        return <Badge variant="warning">{statusStr}</Badge>;
    }
  };

  const columns = [
    {
      header: 'Order ID',
      accessorKey: '_id',
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-blue-600">#{row._id.slice(-6).toUpperCase()}</span>
          {row.quoteId && (
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap mt-0.5">
              Ref: {row.quoteId.quoteNumber}
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Date',
      accessorKey: 'createdAt',
      cell: (row) => <span className="text-slate-600 font-medium">{format(new Date(row.createdAt), 'MMM d, yyyy h:mm a')}</span>
    },
    {
      header: 'Branch',
      accessorKey: 'branchId',
      cell: (row) => <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold uppercase tracking-wider">{row.branchId?.name}</span>
    },
    {
      header: 'Customer',
      accessorKey: 'customerName',
      cell: (row) => <span className="font-bold text-slate-800">{row.customerName}</span>
    },
    {
      header: 'Payment',
      accessorKey: 'paymentMethod',
      cell: (row) => row.status === 'PENDING' || row.status === 'DRAFT' || row.status === 'CONFIRMED' ? (
        <span className="text-slate-400 font-medium text-[11px] italic tracking-wider">UNPAID</span>
      ) : (
        <span className="text-slate-500 font-bold text-[11px] tracking-wider">{row.paymentMethod.replace('_', ' ')}</span>
      )
    },
    {
      header: 'Total',
      accessorKey: 'totalAmount',
      className: 'text-right',
      cell: (row) => <span className="font-extrabold text-slate-800">{currencySymbol}{row.totalAmount.toFixed(2)}</span>
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (row) => getStatusBadge(getDerivedStatus(row))
    },
    {
      header: 'Actions',
      id: 'actions',
      className: 'text-right',
      cell: (row) => (
        <div className="flex justify-end gap-2">
          {['CONFIRMED', 'PARTIALLY DELIVERED'].includes(getDerivedStatus(row)) && (
            <button 
              onClick={() => navigate(`/sales/delivery-notes/new?soId=${row._id}`)}
              className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-md hover:bg-emerald-50 transition-colors"
              title="Create Delivery Note"
            >
              <Truck className="h-4 w-4" />
            </button>
          )}
          <button 
            onClick={() => navigate(`/sales/orders/${row._id}`)}
            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
            title="View Order"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
      <PageHeader 
        title="Sales Ledger"
        description="View all historical transactions across your enterprise branches."
        icon={<Receipt className="text-blue-600 h-8 w-8" />}
      />

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border flex gap-4 bg-muted/30">
          <div className="flex-1">
            <SearchInput 
              placeholder="Search by Order ID, Customer, or Branch..." 
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
          data={filteredOrders}
          isLoading={loading}
          emptyTitle="No sales records found"
          emptyDescription="There are no sales transactions matching your search criteria."
        />
      </Card>
    </div>
  );
};

export default SalesHistory;
