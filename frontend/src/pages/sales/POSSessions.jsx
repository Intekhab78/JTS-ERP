import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useCurrency } from '../../contexts/CurrencyContext';
import { Store, ChevronDown, Receipt, Plus, Monitor, Banknote, TrendingUp, CreditCard, ShieldCheck, CheckCircle, Search, Calendar, Filter, Check, AlertTriangle, MoreVertical, Printer } from 'lucide-react';
import NewSessionModal from '../../components/sales/NewSessionModal';
import ZReportModal from '../../components/sales/ZReportModal';
import CloseSessionModal from '../../components/sales/CloseSessionModal';
import AuditReviewModal from '../../components/sales/AuditReviewModal';

const POSSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, count: 0, page: 1, pages: 1 });
  const [search, setSearch] = useState('');
  const [kpis, setKpis] = useState({
    activeCounters: 0,
    todaysCash: 0,
    digitalSales: 0,
    variance: 0
  });

  // Modal States
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false);
  const [zReportModalData, setZReportModalData] = useState({ isOpen: false, session: null });
  const [closeSessionModalData, setCloseSessionModalData] = useState({ isOpen: false, session: null });
  const [auditReviewModalData, setAuditReviewModalData] = useState({ isOpen: false, session: null });
  
  const [isFleetDropdownOpen, setIsFleetDropdownOpen] = useState(false);
  const [selectedFleet, setSelectedFleet] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [availableFleets, setAvailableFleets] = useState([]);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/v1/branches', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        if (res.data) {
          let branchesData = Array.isArray(res.data) ? res.data : (res.data.data || []);
          const authUser = JSON.parse(localStorage.getItem('user') || '{}');
          if (authUser.branches && authUser.branches.length > 0) {
            branchesData = branchesData.filter(b => authUser.branches.includes(b._id));
          } else if (!authUser.permissions?.includes('*')) {
            branchesData = [];
          }
          setAvailableFleets(branchesData);
        }
      } catch (e) {}
    };
    fetchBranches();
  }, []);

  const filteredSessions = sessions.filter(s => {
    if (filterStatus === 'IN_PROGRESS' && s.status !== 'OPEN' && s.status !== 'IN_PROGRESS') return false;
    if (filterStatus === 'CLOSED' && s.status !== 'CLOSED') return false;
    if (filterStatus === 'CLOSING_AUDIT' && s.status !== 'CLOSING_AUDIT') return false;
    if (filterDate) {
      const sessionDate = new Date(s.openedAt).toISOString().split('T')[0];
      if (sessionDate !== filterDate) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      const sessionId = (s._id || '').toLowerCase();
      const cashier = (s.cashier || '').toLowerCase();
      const register = (s.terminal || '').toLowerCase();
      if (!sessionId.includes(q) && !cashier.includes(q) && !register.includes(q)) return false;
    }
    if (selectedFleet !== 'ALL' && s.branchId?.name !== selectedFleet) return false;
    return true;
  });

  const refreshSessions = () => {
    setLoading(true);
    // Component will naturally re-fetch if we put fetch logic in a useCallback or just use a dummy state to trigger re-render
    // But since fetchSessions is inside useEffect, we will extract it out.
  };
  const { currencySymbol } = useCurrency();

  const fetchSessions = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/v1/pos/sessions/reconciliation', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      let fetchedSessions = [];
      let fetchedPagination = { total: 0, count: 0, page: 1, pages: 1 };

      if (res.data && res.data.data) {
        fetchedSessions = res.data.data;
        fetchedPagination = {
          total: res.data.pagination?.total || 0,
          count: res.data.pagination?.count || 0,
          page: res.data.pagination?.page || 1,
          pages: res.data.pagination?.pages || 1
        };
      }

      setSessions(fetchedSessions);
      setPagination(fetchedPagination);

      let activeCounters = 0;
      let todaysCash = 0;
      let digitalSales = 0;
      let variance = 0;

      const today = new Date();
      const isToday = (dateStr) => {
        const d = new Date(dateStr);
        return d.getDate() === today.getDate() &&
          d.getMonth() === today.getMonth() &&
          d.getFullYear() === today.getFullYear();
      };

      fetchedSessions.forEach(s => {
        if (s.status === 'OPEN' || s.status === 'IN_PROGRESS') {
          activeCounters++;
        }
        if (isToday(s.openedAt)) {
          todaysCash += s.expectedCash || s.closingCash || s.openingCash || 0;
          variance += s.cashDifference || 0;
        }
      });

      setKpis({ activeCounters, todaysCash, digitalSales, variance });

    } catch (error) {
      console.error('Error fetching sessions:', error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  // Logic replaced above

  useEffect(() => {
    fetchSessions();
  }, []);


  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getStatusPill = (status) => {
    switch (status) {
      case 'IN_PROGRESS':
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">In Progress</span>
          </div>
        );
      case 'CLOSING_AUDIT':
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Closing Audit</span>
          </div>
        );
      case 'CLOSED':
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Closed & Posted</span>
          </div>
        );
      default:
        return null;
    }
  };

  const getDiscrepancyBadge = (amount) => {
    if (amount === 0 || !amount) {
      return (
        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100/80 text-emerald-700">
          <Check size={14} strokeWidth={2.5} />
          <span className="text-[11px] font-bold">AED 0.00 Balanced</span>
        </div>
      );
    } else if (amount > 0) {
      return (
        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100/80 text-rose-700">
          <AlertTriangle size={14} strokeWidth={2.5} />
          <span className="text-[11px] font-bold">+AED {amount.toFixed(2)} Over</span>
        </div>
      );
    } else {
      return (
        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100/80 text-rose-700">
          <AlertTriangle size={14} strokeWidth={2.5} />
          <span className="text-[11px] font-bold">-AED {Math.abs(amount).toFixed(2)} Short</span>
        </div>
      );
    }
  };

  return (
    <div className="flex-1 w-full bg-slate-50 px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6 max-w-[1720px] mx-auto font-sans text-[14px] text-slate-900 antialiased">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-indigo-600 tracking-wider uppercase">Sales & Cash Desk Control</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500 font-medium text-xs">
              Showing {filteredSessions.length > 0 ? 1 : 0} - {filteredSessions.length} of {filteredSessions.length} recorded register sessions
            </span>
          </div>
          <h1 className="font-sans text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">POS Sessions</h1>
          <p className="text-xs sm:text-sm text-slate-500">Monitor cashier cash drawers, register shifts, and daily closing balances across branches.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 relative">

          <div className="relative">
            <div
              onClick={() => setIsFleetDropdownOpen(!isFleetDropdownOpen)}
              className="relative inline-flex items-center bg-white border border-slate-200/80 rounded-lg shadow-sm pl-3 pr-8 py-2 text-xs sm:text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <Store size={18} className="text-indigo-500 mr-2" />
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-slate-500 leading-none mb-0.5">Active Fleet</span>
                <span className="leading-none">{selectedFleet === 'ALL' ? 'All Branches & Terminals' : `${selectedFleet} - Terminals`}</span>
              </div>
              <ChevronDown size={18} className={`absolute right-2 text-slate-400 transition-transform ${isFleetDropdownOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* Dropdown Menu */}
            {isFleetDropdownOpen && (
              <div className="absolute top-full mt-2 left-0 w-full min-w-[220px] bg-white rounded-lg shadow-xl border border-slate-100 py-1 z-50 animate-in fade-in slide-in-from-top-2">
                <button
                  onClick={() => { setSelectedFleet('ALL'); setIsFleetDropdownOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 text-slate-900"
                >
                  All Branches & Terminals
                </button>
                {availableFleets.map(b => (
                  <button
                    key={b._id}
                    onClick={() => { setSelectedFleet(b.name); setIsFleetDropdownOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-slate-50 text-slate-700"
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => setZReportModalData({ isOpen: true, session: sessions[0] })} className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white text-slate-900 hover:bg-slate-50 border border-slate-200/80 rounded-lg shadow-sm text-xs sm:text-sm font-semibold transition-all">
            <Receipt size={18} className="text-slate-500" />
            <span>Z-Report Summary Export</span>
          </button>

          <button onClick={() => setIsNewSessionModalOpen(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white hover:opacity-95 rounded-lg shadow-[0_4px_14px_0_rgba(79,70,229,0.35)] text-xs sm:text-sm font-semibold transition-all">
            <Plus size={18} />
            <span>Open New Session</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1 */}
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Active Open Sessions</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="font-sans text-2xl sm:text-3xl font-bold text-slate-900">{kpis.activeCounters} Counters</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <Monitor size={22} />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
              <span className={`w-1.5 h-1.5 rounded-full ${kpis.activeCounters > 0 ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
              {kpis.activeCounters > 0 ? 'Registers active now' : 'No active registers'}
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Today's Expected Cash</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-sans text-2xl sm:text-3xl font-bold text-slate-900">AED {kpis.todaysCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
              <Banknote size={22} />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-1 text-xs font-semibold text-indigo-600">
              <TrendingUp size={14} />
              <span>Live calculations</span>
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Card / Digital Sales</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-sans text-2xl sm:text-3xl font-bold text-slate-900">AED {kpis.digitalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
              <CreditCard size={22} />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-1 text-xs font-semibold text-blue-600">
              <Receipt size={14} />
              <span>Digital payments tracking</span>
            </div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Cash Discrepancy / Variance</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className={`font-sans text-2xl sm:text-3xl font-bold ${kpis.variance === 0 ? 'text-emerald-600' : kpis.variance > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {kpis.variance > 0 ? '+' : ''}AED {kpis.variance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${kpis.variance >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {kpis.variance >= 0 ? <ShieldCheck size={22} /> : <AlertTriangle size={22} />}
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className={`flex items-center gap-1 text-xs font-semibold ${kpis.variance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {kpis.variance === 0 ? (
                <><CheckCircle size={14} /> <span>100% balanced today</span></>
              ) : kpis.variance > 0 ? (
                <><TrendingUp size={14} /> <span>Excess cash reported</span></>
              ) : (
                <><AlertTriangle size={14} /> <span>Variance detected</span></>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Strip */}
      <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200/80 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-center">
          <div className="md:col-span-5 relative flex items-center">
            <Search size={18} className="absolute left-3 text-slate-400" />
            <input
              className="w-full h-10 pl-9 pr-3 bg-slate-50 rounded-lg text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 border-none focus:ring-2 focus:ring-indigo-600/30 focus:bg-white transition-all"
              placeholder="Search by Session ID, Cashier, or Register..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="md:col-span-7 flex items-center gap-3 overflow-x-auto custom-scrollbar pb-1 md:pb-0">
            <div className="flex items-center gap-1 shrink-0 md:ml-auto">
              <button onClick={() => setFilterStatus('ALL')} className={`whitespace-nowrap px-3 py-1.5 text-[13px] rounded-md transition-colors ${filterStatus === 'ALL' ? 'font-semibold bg-slate-100 text-slate-800' : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                All Sessions <span className={`ml-1 text-[11px] px-1.5 py-0.5 rounded ${filterStatus === 'ALL' ? 'bg-white text-slate-500' : 'bg-slate-100 text-slate-400'}`}>{sessions.length}</span>
              </button>
              <button onClick={() => setFilterStatus('IN_PROGRESS')} className={`whitespace-nowrap px-3 py-1.5 text-[13px] rounded-md transition-colors ${filterStatus === 'IN_PROGRESS' ? 'font-semibold bg-emerald-50 text-emerald-700' : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                In Progress <span className={`ml-1 text-[11px] px-1.5 py-0.5 rounded ${filterStatus === 'IN_PROGRESS' ? 'bg-white text-emerald-600' : 'bg-emerald-50 text-emerald-600'}`}>{sessions.filter(s => s.status === 'OPEN' || s.status === 'IN_PROGRESS').length}</span>
              </button>
              <button onClick={() => setFilterStatus('CLOSED')} className={`whitespace-nowrap px-3 py-1.5 text-[13px] rounded-md transition-colors ${filterStatus === 'CLOSED' ? 'font-semibold bg-slate-100 text-slate-700' : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                Closed & Posted <span className={`ml-1 text-[11px] px-1.5 py-0.5 rounded ${filterStatus === 'CLOSED' ? 'bg-white text-slate-500' : 'bg-slate-100 text-slate-500'}`}>{sessions.filter(s => s.status === 'CLOSED').length}</span>
              </button>
              <button onClick={() => setFilterStatus('CLOSING_AUDIT')} className={`whitespace-nowrap px-3 py-1.5 text-[13px] rounded-md transition-colors ${filterStatus === 'CLOSING_AUDIT' ? 'font-semibold bg-rose-50 text-rose-700' : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                Requires Audit <span className={`ml-1 text-[11px] px-1.5 py-0.5 rounded ${filterStatus === 'CLOSING_AUDIT' ? 'bg-white text-rose-600' : 'bg-rose-50 text-rose-600'}`}>{sessions.filter(s => s.status === 'CLOSING_AUDIT').length}</span>
              </button>
            </div>

            <div className="w-px h-6 bg-slate-200 shrink-0 mx-1 hidden sm:block"></div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center bg-white border border-slate-200/60 rounded-lg px-2.5 py-1.5 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 hover:bg-slate-50 transition-colors">
                <Calendar size={16} className="text-indigo-500 mr-2 shrink-0" />
                <input 
                  type="date" 
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="bg-transparent border-none p-0 text-[13px] font-semibold text-slate-700 focus:ring-0 cursor-pointer outline-none w-auto"
                />
              </div>
              {filterDate && (
                <button onClick={() => setFilterDate('')} className="text-[11px] font-medium text-slate-400 hover:text-slate-600 underline whitespace-nowrap">Clear</button>
              )}
              <button className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-md transition-colors border border-transparent hover:border-slate-200">
                <Filter size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden flex flex-col">
        <div className="w-full overflow-x-auto custom-scroll">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider font-bold border-b border-slate-200">
                <th className="py-3 px-4" scope="col">Session Ref</th>
                <th className="py-3 px-3" scope="col">Terminal / POS</th>
                <th className="py-3 px-3" scope="col">Cashier / Staff</th>
                <th className="py-3 px-3" scope="col">Opening Details</th>
                <th className="py-3 px-3 text-center" scope="col">Total Sales</th>
                <th className="py-3 px-3 text-center" scope="col">Closing / Expected</th>
                <th className="py-3 px-3 text-center" scope="col">Discrepancy</th>
                <th className="py-3 px-3 text-center" scope="col">Status</th>
                <th className="py-3 px-4 text-right" scope="col">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px]">
              {filteredSessions.length === 0 && !loading ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Monitor size={32} className="text-slate-300" />
                      <p>No POS sessions found matching your filters.</p>
                    </div>
                  </td>
                </tr>
              ) : filteredSessions.map((s, idx) => {
                const sessionId = s._id || `SES-${idx}`;
                const terminal = s.registerId?.name || s.branchId?.name || 'Main Register';
                const terminalDesc = s.registerId?.code || 'Checkout Counter';
                const cashierName = s.openedBy ? `${s.openedBy.firstName || ''} ${s.openedBy.lastName || ''}`.trim() || s.openedBy.name : 'Unknown Cashier';
                const cashierEmpId = s.openedBy?.employeeId ? `EMP-${s.openedBy.employeeId.toString().substring(0, 4).toUpperCase()}` : 'EMP-N/A';
                const avatar = getInitials(cashierName);

                const authUser = JSON.parse(localStorage.getItem('user') || '{}');
                const canAudit = authUser.permissions?.includes('*') || authUser.permissions?.includes('AUDIT_POS_SESSIONS') || authUser.roleName === 'TENANT ADMIN';

                const openedAt = new Date(s.openedAt);
                const closedAt = s.closedAt ? new Date(s.closedAt) : null;

                const openingCash = s.openingCash || 0;
                const cashSales = s.currentCashSales || 0;
                const totalSales = s.currentTotalSales || 0;
                const cardSales = totalSales > cashSales ? totalSales - cashSales : 0;
                const expectedCash = s.expectedCash || (openingCash + cashSales);
                const closingCash = s.closingCash || 0;
                const discrepancy = s.cashDifference || 0;
                const status = s.status || 'OPEN';
                const closingDesc = s.closingDesc || (status === 'OPEN' ? `Expected: ${expectedCash.toFixed(2)}` : 'Settled');

                let displayAmount = closingCash;
                let displaySubtext = closingDesc;
                
                if (status === 'OPEN' || status === 'IN_PROGRESS') {
                  displayAmount = expectedCash;
                  displaySubtext = 'Live in drawer';
                } else if (status === 'CLOSING_AUDIT') {
                  displayAmount = closingCash;
                  displaySubtext = `Expected: ${expectedCash.toFixed(2)}`;
                } else {
                  displayAmount = closingCash;
                  displaySubtext = 'Settled to Vault';
                }

                const sessionIdCode = s.sessionNumber || (s._id ? s._id.substring(s._id.length - 8).toUpperCase() : `SES-${idx}`);

                return (
                  <tr key={sessionId} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-4 px-4 font-bold text-indigo-800 whitespace-nowrap">
                      <div className="flex items-start gap-2 pt-1">
                        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${status === 'OPEN' || status === 'IN_PROGRESS' ? 'bg-emerald-500' : status === 'CLOSING_AUDIT' ? 'bg-rose-500' : 'bg-slate-400'}`}></span>
                        <div className="flex flex-col text-[13px] leading-tight font-bold text-indigo-900 tracking-tight">
                          <span>POS-SES-</span>
                          <span>{sessionIdCode}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 text-sm mb-0.5">{terminal}</span>
                        <span className="text-[11px] text-slate-500">{terminalDesc}</span>
                        <span className="text-[11px] text-slate-500">Counter • Zone A</span>
                      </div>
                    </td>
                    <td className="py-4 px-3">
                      <div className="flex items-center gap-2.5">
                        <img className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200" src={`https://ui-avatars.com/api/?name=${encodeURIComponent(cashierName)}&background=f1f5f9&color=475569&bold=true`} alt={cashierName} />
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 leading-tight mb-0.5">{cashierName}</span>
                          <span className="text-[11px] font-mono text-slate-500">{cashierEmpId}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-3 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 mb-0.5">{openedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, {openedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="text-[11px] text-slate-500">
                          {closedAt ? `Shift End: ${closedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : `Opening: AED ${openingCash.toFixed(2)}`}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-3 text-center whitespace-nowrap">
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-slate-800 mb-0.5">AED {totalSales.toFixed(2)}</span>
                        <span className="text-[11px] text-slate-500">{s.tickets || 0} tickets</span>
                      </div>
                    </td>
                    <td className="py-4 px-3 text-center whitespace-nowrap">
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-slate-800 mb-0.5">AED {displayAmount.toFixed(2)}</span>
                        <span className="text-[11px] text-slate-500">{displaySubtext}</span>
                      </div>
                    </td>
                    <td className="py-4 px-3 text-center whitespace-nowrap">
                      {getDiscrepancyBadge(discrepancy)}
                    </td>
                    <td className="py-4 px-3 text-center whitespace-nowrap">
                      {getStatusPill(status === 'OPEN' ? 'IN_PROGRESS' : status)}
                    </td>
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {(status === 'OPEN' || status === 'IN_PROGRESS') && (
                          <button 
                            onClick={() => setCloseSessionModalData({ isOpen: true, session: s })}
                            className="px-4 py-2 bg-indigo-700 text-white hover:bg-indigo-800 rounded-md text-[11px] font-bold tracking-wide transition-colors shadow-sm"
                          >
                            Close & Reconcile
                          </button>
                        )}
                        {status === 'CLOSING_AUDIT' && (
                          <>
                            {canAudit ? (
                              <button 
                                onClick={() => setAuditReviewModalData({ isOpen: true, session: s })}
                                className="px-4 py-2 bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 rounded-md text-[11px] font-bold tracking-wide transition-colors"
                              >
                                Audit Variance
                              </button>
                            ) : (
                              <button 
                                disabled
                                className="px-4 py-2 bg-slate-100 border border-slate-200 text-slate-400 rounded-md text-[11px] font-bold tracking-wide cursor-not-allowed"
                              >
                                Audit Pending
                              </button>
                            )}
                            <button className="w-8 h-8 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                              <MoreVertical size={18} />
                            </button>
                          </>
                        )}
                        {status === 'CLOSED' && (
                          <>
                            <button onClick={() => setZReportModalData({ isOpen: true, session: s })} className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md text-[11px] font-bold tracking-wide transition-colors flex items-center gap-1.5">
                              <Receipt size={14} />
                              View Z-Report
                            </button>
                            <button onClick={() => setZReportModalData({ isOpen: true, session: s })} className="w-8 h-8 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                              <Printer size={16} />
                            </button>
                            <button className="w-8 h-8 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                              <MoreVertical size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="bg-slate-50/50 border-t border-slate-200 p-3 sm:px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>Showing <strong className="text-slate-900 font-semibold">{sessions.length > 0 ? (pagination.page - 1) * 50 + 1 : 0}-{sessions.length > 0 ? (pagination.page - 1) * 50 + pagination.count : 0}</strong> of <strong className="text-slate-900 font-semibold">{pagination.total}</strong> recorded register sessions</span>
            <div className="hidden sm:flex items-center gap-2">
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <span>Page size:</span>
                <select className="bg-transparent border-none text-slate-900 font-semibold focus:ring-0 cursor-pointer p-0 text-xs">
                  <option>50 per page</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors" disabled={pagination.page <= 1}>Previous</button>
            <div className="flex items-center gap-0.5">
              <button className="w-7 h-7 flex items-center justify-center text-xs font-bold bg-indigo-600 text-white rounded-md">{pagination.page}</button>
            </div>
            <button className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors" disabled={pagination.page >= pagination.pages}>Next</button>
          </div>
        </div>
      </div>
      {/* Modals */}
      <NewSessionModal
        isOpen={isNewSessionModalOpen}
        onClose={() => setIsNewSessionModalOpen(false)}
        onSuccess={fetchSessions}
      />

      {zReportModalData.isOpen && (
        <ZReportModal
          isOpen={zReportModalData.isOpen}
          onClose={() => setZReportModalData({ isOpen: false, session: null })}
          session={zReportModalData.session}
        />
      )}

      {closeSessionModalData.isOpen && (
        <CloseSessionModal
          isOpen={closeSessionModalData.isOpen}
          onClose={() => setCloseSessionModalData({ isOpen: false, session: null })}
          session={closeSessionModalData.session}
          onSuccess={() => {
            setCloseSessionModalData({ isOpen: false, session: null });
            fetchSessions();
          }}
        />
      )}

      {auditReviewModalData.isOpen && (
        <AuditReviewModal
          isOpen={auditReviewModalData.isOpen}
          onClose={() => setAuditReviewModalData({ isOpen: false, session: null })}
          session={auditReviewModalData.session}
          onSuccess={() => {
            setAuditReviewModalData({ isOpen: false, session: null });
            fetchSessions();
          }}
        />
      )}
    </div>
  );
};

export default POSSessions;
