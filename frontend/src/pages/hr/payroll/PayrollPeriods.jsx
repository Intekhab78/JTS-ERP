import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Banknote, Plus, Eye } from 'lucide-react';
import axios from 'axios';
import { PageHeader } from '../../../components/common/PageHeader';
import { Card, CardContent } from '../../../components/common/Card';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/common/EmptyState';
import { Badge } from '../../../components/ui/Badge';
import { CardSkeleton } from '../../../components/common/CardSkeleton';

const PayrollPeriods = () => {
  const [periods, setPeriods] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = user.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  const fetchPeriods = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get('/api/v1/hr/payroll-periods', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPeriods(data);
    } catch (error) {
      console.error('Failed to fetch payroll periods', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPeriods();
  }, []);

  const getStatusBadge = (status) => {
    const variants = {
      DRAFT: 'secondary',
      OPEN: 'primary',
      PROCESSING: 'warning',
      PROCESSED: 'primary',
      REVIEWED: 'primary',
      APPROVED: 'success',
      LOCKED: 'neutral',
      CANCELLED: 'danger'
    };
    return <Badge variant={variants[status] || 'neutral'}>{status}</Badge>;
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
      <PageHeader 
        title={
          <div className="flex items-center gap-2">
            <Banknote className="text-primary h-8 w-8" /> 
            Payroll Periods
          </div>
        }
        description="Manage your payroll cycles, calculations, and approvals."
        actions={
          hasPermission('PAYROLL.PERIOD.CREATE') && (
            <Button onClick={() => navigate('/payroll-periods/new')} leftIcon={<Plus size={18} />}>
              Create Period
            </Button>
          )
        }
      />

      {isLoading ? (
        <CardSkeleton />
      ) : periods.length === 0 ? (
        <EmptyState 
          icon={<Banknote className="h-10 w-10 opacity-70" />}
          title="No payroll periods found"
          description="Create your first payroll period to start calculating salaries."
        />
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Code / Name</th>
                  <th className="px-4 py-3 font-semibold">Frequency</th>
                  <th className="px-4 py-3 font-semibold">Period Range</th>
                  <th className="px-4 py-3 font-semibold">Payment Date</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {periods.map(period => (
                  <tr key={period._id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold">{period.code}</div>
                      <div className="text-muted-foreground text-xs">{period.name}</div>
                    </td>
                    <td className="px-4 py-3">{period.payFrequency.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3">
                      {new Date(period.periodStart).toLocaleDateString()} - {new Date(period.periodEnd).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {new Date(period.paymentDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(period.status)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {hasPermission('PAYROLL.PERIOD.VIEW') && (
                        <button 
                          onClick={() => navigate(`/payroll-periods/${period._id}`)}
                          className="p-1.5 text-muted-foreground hover:text-primary bg-muted/50 hover:bg-primary/10 rounded-md transition-colors"
                        >
                          <Eye size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PayrollPeriods;
