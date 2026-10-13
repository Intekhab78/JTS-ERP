import React, { useState, useEffect } from 'react';
import { useCurrency } from '../../contexts/CurrencyContext';
import axios from 'axios';
import { FileText, Plus, Filter, Edit, Trash2, CheckCircle2, Clock, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { DataTable } from '../../components/common/DataTable';
import { SearchInput } from '../../components/ui/SearchInput';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmailSendModal } from '../../components/common/EmailSendModal';

const Quotes = () => {
  const [quotes, setQuotes] = useState([]);
  const { formatCurrency, currencySymbol } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [branches, setBranches] = useState([]);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [emailModal, setEmailModal] = useState({ isOpen: false, quote: null });
  const navigate = useNavigate();

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  useEffect(() => {
    fetchQuotes();
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const activeCompanyId = localStorage.getItem('active_company_id');
      const params = new URLSearchParams();
      if (activeCompanyId && activeCompanyId !== 'ALL') {
        params.append('legalCompanyId', activeCompanyId);
      }

      const res = await axios.get(`/api/v1/branches?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setBranches(res.data);
    } catch (error) {
      console.error('Failed to fetch branches', error);
    }
  };

  const fetchQuotes = async () => {
    try {
      const res = await axios.get('/api/v1/quotes', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setQuotes(res.data);
    } catch (error) {
      console.error('Failed to fetch quotes', error);
    } finally {
      setLoading(false);
    }
  };

  const isWithinDateFilter = (dateString, filter) => {
    if (!filter) return true;
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (filter === 'today') return date >= today;
    if (filter === 'this_week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      return date >= weekAgo;
    }
    if (filter === 'this_month') {
      const monthAgo = new Date(today);
      monthAgo.setMonth(today.getMonth() - 1);
      return date >= monthAgo;
    }
    return true;
  };

  const filteredQuotes = quotes.filter(q => {
    const matchesSearch = q.quoteNumber.toLowerCase().includes(search.toLowerCase()) ||
      (q.customerSnapshot?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (q.branchId?.name || '').toLowerCase().includes(search.toLowerCase());

    const matchesBranch = selectedBranchFilter ? (q.branchId?._id === selectedBranchFilter || q.branchId === selectedBranchFilter) : true;
    const matchesDate = isWithinDateFilter(q.quoteDate || q.createdAt, dateFilter);
    const matchesStatus = statusFilter ? q.status === statusFilter : true;

    return matchesSearch && matchesBranch && matchesDate && matchesStatus;
  });

  const kpis = {
    total: filteredQuotes.length,
    converted: filteredQuotes.filter(q => q.status === 'CONVERTED').length,
    pending: filteredQuotes.filter(q => ['DRAFT', 'SENT', 'VIEWED'].includes(q.status)).length
  };

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
        await axios.delete(`/api/v1/quotes/${id}`, {
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
          <button
            onClick={() => setEmailModal({ isOpen: true, quote: row })}
            className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-md hover:bg-emerald-50 transition-colors"
            title="Send Quote by Email"
          >
            <Mail className="h-4 w-4" />
          </button>
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
    <div className="animate-in fade-in zoom-in-95 duration-500 space-y-6 max-w-[1720px] mx-auto pb-10 bg-[#f8fafc] min-h-screen">

      {/* Aggressive Tech Header */}
      <div className="relative overflow-hidden rounded-none sm:rounded-xl bg-[#0a0f1c] border-l-4 border-blue-500 p-8 text-white shadow-2xl mt-4 sm:mx-4 lg:mx-8">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent pointer-events-none"></div>

        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-8 bg-blue-600 flex items-center justify-center rounded">
                <FileText size={18} className="text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white uppercase">Quotations</h1>
            </div>
            <p className="text-slate-400 text-sm font-medium tracking-wide max-w-xl">
              COMMERCIAL OFFERS • SALES PIPELINE & QUOTES
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-3 bg-[#111827] border border-slate-800 p-2 rounded-lg shadow-inner">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">System Online</span>
            </div>
            {hasPermission('CREATE_QUOTES') && (
              <button
                onClick={() => navigate('/sales/quotes/new')}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md font-bold text-sm tracking-wider uppercase transition-colors shadow-lg border border-blue-400 flex items-center gap-2"
              >
                <Plus size={16} strokeWidth={3} /> Create Quote
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex flex-col xl:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 items-center w-full xl:max-w-5xl">
            <div className="relative w-full sm:flex-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Search Quotes</label>
              <SearchInput
                placeholder="SCAN BY QUOTE #, CUSTOMER, OR BRANCH..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-10 rounded-md border-2 border-slate-200 bg-slate-50 shadow-sm font-mono text-sm placeholder:text-slate-400 focus:border-blue-600 focus:ring-0 transition-colors uppercase w-full"
              />
            </div>

            <div className="relative w-full sm:w-48 shrink-0">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Branch</label>
              <select
                className="flex h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors cursor-pointer outline-none uppercase"
                value={selectedBranchFilter}
                onChange={e => setSelectedBranchFilter(e.target.value)}
              >
                <option value="">ALL BRANCHES</option>
                {branches.map(b => (
                  <option key={b._id} value={b._id}>{b.name.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div className="relative w-full sm:w-40 shrink-0">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Time Range</label>
              <select
                className="flex h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors cursor-pointer outline-none uppercase"
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
              >
                <option value="">ALL TIME</option>
                <option value="today">TODAY</option>
                <option value="this_week">LAST 7 DAYS</option>
                <option value="this_month">LAST 30 DAYS</option>
              </select>
            </div>
            
            <div className="relative w-full sm:w-40 shrink-0">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Status</label>
              <select
                className="flex h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors cursor-pointer outline-none uppercase"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="">ALL STATUSES</option>
                <option value="DRAFT">DRAFT</option>
                <option value="SENT">SENT</option>
                <option value="VIEWED">VIEWED</option>
                <option value="ACCEPTED">ACCEPTED</option>
                <option value="REJECTED">REJECTED</option>
                <option value="CONVERTED">CONVERTED</option>
                <option value="EXPIRED">EXPIRED</option>
              </select>
            </div>
          </div>
        </div>

        {/* Aggressive KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-slate-300 transition-all">
            <div className="p-5 flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Quotes</p>
                <h3 className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{kpis.total}</h3>
              </div>
              <div className="p-2.5 bg-slate-100 text-slate-600 rounded-lg group-hover:bg-slate-800 group-hover:text-white transition-colors">
                <FileText size={22} strokeWidth={2.5} />
              </div>
            </div>
            <div className="h-1.5 w-full bg-slate-200"><div className="h-full bg-slate-800 w-full"></div></div>
          </div>

          <div className="bg-white border border-emerald-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-emerald-400 transition-all">
            <div className="p-5 flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Converted</p>
                <h3 className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{kpis.converted}</h3>
              </div>
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <CheckCircle2 size={22} strokeWidth={2.5} />
              </div>
            </div>
            <div className="h-1.5 w-full bg-emerald-100"><div className="h-full bg-emerald-500 w-[70%]"></div></div>
          </div>

          <div className="bg-white border border-amber-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-amber-400 transition-all">
            <div className="p-5 flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-amber-600 uppercase tracking-widest mb-1">Pending / Draft</p>
                <h3 className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{kpis.pending}</h3>
              </div>
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-500 group-hover:text-white transition-colors">
                <Clock size={22} strokeWidth={2.5} />
              </div>
            </div>
            <div className="h-1.5 w-full bg-amber-100"><div className="h-full bg-amber-500 w-[30%]"></div></div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <FileText size={16} className="text-blue-500" /> Quotation Matrix
            </h2>
            <span className="text-xs font-bold text-slate-500 font-mono px-2 py-1 bg-slate-200 rounded">RECORDS: {filteredQuotes.length}</span>
          </div>
          <DataTable
            columns={columns}
            data={filteredQuotes}
            isLoading={loading}
            emptyTitle="NO QUOTATIONS FOUND"
            emptyDescription="THERE ARE NO QUOTATIONS MATCHING YOUR SEARCH CRITERIA."
          />
        </div>
      </div>

      {emailModal.isOpen && emailModal.quote && (
        <EmailSendModal
          isOpen={emailModal.isOpen}
          onClose={() => setEmailModal({ isOpen: false, quote: null })}
          documentType="Quotation"
          documentNumber={emailModal.quote.quoteNumber}
          recipientName={emailModal.quote.customerSnapshot?.name}
          defaultEmail={emailModal.quote.customerSnapshot?.email}
          sendEndpoint={`/api/v1/email/quote/${emailModal.quote._id}`}
        />
      )}
    </div>
  );
};

export default Quotes;
