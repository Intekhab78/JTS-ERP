import React, { useEffect, useState } from 'react';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Printer, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

const DeliveryNotePrint = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const { formatCurrency, currencySymbol } = useCurrency();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeliveryNote = async () => {
      try {
        const res = await axios.get(`/api/v1/delivery-notes/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setData(res.data);
      } catch (error) {
        console.error('Failed to load document for printing', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDeliveryNote();
  }, [id]);

  if (loading) {
    return <div className="p-12 text-center text-slate-500">Loading document...</div>;
  }

  if (!data) {
    return <div className="p-12 text-center text-red-500">Document not found.</div>;
  }

  return (
    <div className="bg-slate-100 min-h-screen py-8 print:bg-white print:py-0">
      <div className="max-w-4xl mx-auto mb-6 print:hidden flex justify-between items-center px-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg shadow-sm hover:bg-indigo-700">
          <Printer className="w-4 h-4" /> Print Document
        </button>
      </div>

      <div className="max-w-4xl mx-auto bg-white p-12 shadow-sm rounded-lg print:shadow-none print:rounded-none">
        
        {/* HEADER */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-8 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">DELIVERY NOTE</h1>
            <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-widest">Goods Delivery Document</p>
            <p className="text-xs font-bold text-red-500 mt-2 uppercase tracking-widest border border-red-500 inline-block px-1.5 py-0.5 rounded">Not a Tax Invoice</p>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold text-slate-800">Your Company Name</h2>
            <p className="text-sm text-slate-500 mt-1">123 Logistics Avenue, Suite 200<br/>City, State, 12345<br/>dispatch@yourcompany.com</p>
          </div>
        </div>

        {/* DETAILS */}
        <div className="flex justify-between mb-10">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ship To</h3>
            <p className="font-bold text-slate-800">{data.customerSnapshot?.name}</p>
            {data.deliveryAddress && (
              <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{data.deliveryAddress}</p>
            )}
            {data.customerSnapshot?.phone && (
              <p className="text-sm text-slate-600 mt-1">Ph: {data.customerSnapshot.phone}</p>
            )}
          </div>
          <div className="text-right">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div className="text-slate-500 font-medium">Delivery Note No:</div>
              <div className="font-bold text-slate-800">{data.deliveryNoteNumber}</div>
              
              <div className="text-slate-500 font-medium">Delivery Date:</div>
              <div className="font-medium text-slate-800">{format(new Date(data.deliveryDate), 'MMM dd, yyyy')}</div>
              
              <div className="text-slate-500 font-medium">Sales Order No:</div>
              <div className="font-medium text-slate-800">{data.salesOrderId?.orderNumber || 'SO'}</div>
              
              {data.expectedDeliveryDate && (
                <>
                  <div className="text-slate-500 font-medium">Expected Date:</div>
                  <div className="font-medium text-slate-800">{format(new Date(data.expectedDeliveryDate), 'MMM dd, yyyy')}</div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ITEMS */}
        <table className="w-full mb-10">
          <thead>
            <tr className="border-b-2 border-slate-800 text-left text-sm font-bold text-slate-800">
              <th className="py-3 w-12">Sr.</th>
              <th className="py-3">Product Description</th>
              <th className="py-3 text-center w-24">UOM</th>
              <th className="py-3 text-center w-28">Ordered Qty</th>
              <th className="py-3 text-center w-28 text-emerald-600">Delivery Qty</th>
              <th className="py-3 text-center w-28">Remaining</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.items?.map((item, index) => (
              <tr key={index}>
                <td className="py-4 text-slate-500 text-sm">{index + 1}</td>
                <td className="py-4">
                  <p className="font-medium text-slate-800">{item.itemName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">SKU: {item.sku}</p>
                </td>
                <td className="py-4 text-center text-slate-700 text-sm">{item.uom}</td>
                <td className="py-4 text-center font-medium text-slate-600">{item.orderedQuantity}</td>
                <td className="py-4 text-center font-bold text-emerald-600 text-lg">{item.deliveryQuantity}</td>
                <td className="py-4 text-center text-slate-500">{item.remainingQuantity - item.deliveryQuantity}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* TRANSPORT DETAILS */}
        {(data.transporterName || data.vehicleNumber || data.trackingNumber || data.deliveryInstructions) && (
          <div className="mb-10 bg-slate-50 p-6 rounded-lg border border-slate-100 print:bg-white print:border-slate-200">
            <h4 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Dispatch & Logistics</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {data.transporterName && (
                <div><span className="block text-slate-500 text-xs mb-1">Transporter</span><span className="font-medium text-slate-800">{data.transporterName}</span></div>
              )}
              {data.vehicleNumber && (
                <div><span className="block text-slate-500 text-xs mb-1">Vehicle No.</span><span className="font-medium text-slate-800">{data.vehicleNumber}</span></div>
              )}
              {data.driverName && (
                <div><span className="block text-slate-500 text-xs mb-1">Driver Name</span><span className="font-medium text-slate-800">{data.driverName} {data.driverPhone && `(${data.driverPhone})`}</span></div>
              )}
              {data.trackingNumber && (
                <div><span className="block text-slate-500 text-xs mb-1">Tracking / LR No.</span><span className="font-medium text-slate-800">{data.trackingNumber}</span></div>
              )}
            </div>
            {data.deliveryInstructions && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <span className="block text-slate-500 text-xs mb-1">Delivery Instructions</span>
                <p className="text-sm text-slate-800">{data.deliveryInstructions}</p>
              </div>
            )}
          </div>
        )}

        {/* SIGNATURES */}
        <div className="mt-20 pt-8 border-t border-slate-200 grid grid-cols-3 gap-8 text-center text-sm">
          <div>
            <div className="h-16 flex items-end justify-center mb-2">
              <span className="block w-48 border-b border-slate-400"></span>
            </div>
            <p className="font-medium text-slate-800">Prepared By</p>
            <p className="text-xs text-slate-500 mt-1">Authorized Signatory</p>
          </div>
          <div>
            <div className="h-16 flex items-end justify-center mb-2">
              <span className="block w-48 border-b border-slate-400"></span>
            </div>
            <p className="font-medium text-slate-800">Delivered By / Driver</p>
            <p className="text-xs text-slate-500 mt-1">Date & Time</p>
          </div>
          <div>
            <div className="h-16 flex items-end justify-center mb-2">
              <span className="block w-48 border-b border-slate-400"></span>
            </div>
            <p className="font-medium text-slate-800">Received By (Customer)</p>
            <p className="text-xs text-slate-500 mt-1">Sign & Stamp</p>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default DeliveryNotePrint;
