import React, { useEffect, useState } from 'react';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Printer, 
  ArrowLeft, 
  Mail, 
  FileText, 
  Zap, 
  CreditCard, 
  ShieldCheck, 
  Building2, 
  Server,
  Edit
} from 'lucide-react';
import { format } from 'date-fns';
import { EmailSendModal } from '../../components/common/EmailSendModal';

const ProFormaPrint = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [company, setCompany] = useState(null);
  const { currencySymbol } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const [pfRes, companyRes] = await Promise.allSettled([
          axios.get(`/api/v1/proforma/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get('/api/v1/company', {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        if (pfRes.status === 'fulfilled') {
          setData(pfRes.value.data);
        } else {
          console.error('Failed to load invoice for printing', pfRes.reason);
        }

        if (companyRes.status === 'fulfilled' && companyRes.value.data) {
          setCompany(companyRes.value.data);
        }
      } catch (error) {
        console.error('Failed to load invoice data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const formatDateSafe = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? 'N/A' : format(d, 'MMM dd, yyyy');
    } catch {
      return 'N/A';
    }
  };

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const companyName = company?.name || authUser?.companyName || 'JTS Middle East';
  const companyAddress = company?.address 
    ? [company.address.street, company.address.city, company.address.state, company.address.country].filter(Boolean).join(', ')
    : '123 Business Avenue, Suite 100, City, State, 12345';
  const companyEmail = company?.email || authUser?.email || 'contact@yourcompany.com';
  const companyPhone = company?.phone || '+971 4 000 0000';
  const companyTaxId = company?.taxId || '';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-12 space-y-4">
        <div className="animate-spin rounded-none h-10 w-10 border-4 border-slate-200 border-t-blue-600"></div>
        <p className="text-xs font-bold tracking-widest text-slate-500 uppercase font-mono">
          Loading Pro-Forma Invoice Terminal...
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-12 space-y-4">
        <div className="p-8 bg-white border border-rose-200 rounded-xl text-center shadow-sm max-w-md">
          <Server size={44} className="text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Document Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 mb-5">The requested pro-forma invoice could not be located or you lack permissions to view it.</p>
          <button 
            onClick={() => navigate('/sales/proforma')}
            className="px-5 py-2.5 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors shadow-sm"
          >
            Return to Registry
          </button>
        </div>
      </div>
    );
  }

  const currencyDisplay = data.currency || currencySymbol || 'AED';

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 space-y-4 sm:space-y-6 w-full max-w-[1400px] mx-auto pb-12 bg-[#f8fafc] min-h-screen px-2 sm:px-4 lg:px-6 pt-2 sm:pt-4 print:p-0 print:m-0 print:max-w-none print:bg-white print:min-h-0 print:space-y-0">
      
      {/* Aggressive Tech Header (Screen Only) with Action Buttons */}
      <div className="relative overflow-hidden rounded-xl bg-[#0a0f1c] border-l-4 border-blue-500 p-4 sm:p-6 text-white shadow-xl print:hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent pointer-events-none"></div>
        
        <div className="relative z-10 space-y-3 sm:space-y-4">
          {/* Top Row: Back button, Title & Status */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3.5 w-full sm:w-auto">
              <button 
                onClick={() => navigate('/sales/proforma')} 
                className="p-2 sm:p-2.5 bg-slate-800/80 border border-slate-700 rounded-lg hover:bg-blue-600 text-slate-300 hover:text-white transition-all shadow-sm flex-shrink-0"
                title="Back to Pro-Forma List"
              >
                <ArrowLeft size={17} />
              </button>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="h-7 w-7 bg-blue-600 flex items-center justify-center rounded shadow-inner flex-shrink-0">
                    <FileText size={15} className="text-white" />
                  </div>
                  <h1 className="text-base sm:text-xl lg:text-2xl font-black tracking-tight text-white uppercase font-mono truncate">
                    Pro-Forma Terminal
                  </h1>
                  <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-400 border border-blue-500/40 rounded font-mono">
                    {data.pfNumber}
                  </span>
                  {data.sourceType && (
                    <span className="hidden sm:inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700 rounded font-mono">
                      {data.sourceType}
                    </span>
                  )}
                </div>
              </div>

              {/* Status Pill on mobile */}
              <div className="flex sm:hidden items-center gap-1.5 bg-[#111827] border border-slate-800 px-2.5 py-1 rounded-md flex-shrink-0">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                  {data.status || 'ACTIVE'}
                </span>
              </div>
            </div>

            {/* Status Pill on Desktop */}
            <div className="hidden sm:flex items-center gap-2 bg-[#111827] border border-slate-800 px-3 py-1.5 rounded-lg shadow-inner flex-shrink-0">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                STATUS: {data.status || 'ACTIVE'}
              </span>
            </div>
          </div>

          {/* Bottom Row / Actions Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5 pt-2.5 border-t border-slate-800/80">
            <p className="text-slate-400 text-xs font-medium tracking-wide hidden sm:block truncate">
              COMMERCIAL INVOICE PROTOCOL • PRE-BILLING & TRANSACTION VERIFICATION
            </p>
            
            <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
              {data.status === 'DRAFT' && (
                <button 
                  onClick={() => navigate(`/sales/proforma/edit/${data._id}`)}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors border border-slate-700 hover:text-white shadow-sm"
                >
                  <Edit size={13} /> Edit
                </button>
              )}
              <button 
                onClick={() => setIsEmailModalOpen(true)} 
                className={`flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-sm ${data.status === 'DRAFT' ? '' : 'col-span-1'}`}
              >
                <Mail size={13} /> Email
              </button>
              <button 
                onClick={() => window.print()} 
                className={`flex items-center justify-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] ${data.status === 'DRAFT' ? 'col-span-2 sm:col-span-1' : 'col-span-1'}`}
              >
                <Printer size={13} /> Print / PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* THE PRO-FORMA INVOICE DOCUMENT SHEET */}
      <div className="bg-white border border-slate-200 shadow-xl rounded-xl sm:rounded-2xl overflow-hidden print:shadow-none print:border-none print:rounded-none w-full">
        
        {/* Top Accent Gradient Bar */}
        <div className="h-2 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 print:bg-slate-900"></div>

        <div className="p-4 sm:p-8 md:p-12 print:p-0 space-y-6 sm:space-y-8">
          
          {/* HEADER SECTION */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-6 border-b-2 border-slate-100 pb-6 sm:pb-8">
            <div className="w-full sm:w-auto">
              <div className="inline-flex items-center gap-1.5 sm:gap-2 mb-2 flex-wrap">
                <span className="text-[9px] sm:text-[10px] font-black tracking-widest uppercase bg-slate-900 text-white px-2 py-0.5 rounded">
                  OFFICIAL COMMERCIAL PROTOCOL
                </span>
                <span className="text-[9px] sm:text-[10px] font-black tracking-widest uppercase bg-rose-50 text-rose-600 border border-rose-200 px-2 py-0.5 rounded">
                  NOT A TAX INVOICE
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight font-mono uppercase">
                PRO-FORMA INVOICE
              </h1>
              <p className="text-xs font-mono font-bold text-slate-500 mt-1 uppercase tracking-wider">
                DOCUMENT REF NO: <span className="text-blue-600 font-black">{data.pfNumber}</span>
              </p>
            </div>

            <div className="text-left sm:text-right w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
              <div className="flex sm:justify-end items-center gap-2 mb-1">
                <div className="h-6 w-6 sm:h-7 sm:w-7 bg-slate-900 text-white rounded flex items-center justify-center font-black text-xs">
                  {companyName?.slice(0, 1) || 'J'}
                </div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight uppercase">
                  {companyName}
                </h2>
              </div>
              <p className="text-xs text-slate-500 font-medium max-w-xs leading-relaxed sm:ml-auto">
                {companyAddress}
              </p>
              <div className="mt-2 text-xs text-slate-500 space-y-0.5 font-mono">
                {companyEmail && <p className="truncate">{companyEmail}</p>}
                {companyPhone && <p>{companyPhone}</p>}
                {companyTaxId && (
                  <p className="text-slate-800 font-bold">
                    TRN: <span className="text-slate-900">{companyTaxId}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* METADATA CARDS: CLIENT PROFILE & PROTOCOLS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            
            {/* Buyer Profile */}
            <div className="bg-slate-50/70 border border-slate-200 rounded-xl overflow-hidden print:border print:border-slate-300">
              <div className="bg-slate-100/80 border-b border-slate-200 px-3.5 sm:px-4 py-2 sm:py-2.5 flex items-center gap-2">
                <Building2 size={14} className="text-blue-600" />
                <h3 className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-700">
                  BILLED TO (BUYER PROFILE)
                </h3>
              </div>
              <div className="p-4 sm:p-5 space-y-2">
                <p className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  {data.customerSnapshot?.name || 'Customer Name'}
                </p>
                {data.customerSnapshot?.billingAddress && (
                  <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                    {data.customerSnapshot.billingAddress}
                  </p>
                )}
                <div className="pt-2 flex flex-col gap-1 text-xs text-slate-500 font-mono">
                  {data.customerSnapshot?.email && (
                    <p className="truncate">Email: <span className="text-slate-800 font-medium">{data.customerSnapshot.email}</span></p>
                  )}
                  {data.customerSnapshot?.phone && (
                    <p>Phone: <span className="text-slate-800 font-medium">{data.customerSnapshot.phone}</span></p>
                  )}
                  {data.customerSnapshot?.taxRegistrationNumber && (
                    <p className="font-bold text-slate-800">
                      Buyer TRN: <span className="text-blue-700">{data.customerSnapshot.taxRegistrationNumber}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Document Protocol Specifications */}
            <div className="bg-slate-50/70 border border-slate-200 rounded-xl overflow-hidden print:border print:border-slate-300">
              <div className="bg-slate-100/80 border-b border-slate-200 px-3.5 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap size={14} className="text-blue-600" />
                  <h3 className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-700">
                    DOCUMENT SPECIFICATIONS
                  </h3>
                </div>
                <span className="text-[9px] sm:text-[10px] font-mono font-bold text-slate-600 uppercase bg-white px-2 py-0.5 rounded border border-slate-200">
                  {data.sourceType || 'MANUAL'}
                </span>
              </div>
              <div className="p-4 sm:p-5">
                <dl className="grid grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-2.5 sm:gap-y-3.5 text-xs">
                  <div>
                    <dt className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Document No.</dt>
                    <dd className="font-mono font-black text-slate-900 mt-0.5 text-xs sm:text-sm truncate">{data.pfNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Currency</dt>
                    <dd className="font-mono font-bold text-slate-900 mt-0.5">{currencyDisplay}</dd>
                  </div>
                  <div>
                    <dt className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Issue Date</dt>
                    <dd className="font-bold text-slate-800 mt-0.5">{formatDateSafe(data.issueDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payment Due</dt>
                    <dd className="font-bold text-slate-800 mt-0.5">{formatDateSafe(data.dueDate)}</dd>
                  </div>
                  {data.paymentTerms && (
                    <div className="col-span-2 pt-2 border-t border-slate-200/60">
                      <dt className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payment Terms</dt>
                      <dd className="font-medium text-slate-700 mt-0.5">{data.paymentTerms}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

          </div>

          {/* ITEM SCHEDULE MATRIX */}
          <div className="border border-slate-200 rounded-xl overflow-hidden print:border print:border-slate-300">
            <div className="bg-slate-900 text-white px-4 sm:px-5 py-2.5 sm:py-3 flex justify-between items-center print:bg-slate-900 print:text-white">
              <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                <Zap size={14} className="text-blue-400" /> Itemized Commercial Schedule
              </h3>
              <span className="text-[9px] sm:text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
                ROWS: {data.items?.length || 0}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm whitespace-nowrap min-w-[520px]">
                <thead className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 sm:px-5 py-3 w-10 text-center">#</th>
                    <th className="px-3 sm:px-5 py-3">Item Designation & SKU</th>
                    <th className="px-3 sm:px-5 py-3 text-center w-20 sm:w-24">Qty</th>
                    <th className="px-3 sm:px-5 py-3 text-right w-28 sm:w-32">Unit Price</th>
                    {data.items?.some(i => (i.discount > 0 || i.taxRate > 0)) && (
                      <th className="px-3 sm:px-5 py-3 text-right w-24 sm:w-28">Tax/Disc</th>
                    )}
                    <th className="px-3 sm:px-5 py-3 text-right w-28 sm:w-36">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-center font-mono text-xs text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                          <div>
                            <p className="font-bold text-slate-900 text-xs sm:text-sm tracking-tight">{item.itemName}</p>
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-0.5">
                              <span className="text-[9px] sm:text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200">
                                SKU: {item.variantSku || item.sku || 'N/A'}
                              </span>
                              {item.attributes && Object.keys(item.attributes).length > 0 && (
                                <span className="text-[9px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                  {Object.entries(item.attributes).map(([k, v]) => `${k}: ${v}`).join(', ')}
                                </span>
                              )}
                              {item.uom && (
                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-1 py-0.2 rounded">
                                  {item.uom}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-center">
                        <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm">
                          {item.quantity}
                        </span>
                        <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase ml-1">
                          {item.uom || 'PCS'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-right font-mono text-slate-700 text-xs sm:text-sm">
                        {currencyDisplay} {item.unitPrice?.toFixed(2)}
                      </td>
                      {data.items?.some(i => (i.discount > 0 || i.taxRate > 0)) && (
                        <td className="px-3 sm:px-5 py-3 sm:py-4 text-right font-mono text-xs text-slate-600">
                          {item.discount > 0 && <span className="text-rose-500 font-bold">-{item.discount}% </span>}
                          {item.taxRate > 0 && <span className="text-slate-500">+{item.taxRate}%</span>}
                          {!item.discount && !item.taxRate && '-'}
                        </td>
                      )}
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-right font-mono font-black text-slate-900 text-xs sm:text-sm">
                        {currencyDisplay} {item.lineTotal?.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* FINANCIAL SUMMARY & ENDORSEMENTS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 pt-2 sm:pt-4">
            
            {/* Left Column: Terms, Notes & Stamp */}
            <div className="lg:col-span-7 space-y-5 sm:space-y-6">
              {(data.notes || data.termsAndConditions || data.deliveryTerms) && (
                <div className="space-y-3.5 sm:space-y-4">
                  {data.notes && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4">
                      <h4 className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-700 mb-1 flex items-center gap-1.5">
                        <FileText size={12} className="text-blue-500" /> Commercial Notes & Instructions
                      </h4>
                      <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">{data.notes}</p>
                    </div>
                  )}
                  {data.termsAndConditions && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4">
                      <h4 className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-700 mb-1 flex items-center gap-1.5">
                        <ShieldCheck size={12} className="text-blue-500" /> Terms & Conditions
                      </h4>
                      <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">{data.termsAndConditions}</p>
                    </div>
                  )}
                  {data.deliveryTerms && (
                    <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <span className="font-bold text-slate-800 uppercase tracking-wider text-[9px] sm:text-[10px]">Delivery Logistics:</span> {data.deliveryTerms}
                    </div>
                  )}
                </div>
              )}

              {/* Endorsement Blocks (Stacked cleanly on mobile, side-by-side on tablet/desktop) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-4 border-t border-slate-200/80">
                <div className="border border-dashed border-slate-300 rounded-xl p-4 text-center">
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-6 sm:mb-8">Official Corporate Seal</p>
                  <div className="h-8 sm:h-10 border-b border-slate-300 mx-6"></div>
                  <p className="text-[9px] sm:text-[10px] font-mono text-slate-400 mt-2">SEAL & VERIFICATION</p>
                </div>
                <div className="border border-dashed border-slate-300 rounded-xl p-4 text-center">
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-6 sm:mb-8">Authorized Signatory</p>
                  <div className="h-8 sm:h-10 border-b border-slate-300 mx-6"></div>
                  <p className="text-[9px] sm:text-[10px] font-mono text-slate-800 font-bold mt-2 truncate">FOR {companyName?.toUpperCase()}</p>
                </div>
              </div>
            </div>

            {/* Right Column: Totals Matrix */}
            <div className="lg:col-span-5">
              <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 sm:py-3 flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 flex items-center gap-1.5">
                    <CreditCard size={13} className="text-blue-600" /> Settlement Summary
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-500">{currencyDisplay}</span>
                </div>

                <div className="p-4 sm:p-5 space-y-2.5 sm:space-y-3 text-xs sm:text-sm">
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="text-xs uppercase tracking-wider font-semibold">Subtotal</span>
                    <span className="font-mono font-bold text-slate-800">
                      {currencyDisplay} {data.subtotal?.toFixed(2)}
                    </span>
                  </div>

                  {data.discountTotal > 0 && (
                    <div className="flex justify-between items-center text-rose-600">
                      <span className="text-xs uppercase tracking-wider font-semibold">Discount Applied</span>
                      <span className="font-mono font-bold">
                        -{currencyDisplay} {data.discountTotal?.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-slate-600">
                    <span className="text-xs uppercase tracking-wider font-semibold">Tax / VAT</span>
                    <span className="font-mono font-bold text-slate-800">
                      {currencyDisplay} {data.taxTotal?.toFixed(2)}
                    </span>
                  </div>

                  {data.shippingCharges > 0 && (
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="text-xs uppercase tracking-wider font-semibold">Freight & Shipping</span>
                      <span className="font-mono font-bold text-slate-800">
                        {currencyDisplay} {data.shippingCharges?.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {data.otherCharges > 0 && (
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="text-xs uppercase tracking-wider font-semibold">Other Charges</span>
                      <span className="font-mono font-bold text-slate-800">
                        {currencyDisplay} {data.otherCharges?.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="pt-3 border-t-2 border-slate-900 mt-2 flex justify-between items-baseline">
                    <div>
                      <span className="text-xs font-black uppercase tracking-widest text-slate-900 block">
                        Commercial Total
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">Gross Amount</span>
                    </div>
                    <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 tracking-tight">
                      {currencyDisplay} {data.grandTotal?.toFixed(2)}
                    </span>
                  </div>

                  {data.amountInWords && (
                    <p className="text-[10px] sm:text-[11px] text-slate-500 italic border-t border-slate-200 pt-2 font-mono">
                      In words: {data.amountInWords}
                    </p>
                  )}

                  {/* Payment Request Callout */}
                  {data.sourceType === 'QUOTE' && data.paymentRequestAmount && (
                    <div className="mt-3.5 sm:mt-4 p-3.5 sm:p-4 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-lg shadow-md print:bg-slate-900 print:text-white">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-blue-200">
                          {data.billingType === 'ADVANCE' ? 'Requested Advance' : data.billingType === 'PROGRESSIVE' ? 'Progressive Request' : 'Balance Settlement'}
                        </span>
                        <span className="text-[9px] sm:text-[10px] font-mono font-bold bg-white/20 px-2 py-0.5 rounded">
                          {data.paymentRequestPercentage || 100}%
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline mt-1.5 sm:mt-2">
                        <span className="text-[11px] sm:text-xs font-bold text-blue-100 uppercase tracking-wider">Due Now:</span>
                        <span className="text-xl sm:text-2xl font-black font-mono tracking-tight">
                          {currencyDisplay} {data.paymentRequestAmount?.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* DOCUMENT FOOTER & VERIFICATION */}
          <div className="pt-6 sm:pt-8 mt-4 sm:mt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-[9px] sm:text-[10px] text-slate-400 font-mono">
            <div>
              <p className="font-bold text-slate-600 uppercase tracking-widest">PRO-FORMA INVOICE AUTHENTICATION</p>
              <p>This is a computer-generated pre-commercial document. Valid without physical stamp if verified.</p>
            </div>
            <div className="text-left sm:text-right">
              <p>DOC HASH: {data._id ? `PFI-${data._id.slice(-8).toUpperCase()}` : 'SECURE'}</p>
              <p>AUTHENTICATED: {format(new Date(), 'yyyy-MM-dd HH:mm:ss')}</p>
            </div>
          </div>

        </div>
      </div>

      {isEmailModalOpen && data && (
        <EmailSendModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          documentType="Pro-Forma Invoice"
          documentNumber={data.pfNumber || data.proFormaNumber}
          recipientName={data.customerSnapshot?.name || data.customerId?.name || 'Customer'}
          defaultEmail={data.customerSnapshot?.email || data.customerId?.email || ''}
          sendEndpoint={`/api/v1/email/proforma/${data._id}`}
        />
      )}
    </div>
  );
};

export default ProFormaPrint;

