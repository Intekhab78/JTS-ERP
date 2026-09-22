import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { FileText, Plus, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { DataTable } from '../../components/common/DataTable';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { SearchInput } from '../../components/ui/SearchInput';
import { useNavigate } from 'react-router-dom';

const GRN = () => {
  const [grns, setGrns] = useState([]);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  useEffect(() => {
    fetchGRNs();
  }, []);

  const fetchGRNs = async () => {
    try {
      const res = await axios.get('/api/v1/grn', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setGrns(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const filteredGRNs = grns.filter(grn =>
    grn.grnNumber.toLowerCase().includes(search.toLowerCase()) ||
    (grn.supplierId?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case 'VALIDATED':
        return <Badge variant="success">VALIDATED</Badge>;
      case 'CONFIRMED':
        return <Badge variant="info">CONFIRMED</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">CANCELLED</Badge>;
      case 'DRAFT':
      default:
        return <Badge variant="warning">DRAFT</Badge>;
    }
  };

  const columns = useMemo(() => [
    {
      header: 'GRN Number',
      accessorKey: 'grnNumber',
      cell: (grn) => <span className="font-bold text-blue-600">{grn.grnNumber}</span>
    },
    {
      header: 'Date',
      accessorKey: 'receiptDate',
      cell: (grn) => <span className="text-muted-foreground">{format(new Date(grn.receiptDate), 'MMM d, yyyy')}</span>
    },
    {
      header: 'Supplier',
      accessorKey: 'supplierId.name',
      cell: (grn) => <span className="font-bold text-foreground">{grn.supplierId?.name || 'N/A'}</span>
    },
    {
      header: 'Destination',
      accessorKey: 'branchId.name',
      cell: (grn) => <span className="font-bold text-muted-foreground">{grn.branchId?.name || 'N/A'}</span>
    },
    {
      header: 'PO Ref',
      accessorKey: 'purchaseOrderId',
      cell: (grn) => <span className="text-muted-foreground">{grn.purchaseOrderId ? `PO-${grn.purchaseOrderId._id.slice(-6).toUpperCase()}` : '-'}</span>
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (grn) => getStatusBadge(grn.status)
    },
    {
      header: 'Actions',
      id: 'actions',
      cell: (grn) => (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate(`/purchases/grn/${grn._id}`)}
            className="text-blue-600 hover:bg-blue-50"
            title="View Details"
          >
            <Eye size={16} />
          </Button>
        </div>
      )
    }
  ], [navigate]);

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
      <div className="flex justify-between items-start mb-2">
        <PageHeader
          title="Goods Receipt Notes (GRN)"
          description="Manage incoming goods and stock receipts."
          icon={<FileText className="text-blue-600 h-8 w-8" />}
        />
        {hasPermission('CREATE_PURCHASES') && (
          <Button onClick={() => navigate('/purchases/grn/new')} size="lg" className="mt-2" leftIcon={<Plus size={18} />}>
            New Receipt
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30">
          <SearchInput
            placeholder="Search GRNs by Number or Supplier Name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <DataTable
          columns={columns}
          data={filteredGRNs}
          searchQuery=""
          emptyMessage="No goods receipt notes found."
        />
      </Card>
    </div>
  );
};

export default GRN;