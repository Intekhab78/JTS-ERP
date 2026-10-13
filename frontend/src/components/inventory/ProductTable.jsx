import React, { useState, useRef, useEffect } from 'react';
import { Edit, Trash2, Printer, Zap, Server, ChevronLeft, ChevronRight } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import BarcodePrintTemplate from './BarcodePrintTemplate';
import axios from 'axios';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../common/ConfirmDialog';

const ProductTable = ({ products = [], fetchInventory, onEdit, loading }) => {
  const [deleteId, setDeleteId] = useState(null);
  const [productToPrint, setProductToPrint] = useState(null);
  const componentRef = useRef(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const totalPages = Math.ceil(products.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = products.slice(startIndex, endIndex);

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

  // Reset page when products change (e.g. search)
  useEffect(() => {
    setCurrentPage(1);
  }, [products.length]);

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

  const getStatusStyle = (status) => {
    switch (status) {
      case 'In Stock':
        return 'bg-emerald-500';
      case 'Low Stock':
        return 'bg-amber-500';
      default:
        return 'bg-rose-600';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'In Stock':
        return 'In Stock';
      case 'Low Stock':
        return 'Low Stock';
      default:
        return 'Out of Stock';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex justify-between items-center">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Zap size={16} className="text-blue-500" /> Database Matrix
        </h2>
        <span className="text-xs font-bold text-slate-500 font-mono px-2 py-1 bg-slate-200 rounded">RECORDS: {products.length}</span>
      </div>
      
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white border-b-2 border-slate-100">
            <tr>
              <th className="px-6 py-4">Product Name</th>
              <th className="px-6 py-4">Item Type</th>
              <th className="px-6 py-4">Base UOM</th>
              <th className="px-6 py-4">Sales Price</th>
              <th className="px-6 py-4">Limits (Min/Max)</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="7" className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="animate-spin rounded-none h-10 w-10 border-4 border-slate-200 border-t-blue-600"></div>
                    <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">Fetching Database...</p>
                  </div>
                </td>
              </tr>
            ) : currentItems.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <Server size={48} className="text-slate-200 mb-2" />
                    <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">0 Records Found</p>
                    <p className="text-xs text-slate-400 font-mono">No entities match current parameters.</p>
                  </div>
                </td>
              </tr>
            ) : (
              currentItems.map(row => {
                const statusColor = getStatusStyle(row.status);
                const statusText = getStatusText(row.status);
                
                return (
                  <tr key={row._id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${statusColor}`}></div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm tracking-tight">{row.name}</p>
                          <p className="text-[11px] font-bold text-slate-400 mt-0.5 font-mono bg-slate-100 inline-block px-1.5 py-0.5 rounded">ID: {row.sku || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        {row.type || 'STANDARD'}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        {row.uomDetails?.baseUnit || row.uom || 'PCS'}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="font-bold text-blue-600 font-mono text-sm">${(row.salesPrice || row.price || 0).toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-1 font-mono text-xs">
                        <span className="text-slate-400">{row.minStockLevel || 0}</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-slate-700 font-bold">{row.maxStockLevel || 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-black text-white uppercase tracking-widest shadow-sm ${statusColor}`}>
                        {statusText}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex justify-end gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                        {hasPermission('VIEW_INVENTORY') && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-green-600 hover:bg-green-50" onClick={() => setProductToPrint(row)} title="Print Barcode">
                            <Printer className="h-4 w-4" />
                          </Button>
                        )}
                        {hasPermission('EDIT_INVENTORY') && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => onEdit(row)} title="Edit Product">
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {hasPermission('DELETE_INVENTORY') && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteId(row._id)} title="Delete Product">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {!loading && totalPages > 0 && (
        <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Showing <span className="text-slate-800">{startIndex + 1}</span> to <span className="text-slate-800">{Math.min(endIndex, products.length)}</span> of <span className="text-slate-800">{products.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="text-xs font-bold text-slate-700 font-mono px-2">
              PAGE {currentPage} / {totalPages}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

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
    </div>
  );
};

export default ProductTable;
