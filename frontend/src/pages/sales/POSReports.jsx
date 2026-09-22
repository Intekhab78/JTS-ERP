import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart2, DollarSign, Users, ShoppingBag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/common/Card';

const POSReports = () => {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await axios.get('/api/v1/pos/reports', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setReports(res.data);
      } catch (error) {
        console.error('Error fetching reports', error);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  if (loading) return <div className="p-6">Loading reports...</div>;
  if (!reports) return <div className="p-6">Failed to load reports.</div>;

  const totalSales = reports.dailySales.reduce((acc, curr) => acc + curr.totalSales, 0);
  const totalOrders = reports.dailySales.reduce((acc, curr) => acc + curr.orderCount, 0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <BarChart2 className="text-blue-600" size={28} />
        <h1 className="text-2xl font-bold">POS Reports</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-full"><DollarSign size={24} /></div>
            <div>
              <p className="text-sm text-blue-600 font-medium">Total Sales</p>
              <h2 className="text-2xl font-black text-blue-900">${totalSales.toFixed(2)}</h2>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-green-50 border-green-100">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-full"><ShoppingBag size={24} /></div>
            <div>
              <p className="text-sm text-green-600 font-medium">Total Orders</p>
              <h2 className="text-2xl font-black text-green-900">{totalOrders}</h2>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Cashier */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users size={18} /> Sales by Cashier</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-sm">
                  <th className="p-4 border-b">Cashier</th>
                  <th className="p-4 border-b">Orders</th>
                  <th className="p-4 border-b text-right">Total Sales</th>
                </tr>
              </thead>
              <tbody>
                {reports.salesByCashier.map(c => (
                  <tr key={c._id} className="border-b">
                    <td className="p-4">{c.cashierName}</td>
                    <td className="p-4">{c.orderCount}</td>
                    <td className="p-4 text-right font-medium">${c.totalSales.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Sales by Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><DollarSign size={18} /> Sales by Payment Method</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-sm">
                  <th className="p-4 border-b">Method</th>
                  <th className="p-4 border-b text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {reports.salesByPaymentMethod.map(p => (
                  <tr key={p._id} className="border-b">
                    <td className="p-4 font-medium">{p._id}</td>
                    <td className="p-4 text-right font-medium">${p.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default POSReports;
