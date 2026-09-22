import React, { useState, useRef, useEffect } from 'react';
import { Edit, Trash2, Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import BarcodePrintTemplate from './BarcodePrintTemplate';
import axios from 'axios';
import { DataTable } from '../common/DataTable';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../common/ConfirmDialog';

const ProductTable = ({ products, fetchInventory, onEdit }) => {
  const [deleteId, setDeleteId] = useState(null);
  const [productToPrint, setProductToPrint] = useState(null);
  const componentRef = useRef(null);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    onAfterPrint: () => setProductToPrint(null),
    documentTitle: 'Barcode Label'
  });

  useEffect(() => {
    if (productToPrint) {
      handlePrint();
    }
  }, [productToPrint]);

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/v1/inventory/products/${deleteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchInventory();
    } catch (error) {
      console.error('Failed to delete product', error);
      alert('Failed to delete product');
    } finally {
      setDeleteId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'In Stock':
        return <Badge variant="success">In Stock</Badge>;
      case 'Low Stock':
        return <Badge variant="warning">Low Stock</Badge>;
      default:
        return <Badge variant="destructive">Out of Stock</Badge>;
    }
  };

  const columns = [
    {
      header: 'Product Name',
      cell: (row) => <span className="font-bold">{row.name}</span>
    },
    {
      header: 'SKU',
      accessorKey: 'sku'
    },
    {
      header: 'Item Type',
      cell: (row) => row.type || 'STANDARD'
    },
    {
      header: 'Base UOM',
      cell: (row) => row.uomDetails?.baseUnit || row.uom || 'PCS'
    },
    {
      header: 'Purchase UOM',
      cell: (row) => row.uomDetails?.purchaseUnit || row.uom || 'PCS'
    },
    {
      header: 'Sales UOM',
      cell: (row) => row.uomDetails?.salesUnit || row.uom || 'PCS'
    },
    {
      header: 'Purchase Price',
      cell: (row) => <span className="text-gray-600">${(row.purchasePrice || 0).toFixed(2)}</span>
    },
    {
      header: 'Landed Cost',
      cell: (row) => <span className="text-gray-600">${(row.landedCost || 0).toFixed(2)}</span>
    },
    {
      header: 'Sales Price',
      cell: (row) => <span className="font-bold text-blue-600">${(row.salesPrice || row.price || 0).toFixed(2)}</span>
    },
    {
      header: 'Min Stock',
      cell: (row) => row.minStockLevel || 0
    },
    {
      header: 'Max Stock',
      cell: (row) => row.maxStockLevel || 0
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
          {hasPermission('VIEW_INVENTORY') && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-green-600" onClick={() => setProductToPrint(row)} title="Print Barcode (2x3 cm)">
              <Printer className="h-4 w-4" />
            </Button>
          )}
          {hasPermission('EDIT_INVENTORY') && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-blue-600" onClick={() => onEdit(row)} title="Edit Product">
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {hasPermission('DELETE_INVENTORY') && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => setDeleteId(row._id)} title="Delete Product">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={products}
        emptyTitle="No products found"
        emptyDescription="Add a product to get started."
      />
      
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Product"
        description="Are you sure you want to delete this product? This action cannot be undone."
        confirmText="Delete Product"
        variant="destructive"
      />
      
      {/* Hidden Barcode Print Area */}
      <div style={{ display: 'none' }}>
        <BarcodePrintTemplate ref={componentRef} product={productToPrint} />
      </div>
    </>
  );
};

export default ProductTable;
