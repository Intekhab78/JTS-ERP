import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Calculator, CheckCircle, Lock, XCircle, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import { PageHeader } from '../../../components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/common/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import PayrollRecords from './PayrollRecords';

const PayrollPeriodDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [period, setPeriod] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = user.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  const fetchPeriod = async () => {
    try {
      const { data } = await axios.get(`http://localhost:5000/api/v1/hr/payroll-periods/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPeriod(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPeriod();
  }, [id]);

  const handleAction = async (actionPath) => {
    setActionLoading(true);
    try {
      await axios.post(`http://localhost:5000/api/v1/hr/payroll-periods/${id}/${actionPath}`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchPeriod();
    } catch (error) {
      alert(error.response?.data?.message || `Failed to ${actionPath}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading period...</div>;
  if (!period) return <div className="p-8 text-center text-slate-500">Period not found</div>;

  const renderActions = () => {
    switch (period.status) {
      case 'DRAFT':
        return hasPermission('PAYROLL.PERIOD.OPEN') && (
          <Button onClick={() => handleAction('open')} leftIcon={<Play size={16} />} disabled={actionLoading}>Open Period</Button>
        );
      case 'OPEN':
      case 'PROCESSING':
        return hasPermission('PAYROLL.PERIOD.CALCULATE') && (
          <Button onClick={() => handleAction('calculate')} leftIcon={<Calculator size={16} />} disabled={actionLoading}>Calculate Payroll</Button>
        );
      case 'PROCESSED':
        return (
          <div className="flex gap-2">
            {hasPermission('PAYROLL.PERIOD.CALCULATE') && (
              <Button variant="outline" onClick={() => handleAction('calculate')} disabled={actionLoading}>Recalculate</Button>
            )}
            {hasPermission('PAYROLL.PERIOD.REVIEW') && (
              <Button onClick={() => handleAction('review')} leftIcon={<ShieldCheck size={16} />} disabled={actionLoading}>Review</Button>
            )}
          </div>
        );
      case 'REVIEWED':
        return hasPermission('PAYROLL.PERIOD.APPROVE') && (
          <Button onClick={() => handleAction('approve')} leftIcon={<CheckCircle size={16} />} disabled={actionLoading}>Approve</Button>
        );
      case 'APPROVED':
        return hasPermission('PAYROLL.PERIOD.LOCK') && (
          <Button variant="outline" onClick={() => handleAction('lock')} leftIcon={<Lock size={16} />} disabled={actionLoading}>Lock Period</Button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
      <PageHeader 
        title={
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="p-2 bg-muted hover:bg-muted/80 rounded-full transition-colors mr-2">
              <ArrowLeft size={18} />
            </button>
            {period.name}
            <Badge variant="neutral" className="ml-2">{period.status}</Badge>
          </div>
        }
        actions={renderActions()}
      />

      <Card>
        <CardHeader>
          <CardTitle>Period Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
             <div>
               <p className="text-sm text-muted-foreground">Code</p>
               <p className="font-semibold">{period.code}</p>
             </div>
             <div>
               <p className="text-sm text-muted-foreground">Currency</p>
               <p className="font-semibold">{period.currency}</p>
             </div>
             <div>
               <p className="text-sm text-muted-foreground">Period Range</p>
               <p className="font-semibold">{new Date(period.periodStart).toLocaleDateString()} - {new Date(period.periodEnd).toLocaleDateString()}</p>
             </div>
             <div>
               <p className="text-sm text-muted-foreground">Payment Date</p>
               <p className="font-semibold">{new Date(period.paymentDate).toLocaleDateString()}</p>
             </div>
          </div>
        </CardContent>
      </Card>

      {/* Embedded Payroll Records table component for this period */}
      <PayrollRecords periodId={period._id} periodStatus={period.status} hasPermission={hasPermission} />
      
    </div>
  );
};

export default PayrollPeriodDetail;
