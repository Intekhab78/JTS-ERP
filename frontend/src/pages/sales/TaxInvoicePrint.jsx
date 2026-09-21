import React, { useEffect, useState } from 'react';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Printer, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

const TaxInvoicePrint = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const { formatCurrency, currencySymbol } = useCurrency();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/v1/tax-invoices/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setData(res.data);
      } catch (error) {
        console.error('Failed to load invoice', error);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
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
            <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Tax Invoice</h1>
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
            {data.customerSnapshot?.taxRegistrationNumber && (
              <p className="text-sm text-slate-600 mt-1 font-medium">TRN: {data.customerSnapshot.taxRegistrationNumber}</p>
            )}
          </div>
          <div className="text-right">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div className="text-slate-500 font-medium">Invoice Number:</div>
              <div className="font-bold text-slate-800">{data.invoiceNumber}</div>
              
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
              <th className="py-3 text-center w-20">Qty</th>
              <th className="py-3 text-right w-24">Unit Price</th>
              <th className="py-3 text-right w-24">Tax</th>
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
                <td className="py-4 text-center font-medium text-slate-800">{item.quantity}</td>
                <td className="py-4 text-right font-medium text-slate-800">{currencySymbol}{item.unitPrice.toFixed(2)}</td>
                <td className="py-4 text-right font-medium text-slate-800">{currencySymbol}{item.taxAmount.toFixed(2)}</td>
                <td className="py-4 text-right font-bold text-slate-800">{currencySymbol}{item.lineTotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* TOTALS */}
        <div className="flex justify-end border-t border-slate-200 pt-8 mb-12">
          <div className="w-72 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-medium text-slate-800">{currencySymbol}{data.subtotal.toFixed(2)}</span>
            </div>
            {data.discountTotal > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span className="font-medium">-${data.discountTotal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Total Tax</span>
              <span className="font-medium text-slate-800">{currencySymbol}{data.taxTotal.toFixed(2)}</span>
            </div>
            {data.shippingCharges > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Shipping</span>
                <span className="font-medium text-slate-800">{currencySymbol}{data.shippingCharges.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center border-t-2 border-slate-800 pt-3 mt-3">
              <span className="font-bold text-slate-800">Grand Total</span>
              <span className="text-xl font-black text-indigo-600">{currencySymbol}{data.grandTotal.toFixed(2)}</span>
            </div>
            
            {/* Balance Due */}
            <div className="flex justify-between items-center pt-2">
              <span className="font-bold text-slate-800">Amount Paid</span>
              <span className="font-medium text-slate-800">{currencySymbol}{data.amountPaid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center bg-red-50 px-3 py-2 rounded-lg mt-2">
              <span className="font-bold text-red-600">Balance Due</span>
              <span className="text-lg font-black text-red-600">{currencySymbol}{data.balanceDue.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="border-t border-slate-200 pt-8 space-y-6">
          {data.notes && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Notes</h4>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{data.notes}</p>
            </div>
          )}
          {data.termsAndConditions && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Terms & Conditions</h4>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{data.termsAndConditions}</p>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
};

export default TaxInvoicePrint;
