import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  TrendingUp, TrendingDown, Users, ShoppingBag, 
  PackageOpen, MoreVertical, DollarSign, Activity, ShoppingCart, AlertCircle 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { PageHeader } from '../../components/common/PageHeader';
import { MetricCard, ChartCardContainer } from '../../components/layout/DashboardFoundation';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { useCurrency } from '../../contexts/CurrencyContext';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/v1/dashboard/summary', {
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

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1e2330] border border-slate-700/50 p-3 rounded-xl shadow-xl">
          <p className="text-slate-300 text-xs font-semibold mb-2">{label}</p>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
            <p className="text-white font-bold text-sm">
              {formatCurrency(payload[0].value)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <p className="text-slate-400 font-medium text-xs">
              {payload[0].payload.orders} Orders
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const getIconForType = (type) => {
    switch(type) {
      case 'order': return <ShoppingCart className="h-4 w-4 text-emerald-500" />;
      case 'pos': return <Activity className="h-4 w-4 text-indigo-500" />;
      case 'alert': return <AlertCircle className="h-4 w-4 text-rose-500" />;
      default: return <MoreVertical className="h-4 w-4 text-slate-500" />;
    }
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6 pb-10">
      <PageHeader 
        title="Dashboard Overview" 
        description={`Welcome back, ${user.email || 'Admin'}. Here is what's happening today.`} 
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-card h-[130px] rounded-2xl border border-border"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard 
            title="Total Revenue" 
            value={formatCurrency(data?.metrics?.totalRevenue || 0)} 
            icon={<DollarSign className="h-4 w-4 text-emerald-500" />} 
            trend={data?.metrics?.trends?.revenue?.isPositive ? "up" : "down"}
            trendLabel={`${data?.metrics?.trends?.revenue?.value}% vs last month`} 
            className="border-emerald-500/20"
          />
          <MetricCard 
            title="Active Customers" 
            value={data?.metrics?.activeCustomers || 0} 
            icon={<Users className="h-4 w-4 text-blue-500" />} 
            trend={data?.metrics?.trends?.customers?.isPositive ? "up" : "down"}
            trendLabel={`${data?.metrics?.trends?.customers?.value}% vs last month`} 
          />
          <MetricCard 
            title="New Orders" 
            value={data?.metrics?.newOrders || 0} 
            icon={<ShoppingBag className="h-4 w-4 text-indigo-500" />} 
            trend={data?.metrics?.trends?.orders?.isPositive ? "up" : "down"}
            trendLabel={`${data?.metrics?.trends?.orders?.value}% vs last month`} 
          />
          <MetricCard 
            title="Low Stock Items" 
            value={data?.metrics?.lowStockItems || 0} 
            icon={<PackageOpen className="h-4 w-4 text-rose-500" />} 
            trend={data?.metrics?.trends?.stock?.isPositive ? "up" : "down"}
            trendLabel={`${data?.metrics?.trends?.stock?.value} vs last month`} 
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCardContainer title="Revenue Analytics" className="lg:col-span-2 min-h-[400px] flex flex-col">
          {loading ? (
            <div className="flex-1 animate-pulse bg-muted/30 rounded-xl"></div>
          ) : (
            <div className="flex-1 w-full h-[350px] mt-4 pr-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.chartData || []} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `$${value/1000}k`} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCardContainer>
        
        <Card className="min-h-[400px]">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            {loading ? (
              [1,2,3,4].map(i => <div key={i} className="h-12 w-full animate-pulse bg-muted/30 rounded-lg"></div>)
            ) : data?.recentActivity?.length > 0 ? (
              data.recentActivity.map((activity, index) => (
                <div key={activity.id || index} className="flex gap-4 group">
                  <div className="relative flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center z-10 group-hover:scale-110 transition-transform">
                      {getIconForType(activity.type)}
                    </div>
                    {index !== data.recentActivity.length - 1 && (
                      <div className="w-[1px] h-full bg-slate-800 absolute top-8"></div>
                    )}
                  </div>
                  <div className="pb-2 flex-1">
                    <p className="text-sm font-bold text-slate-200">{activity.title}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-slate-500 font-medium">{activity.subtitle}</p>
                      <p className="text-[10px] text-slate-600 font-semibold uppercase">
                        {new Date(activity.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-[250px] text-slate-500 text-sm">
                <p>No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
