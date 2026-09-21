import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, Eye, Search, Filter } from 'lucide-react';
import axios from 'axios';
import { PageHeader } from '../../../components/common/PageHeader';
import { Card, CardContent, CardHeader } from '../../../components/common/Card';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/common/EmptyState';
import { CardSkeleton } from '../../../components/common/CardSkeleton';

const Payslips = () => {
  const [payslips, setPayslips] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', period: '' });
  const [periods, setPeriods] = useState([]);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = user.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const { data } = await axios.get('http://localhost:5000/api/v1/hr/payroll-periods', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setPeriods(data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchDropdowns();
  }, []);

  useEffect(() => {
    fetchPayslips();
  }, [filters]);

  const fetchPayslips = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.period) params.append('period', filters.period);

      const { data } = await axios.get(`http://localhost:5000/api/v1/hr/payslips?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPayslips(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasPermission('PAYROLL.PAYSLIP.VIEW')) {
    return <div className="p-8 text-center">Access Denied</div>;
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT': return <Badge variant="secondary">DRAFT</Badge>;
      case 'GENERATED': return <Badge variant="primary">GENERATED</Badge>;
      case 'FINALIZED': return <Badge variant="success">FINALIZED</Badge>;
      case 'CANCELLED': return <Badge variant="danger">CANCELLED</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
      <PageHeader 
        title={
          <div className="flex items-center gap-2">
            <Receipt className="text-primary h-8 w-8" /> 
            Payslips
          </div>
        }
        description="View and manage employee payslips."
      />

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 w-full relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input placeholder="Search payslips..." className="pl-10" />
            </div>
            <div className="w-full md:w-64">
              <Select 
                value={filters.period}
                onChange={(e) => setFilters(prev => ({ ...prev, period: e.target.value }))}
                icon={<Filter size={16} />}
              >
                <option value="">All Periods</option>
                {periods.map(p => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </Select>
            </div>
            <div className="w-full md:w-48">
              <Select 
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="">All Statuses</option>
                <option value="GENERATED">Generated</option>
                <option value="FINALIZED">Finalized</option>
                <option value="CANCELLED">Cancelled</option>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        {isLoading ? (
          <CardSkeleton />
        ) : payslips.length === 0 ? (
          <EmptyState 
            icon={<Receipt className="h-10 w-10 opacity-70" />}
            title="No payslips found"
            description="Adjust your filters or generate payslips from a Payroll Period."
          />
        ) : (
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Payslip No.</th>
                  <th className="px-4 py-3 font-semibold">Employee</th>
                  <th className="px-4 py-3 font-semibold">Period</th>
                  <th className="px-4 py-3 font-semibold text-right">Gross</th>
                  <th className="px-4 py-3 font-semibold text-right">Net</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payslips.map(ps => (
                  <tr key={ps._id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-primary">{ps.payslipNumber}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold">{ps.employeeId?.firstName} {ps.employeeId?.lastName}</div>
                      <div className="text-muted-foreground text-xs">{ps.employeeId?.employeeCode}</div>
                    </td>
                    <td className="px-4 py-3">{ps.payrollPeriodId?.name}</td>
                    <td className="px-4 py-3 text-right">{ps.grossSalary.toLocaleString()} {ps.currency}</td>
                    <td className="px-4 py-3 text-right font-bold text-green-600">{ps.netSalary.toLocaleString()} {ps.currency}</td>
                    <td className="px-4 py-3">{getStatusBadge(ps.status)}</td>
                    <td className="px-4 py-3 text-right">
                      <button 
                        onClick={() => navigate(`/payslips/${ps._id}`)}
                        className="p-1.5 text-muted-foreground hover:text-primary bg-muted/50 hover:bg-primary/10 rounded-md transition-colors"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default Payslips;
