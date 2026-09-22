import React, { useEffect, useState } from 'react';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Printer, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

const ProFormaPrint = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const { formatCurrency, currencySymbol } = useCurrency();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProForma = async () => {
      try {
        const res = await axios.get(`/api/v1/proforma/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setData(res.data);
      } catch (error) {
        console.error('Failed to load invoice for printing', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProForma();
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
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">PRO-FORMA INVOICE</h1>
            <p className="text-sm font-bold text-red-500 mt-1 uppercase tracking-widest border border-red-500 inline-block px-2 py-0.5 rounded">Not a Tax Invoice</p>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold text-slate-800">Your Company Name</h2>
            <p className="text-sm text-slate-500 mt-1">123 Business Avenue, Suite 100<br/>City, State, 12345<br/>contact@yourcompany.com</p>
          </div>
        </div>

        {/* DETAILS */}
        <div className="flex justify-between mb-12">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Billed To</h3>
            <p className="font-bold text-slate-800">{data.customerSnapshot?.name}</p>
            {data.customerSnapshot?.billingAddress && (
              <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{data.customerSnapshot.billingAddress}</p>
            )}
          </div>
          <div className="text-right">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div className="text-slate-500 font-medium">Invoice Number:</div>
              <div className="font-bold text-slate-800">{data.pfNumber}</div>
              
              <div className="text-slate-500 font-medium">Issue Date:</div>
              <div className="font-medium text-slate-800">{format(new Date(data.issueDate), 'MMM dd, yyyy')}</div>
              
              <div className="text-slate-500 font-medium">Due Date:</div>
              <div className="font-medium text-slate-800">{format(new Date(data.dueDate), 'MMM dd, yyyy')}</div>
            </div>
          </div>
        </div>

        {/* ITEMS */}
        <table className="w-full mb-8">
          <thead>
            <tr className="border-b-2 border-slate-800 text-left text-sm font-bold text-slate-800">
              <th className="py-3">Description</th>
              <th className="py-3 text-center w-24">Qty</th>
              <th className="py-3 text-right w-32">Unit Price</th>
              <th className="py-3 text-right w-32">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.items?.map((item, index) => (
              <tr key={index}>
                <td className="py-4">
                  <p className="font-medium text-slate-800">{item.itemName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">SKU: {item.sku}</p>
                </td>
                <td className="py-4 text-center text-slate-700">{item.quantity}</td>
                <td className="py-4 text-right text-slate-700">{currencySymbol}{item.unitPrice?.toFixed(2)}</td>
                <td className="py-4 text-right font-medium text-slate-800">{currencySymbol}{item.lineTotal?.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* TOTALS */}
        <div className="flex justify-end mb-12">
          <div className="w-72 space-y-3">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <span>{currencySymbol}{data.subtotal?.toFixed(2)}</span>
            </div>
            {data.discountTotal > 0 && (
              <div className="flex justify-between text-sm text-red-500">
                <span>Discount</span>
                <span>-{currencySymbol}{data.discountTotal?.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-slate-600">
              <span>Tax</span>
              <span>{currencySymbol}{data.taxTotal?.toFixed(2)}</span>
            </div>
            {data.shippingCharges > 0 && (
              <div className="flex justify-between text-sm text-slate-600">
                <span>Shipping</span>
                <span>{currencySymbol}{data.shippingCharges?.toFixed(2)}</span>
              </div>
            )}
            {data.otherCharges > 0 && (
              <div className="flex justify-between text-sm text-slate-600">
                <span>Other Charges</span>
                <span>{currencySymbol}{data.otherCharges?.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center border-t-2 border-slate-800 pt-3 mt-3">
              <span className="font-bold text-slate-800">
                {data.sourceType === 'QUOTE' ? 'Quote Total' : 'Total'}
              </span>
              <span className={`text-xl ${data.sourceType === 'QUOTE' ? 'font-bold' : 'font-black'} text-slate-800`}>
                {currencySymbol}{data.grandTotal?.toFixed(2)}
              </span>
            </div>
            {data.sourceType === 'QUOTE' && (
              <div className="flex justify-between items-center bg-slate-50 border border-slate-200 p-3 mt-3 rounded-lg print:border-slate-800 print:bg-transparent">
                <div className="flex flex-col">
                  <span className="font-bold text-slate-800 uppercase tracking-wide text-xs">
                    {data.billingType === 'ADVANCE' ? 'Advance Payment' : data.billingType === 'PROGRESSIVE' ? 'Progressive Payment' : 'Balance Payment'}
                  </span>
                  <span className="text-slate-500 text-xs mt-0.5">
                    Requested ({data.paymentRequestPercentage || 100}%)
                  </span>
                </div>
                <span className="text-2xl font-black text-slate-900">
                  {currencySymbol}{data.paymentRequestAmount?.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* NOTES & TERMS */}
        <div className="border-t border-slate-200 pt-8 grid grid-cols-2 gap-8 text-sm">
          {data.notes && (
            <div>
              <h4 className="font-bold text-slate-800 mb-2">Notes</h4>
              <p className="text-slate-600 whitespace-pre-wrap">{data.notes}</p>
            </div>
          )}
          {data.termsAndConditions && (
            <div>
              <h4 className="font-bold text-slate-800 mb-2">Terms & Conditions</h4>
              <p className="text-slate-600 whitespace-pre-wrap">{data.termsAndConditions}</p>
            </div>
          )}
        </div>
        
        {(data.paymentTerms || data.deliveryTerms) && (
          <div className="mt-8 grid grid-cols-2 gap-8 text-sm bg-slate-50 p-4 rounded-lg print:bg-white print:border print:border-slate-200">
            {data.paymentTerms && (
              <div>
                <span className="font-bold text-slate-700">Payment Terms:</span> <span className="text-slate-600">{data.paymentTerms}</span>
              </div>
            )}
            {data.deliveryTerms && (
              <div>
                <span className="font-bold text-slate-700">Delivery Terms:</span> <span className="text-slate-600">{data.deliveryTerms}</span>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default ProFormaPrint;
