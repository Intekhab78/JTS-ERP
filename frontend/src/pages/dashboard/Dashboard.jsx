import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  TrendingUp, TrendingDown, Users, ShoppingBag, 
  PackageOpen, MoreVertical, DollarSign, Activity, ShoppingCart, 
  AlertCircle, Plus, FileText, Truck, Store, Calendar, ChevronDown,
  BarChart2, PieChart as PieChartIcon, UserCheck, Wallet, Clock, User, Check
} from 'lucide-react';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Utility to format INR
  const formatINR = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  const getCurrentMonthText = () => {
    const start = new Date();
    start.setDate(1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    const opts = { day: '2-digit', month: 'short', year: 'numeric' };
    return `${start.toLocaleDateString('en-GB', opts)} - ${end.toLocaleDateString('en-GB', opts)}`;
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await axios.get('/api/v1/dashboard/summary', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setData(res.data);
      } catch (error) {
        console.error("Error fetching dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'completed':
      case 'received':
        return 'text-emerald-600 bg-emerald-50';
      case 'pending':
        return 'text-amber-600 bg-amber-50';
      default:
        return 'text-slate-600 bg-slate-50';
    }
  };

  const getIconForType = (type) => {
    switch(type) {
      case 'cart': return <ShoppingCart size={16} />;
      case 'alert': return <AlertCircle size={16} />;
      case 'user': return <User size={16} />;
      case 'check': return <Check size={16} />;
      case 'money': return <DollarSign size={16} />;
      case 'clock': return <Clock size={16} />;
      case 'wallet': return <Wallet size={16} />;
      case 'user-check': return <UserCheck size={16} />;
      case 'file-text': return <FileText size={16} />;
      case 'file': return <FileText size={16} />;
      default: return <MoreVertical size={16} />;
    }
  };

  if (loading) {
    return (
      <div className="p-8 bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#f4f7fb] min-h-screen text-slate-800 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Good Morning, {user.name || 'Aniket'}!</h1>
          <p className="text-sm text-slate-500">Here's what's happening with your business today.</p>
        </div>
        
        <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:bg-slate-50">
          <Calendar size={16} className="text-blue-500" />
          <span>{getCurrentMonthText()}</span>
          <ChevronDown size={16} className="text-slate-400" />
        </button>
      </div>

      {/* 8 Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
            <BarChart2 size={24} className="text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Total Sales</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatINR(data?.metrics?.totalSales)}</h3>
            <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-emerald-500">
              <TrendingUp size={14} />
              <span>{data?.metrics?.trends?.sales?.value}% vs last month</span>
            </div>
          </div>
        </div>

        {/* Total Purchase */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
            <ShoppingCart size={24} className="text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Total Purchase</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatINR(data?.metrics?.totalPurchase)}</h3>
            <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-emerald-500">
              <TrendingUp size={14} />
              <span>{data?.metrics?.trends?.purchase?.value}% vs last month</span>
            </div>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
            <DollarSign size={24} className="text-purple-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Net Profit</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatINR(data?.metrics?.netProfit)}</h3>
            <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-emerald-500">
              <TrendingUp size={14} />
              <span>{data?.metrics?.trends?.profit?.value}% vs last month</span>
            </div>
          </div>
        </div>

        {/* Total Customers */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
            <Users size={24} className="text-orange-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Total Customers</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{data?.metrics?.totalCustomers?.toLocaleString()}</h3>
            <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-emerald-500">
              <TrendingUp size={14} />
              <span>{data?.metrics?.trends?.customers?.value}% vs last month</span>
            </div>
          </div>
        </div>

        {/* Receivable */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center shrink-0">
            <Activity size={24} className="text-teal-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Receivable</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatINR(data?.metrics?.receivable)}</h3>
            <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-rose-500">
              <TrendingDown size={14} />
              <span>{Math.abs(data?.metrics?.trends?.receivable?.value)}% vs last month</span>
            </div>
          </div>
        </div>

        {/* Payable */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <FileText size={24} className="text-red-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Payable</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatINR(data?.metrics?.payable)}</h3>
            <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-rose-500">
              <TrendingDown size={14} />
              <span>{Math.abs(data?.metrics?.trends?.payable?.value)}% vs last month</span>
            </div>
          </div>
        </div>

        {/* Stock Value */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
            <PackageOpen size={24} className="text-indigo-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Stock Value</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatINR(data?.metrics?.stockValue)}</h3>
            <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-emerald-500">
              <TrendingUp size={14} />
              <span>{data?.metrics?.trends?.stock?.value}% vs last month</span>
            </div>
          </div>
        </div>

        {/* Total Employees */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
            <UserCheck size={24} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Total Employees</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{data?.metrics?.totalEmployees}</h3>
            <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-emerald-500">
              <TrendingUp size={14} />
              <span>{data?.metrics?.trends?.employees?.value}% vs last month</span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row (Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Sales Overview */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 lg:col-span-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-slate-800">Sales Overview</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> This Month</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-200"></div> Last Month</span>
              </div>
              <select className="text-xs border border-slate-200 rounded px-2 py-1 outline-none">
                <option>Daily</option>
                <option>Weekly</option>
              </select>
            </div>
          </div>
          <div className="flex-1 min-h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.salesOverview} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} tickFormatter={(value) => `₹${value}L`} />
                <RechartsTooltip cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Line type="monotone" dataKey="thisMonth" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff'}} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="lastMonth" stroke="#bfdbfe" strokeWidth={3} dot={{r: 4, fill: '#bfdbfe', strokeWidth: 2, stroke: '#fff'}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sales by Category */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 lg:col-span-3 flex flex-col">
          <h2 className="text-base font-bold text-slate-800 mb-2">Sales by Category</h2>
          <div className="flex-1 flex flex-col justify-center items-center relative">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.salesByCategory}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {data?.salesByCategory?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-4">
              <span className="text-lg font-bold text-slate-800">{formatINR(data?.metrics?.totalSales || 0)}</span>
              <span className="text-[10px] text-slate-500 font-semibold">Total Sales</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-3 mt-4">
            {data?.salesByCategory?.map((cat, i) => (
              <div key={i} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: cat.fill}}></div>
                  <span className="text-slate-600 font-medium truncate w-16">{cat.name}</span>
                </div>
                <span className="font-bold text-slate-800">{cat.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Order Status */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 lg:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-base font-bold text-slate-800">Order Status (Online Store)</h2>
            <a href="#" className="text-xs text-blue-500 font-semibold hover:underline">View All</a>
          </div>
          <div className="flex-1 flex flex-col justify-center items-center relative">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.orderStatus}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {data?.orderStatus?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-4">
              <span className="text-lg font-bold text-slate-800">{data?.orderStatus?.reduce((a, c) => a + c.value, 0) || 0}</span>
              <span className="text-[10px] text-slate-500 font-semibold">Total Orders</span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-y-3 mt-4 px-4">
            {data?.orderStatus?.map((status, i) => (
              <div key={i} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: status.fill}}></div>
                  <span className="text-slate-600 font-medium">{status.name}</span>
                </div>
                <span className="font-bold text-slate-800">{status.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Third Row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Purchase Overview */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-slate-800">Purchase Overview</h2>
            <select className="text-xs border border-slate-200 rounded px-2 py-1 outline-none text-slate-500">
              <option>This Month</option>
            </select>
          </div>
          <div className="flex-1 w-full min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.purchaseOverview} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} tickFormatter={(value) => `₹${value}L`} />
                <RechartsTooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Inventory Status */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-base font-bold text-slate-800 mb-6">Inventory Status</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                <PackageOpen size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-0.5">Total Products</p>
                <p className="text-base font-bold text-slate-800">{data?.inventoryStatus?.totalProducts?.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
                <AlertCircle size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-0.5">Low Stock</p>
                <p className="text-base font-bold text-orange-500">{data?.inventoryStatus?.lowStock}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">
                <Activity size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-0.5">Out of Stock</p>
                <p className="text-base font-bold text-slate-800">{data?.inventoryStatus?.outOfStock}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
                <PackageOpen size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-0.5">Overstock</p>
                <p className="text-base font-bold text-slate-800">{data?.inventoryStatus?.overstock}</p>
              </div>
            </div>
          </div>
        </div>

        {/* HR Attendance */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex flex-col">
          <h2 className="text-base font-bold text-slate-800 mb-2">HR Attendance (Today)</h2>
          <div className="flex-1 flex flex-col justify-center items-center relative">
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Present', value: data?.hrAttendance?.present || 218, fill: '#10b981' },
                      { name: 'Absent', value: data?.hrAttendance?.absent || 12, fill: '#f1f5f9' },
                    ]}
                    innerRadius={55}
                    outerRadius={70}
                    dataKey="value"
                    stroke="none"
                  >
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
              <span className="text-xl font-bold text-slate-800">{data?.hrAttendance?.percentage || 88.9}%</span>
              <span className="text-[10px] text-slate-500 font-semibold">Present</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="text-xs">
              <div className="flex justify-between items-center mb-2">
                <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Present
                </span>
                <span className="font-bold text-slate-800">{data?.hrAttendance?.present}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div> On Leave
                </span>
                <span className="font-bold text-slate-800">{data?.hrAttendance?.onLeave}</span>
              </div>
            </div>
            <div className="text-xs">
              <div className="flex justify-between items-center mb-2">
                <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <div className="w-2 h-2 rounded-full bg-rose-500"></div> Absent
                </span>
                <span className="font-bold text-slate-800">{data?.hrAttendance?.absent}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div> Late
                </span>
                <span className="font-bold text-slate-800">{data?.hrAttendance?.late}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-xs">
            <span className="text-slate-500 font-semibold">Total Employees</span>
            <span className="font-bold text-slate-800">{data?.hrAttendance?.total}</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-slate-800">Quick Actions</h2>
            <a href="#" className="text-xs text-blue-500 font-semibold hover:underline">View All</a>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button className="flex items-center gap-2 p-2 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">
              <ShoppingCart size={16} /> <span className="text-[11px] font-bold">New Sale</span>
            </button>
            <button className="flex items-center gap-2 p-2 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
              <FileText size={16} /> <span className="text-[11px] font-bold">New Purchase</span>
            </button>
            <button className="flex items-center gap-2 p-2 rounded bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors">
              <User size={16} /> <span className="text-[11px] font-bold">Add Customer</span>
            </button>
            <button className="flex items-center gap-2 p-2 rounded bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors">
              <Truck size={16} /> <span className="text-[11px] font-bold">Add Supplier</span>
            </button>
            <button className="flex items-center gap-2 p-2 rounded bg-teal-50 text-teal-600 hover:bg-teal-100 transition-colors">
              <FileText size={16} /> <span className="text-[11px] font-bold">New Quotation</span>
            </button>
            <button className="flex items-center gap-2 p-2 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors">
              <UserCheck size={16} /> <span className="text-[11px] font-bold">Create Employee</span>
            </button>
          </div>
        </div>
      </div>

      {/* Fourth Row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Recent Transactions */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-slate-800">Recent Transactions</h2>
            <a href="#" className="text-xs text-blue-500 font-semibold hover:underline">View All</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[10px]">
              <thead className="text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Reference</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {data?.recentTransactions?.map((txn, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="py-2">{txn.date}</td>
                    <td className="py-2">{txn.type}</td>
                    <td className="py-2 font-medium text-slate-800">{txn.ref}</td>
                    <td className="py-2 font-bold">{formatINR(txn.amount)}</td>
                    <td className="py-2">
                      <span className={`px-1.5 py-0.5 rounded font-bold ${getStatusColor(txn.status)}`}>
                        {txn.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-slate-800">Top Selling Products</h2>
            <a href="#" className="text-xs text-blue-500 font-semibold hover:underline">View All</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[10px]">
              <thead className="text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="pb-2 font-medium">#</th>
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 font-medium">Quantity</th>
                  <th className="pb-2 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {data?.topProducts?.map((prod, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="py-2">{prod.id}</td>
                    <td className="py-2 font-medium text-slate-800 flex items-center gap-2">
                      <div className="w-4 h-4 bg-slate-100 rounded flex items-center justify-center shrink-0">
                        <PackageOpen size={10} className="text-slate-500" />
                      </div>
                      <span className="truncate w-24">{prod.name}</span>
                    </td>
                    <td className="py-2">{prod.qty}</td>
                    <td className="py-2 font-bold">{formatINR(prod.rev)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-slate-800">Recent Activities</h2>
            <a href="#" className="text-xs text-blue-500 font-semibold hover:underline">View All</a>
          </div>
          <div className="space-y-5">
            {data?.recentActivity?.map((act, i) => (
              <div key={i} className="flex gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${act.bg} ${act.color}`}>
                  {getIconForType(act.icon)}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800">{act.title}</p>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">{act.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts & Notifications */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              Alerts & Notifications
              <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">3</span>
            </h2>
            <a href="#" className="text-xs text-blue-500 font-semibold hover:underline">View All</a>
          </div>
          <div className="space-y-4">
            {data?.alerts?.map((alert, i) => (
              <div key={i} className="flex gap-3">
                <div className={`${alert.color} mt-0.5`}>
                  {getIconForType(alert.icon)}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800">{alert.title}</p>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">{alert.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
