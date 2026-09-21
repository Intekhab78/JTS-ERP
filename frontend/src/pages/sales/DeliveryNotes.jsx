import React, { useState, useEffect } from 'react';
import { useCurrency } from '../../contexts/CurrencyContext';
import axios from 'axios';
import { Truck, Plus, Filter, Edit, Trash2, Printer, Eye, CheckCircle2, Box, Download, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { DataTable } from '../../components/common/DataTable';
import { SearchInput } from '../../components/ui/SearchInput';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

const DeliveryNotes = () => {
  const [deliveryNotes, setDeliveryNotes] = useState([]);
  const { formatCurrency, currencySymbol } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const navigate = useNavigate();

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  useEffect(() => {
    fetchDeliveryNotes();
  }, []);

  const fetchDeliveryNotes = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/v1/delivery-notes', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setDeliveryNotes(res.data);
    } catch (error) {
      console.error('Failed to fetch delivery notes', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredNotes = deliveryNotes.filter(dn => {
    const matchesSearch = dn.deliveryNoteNumber?.toLowerCase().includes(search.toLowerCase()) || 
                          dn.customerId?.name?.toLowerCase().includes(search.toLowerCase()) ||
                          dn.salesOrderId?.orderNumber?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || dn.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DELIVERED':
        return <Badge variant="success">{status}</Badge>;
      case 'PARTIALLY_DELIVERED':
        return <Badge variant="info">{status}</Badge>;
      case 'DISPATCHED':
        return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">VALIDATED</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">{status}</Badge>;
      case 'READY':
        return <Badge className="bg-indigo-500 hover:bg-indigo-600 text-white">{status}</Badge>;
      default:
        return <Badge variant="warning">{status}</Badge>;
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this Delivery Note?')) {
      try {
        await axios.delete(`http://localhost:5000/api/v1/delivery-notes/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        fetchDeliveryNotes();
      } catch (error) {
        console.error('Error deleting delivery note', error);
        alert(error.response?.data?.message || 'Failed to delete Delivery Note');
      }
    }
  };

  const handleStatusUpdate = async (id, action) => {
    const actionText = action === 'dispatch' ? 'validate' : action;
    if (window.confirm(`Are you sure you want to ${actionText} this Delivery Note?`)) {
      try {
        await axios.patch(`http://localhost:5000/api/v1/delivery-notes/${id}/${action}`, {}, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        fetchDeliveryNotes();
      } catch (error) {
        console.error(`Error updating delivery note to ${actionText}`, error);
        alert(error.response?.data?.message || `Failed to ${actionText} Delivery Note`);
      }
    }
  };

  const columns = [
    {
      header: 'DN #',
      accessorKey: 'deliveryNoteNumber',
      cell: (row) => <span className="font-bold text-blue-600">{row.deliveryNoteNumber}</span>
    },
    {
      header: 'Date',
      accessorKey: 'deliveryDate',
      cell: (row) => <span className="text-slate-600 font-medium">{format(new Date(row.deliveryDate), 'MMM d, yyyy')}</span>
    },
    {
      header: 'Customer',
      accessorKey: 'customerId.name',
      cell: (row) => <span className="font-bold text-slate-800">{row.customerId?.name}</span>
    },
    {
      header: 'Sales Order',
      accessorKey: 'salesOrderId',
      cell: (row) => (
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {row.salesOrderId?.orderNumber ? `Order #${row.salesOrderId.orderNumber}` : (row.salesOrderId ? `Order #${String(row.salesOrderId._id || row.salesOrderId).slice(-6).toUpperCase()}` : 'SO')}
        </span>
      )
    },
    {
      header: 'Items',
      id: 'itemsCount',
      cell: (row) => (
        <span className="text-slate-600 font-medium flex items-center gap-1">
          <Box className="w-3 h-3" /> {row.items?.length || 0}
        </span>
      )
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
        <div className="flex justify-end gap-1">
          {hasPermission('PRINT_DELIVERY_NOTE') && (
            <button 
              onClick={() => navigate(`/sales/delivery-notes/print/${row._id}`)}
              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50 transition-colors"
              title="Print"
            >
              <Printer className="h-4 w-4" />
            </button>
          )}

          {row.status === 'DRAFT' && hasPermission('EDIT_DELIVERY_NOTE') && (
            <button 
              onClick={() => handleStatusUpdate(row._id, 'ready')}
              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50 transition-colors"
              title="Mark Ready"
            >
              <CheckCircle2 className="h-4 w-4" />
            </button>
          )}

          {row.status === 'READY' && hasPermission('DISPATCH_DELIVERY_NOTE') && (
            <button 
              onClick={() => handleStatusUpdate(row._id, 'dispatch')}
              className="p-1.5 text-slate-400 hover:text-orange-600 rounded-md hover:bg-orange-50 transition-colors"
              title="Validate"
            >
              <Truck className="h-4 w-4" />
            </button>
          )}

          {['DISPATCHED', 'PARTIALLY_DELIVERED'].includes(row.status) && hasPermission('DELIVER_DELIVERY_NOTE') && (
            <button 
              onClick={() => handleStatusUpdate(row._id, 'deliver')}
              className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-md hover:bg-emerald-50 transition-colors"
              title="Mark Delivered"
            >
              <CheckCircle2 className="h-4 w-4" />
            </button>
          )}

          {row.status === 'DRAFT' && hasPermission('EDIT_DELIVERY_NOTE') ? (
            <button 
              onClick={() => navigate(`/sales/delivery-notes/edit/${row._id}`)}
              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
              title="Edit"
            >
              <Edit className="h-4 w-4" />
            </button>
          ) : (
            <button 
              onClick={() => navigate(`/sales/delivery-notes/edit/${row._id}`)}
              className="p-1.5 text-slate-400 hover:text-green-600 rounded-md hover:bg-green-50 transition-colors"
              title="View"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}

          {['DRAFT', 'READY'].includes(row.status) && hasPermission('CANCEL_DELIVERY_NOTE') && (
            <button 
              onClick={() => handleStatusUpdate(row._id, 'cancel')}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
              title="Cancel"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}

          {['DRAFT', 'CANCELLED'].includes(row.status) && hasPermission('DELETE_DELIVERY_NOTE') && (
            <button 
              onClick={() => handleDelete(row._id)}
              className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )
    }
  ];

  const totalDNs = deliveryNotes.length;
  const readyDNs = deliveryNotes.filter(dn => dn.status === 'READY').length;
  const dispatchedDNs = deliveryNotes.filter(dn => dn.status === 'DISPATCHED').length;
  const deliveredDNs = deliveryNotes.filter(dn => dn.status === 'DELIVERED').length;

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6 pb-10">
      <PageHeader 
        title="Delivery Notes"
        description="Manage outbound deliveries and fulfillment records."
        icon={<Truck className="text-blue-600 h-8 w-8" />}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" leftIcon={<Upload className="h-4 w-4" />}>
              Import
            </Button>
            <Button variant="outline" leftIcon={<Download className="h-4 w-4" />}>
              Export
            </Button>
            {hasPermission('CREATE_DELIVERY_NOTE') && (
              <Button onClick={() => navigate('/sales/delivery-notes/new')} leftIcon={<Plus className="h-4 w-4" />}>
                Create Note
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-blue-500">
          <div className="text-slate-500 text-sm font-medium">Total Delivery Notes</div>
          <div className="text-2xl font-bold text-slate-800">{totalDNs}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-indigo-500">
          <div className="text-slate-500 text-sm font-medium">Ready for Dispatch</div>
          <div className="text-2xl font-bold text-slate-800">{readyDNs}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-orange-500">
          <div className="text-slate-500 text-sm font-medium">Dispatched</div>
          <div className="text-2xl font-bold text-slate-800">{dispatchedDNs}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="text-slate-500 text-sm font-medium">Delivered</div>
          <div className="text-2xl font-bold text-slate-800">{deliveredDNs}</div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col md:flex-row gap-4 bg-muted/30">
          <div className="flex-1">
            <SearchInput 
              placeholder="Search by DN #, Customer, or SO #..." 
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
              <option value="READY">Ready</option>
              <option value="DISPATCHED">Dispatched (Validated)</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        <DataTable 
          columns={columns}
          data={filteredNotes}
          isLoading={loading}
          emptyTitle="No delivery notes found"
          emptyDescription="There are no delivery notes matching your search criteria."
        />
      </Card>
    </div>
  );
};

export default DeliveryNotes;