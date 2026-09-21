import React, { useState, useEffect, useMemo } from 'react';
import { useCurrency } from '../../contexts/CurrencyContext';
import axios from 'axios';
import { Banknote, Plus, FileCheck, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { DataTable } from '../../components/common/DataTable';
import { SearchInput } from '../../components/ui/SearchInput';
import { Modal } from '../../components/common/Modal';
import { FormField } from '../../components/common/FormField';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/common/EmptyState';

const Payroll = () => {
  const [payslips, setPayslips] = useState([]);
  const { formatCurrency, currencySymbol } = useCurrency();
  const [employees, setEmployees] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({ 
    employeeId: '', 
    payPeriod: format(new Date(), 'MMM yyyy'), 
    basicPay: 0, 
    allowances: 0, 
    deductions: 0 
  });

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  useEffect(() => {
    fetchPayslips();
    fetchEmployees();
  }, []);

  const fetchPayslips = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/v1/payroll', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPayslips(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/v1/hr/employees', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setEmployees(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleEmployeeSelect = (e) => {
    const empId = e.target.value;
    const employee = employees.find(emp => emp._id === empId);
    setFormData({
      ...formData,
      employeeId: empId,
      basicPay: employee ? Math.round(employee.baseSalary / 12) : 0
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await axios.post('http://localhost:5000/api/v1/payroll', formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setIsCreating(false);
      setFormData({ 
        employeeId: '', 
        payPeriod: format(new Date(), 'MMM yyyy'), 
        basicPay: 0, 
        allowances: 0, 
        deductions: 0 
      });
      fetchPayslips();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to generate payslip');
    } finally {
      setIsSubmitting(false);
    }
  };

  const markAsPaid = async (id) => {
    if (!window.confirm("Mark this payslip as PAID? This cannot be undone.")) return;
    try {
      await axios.put(`http://localhost:5000/api/v1/payroll/${id}/pay`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchPayslips();
    } catch (error) {
      alert('Failed to mark as paid');
    }
  };

  const filteredPayslips = useMemo(() => {
    return payslips.filter(p => 
      p.employeeId?.firstName.toLowerCase().includes(search.toLowerCase()) || 
      p.employeeId?.lastName.toLowerCase().includes(search.toLowerCase()) ||
      p.payPeriod.toLowerCase().includes(search.toLowerCase())
    );
  }, [payslips, search]);

  const computedNetPay = Number(formData.basicPay) + Number(formData.allowances || 0) - Number(formData.deductions || 0);

  const columns = useMemo(() => [
    {
      header: 'Employee',
      accessor: (payslip) => (
        <div>
          <div className="font-bold text-slate-900">{payslip.employeeId?.firstName} {payslip.employeeId?.lastName}</div>
          <div className="text-xs text-slate-500 font-medium">{payslip.employeeId?.jobTitle}</div>
        </div>
      )
    },
    {
      header: 'Pay Period',
      accessor: (payslip) => (
        <div>
          <div className="font-medium text-slate-900">{payslip.payPeriod}</div>
          <div className="text-xs text-slate-400 font-medium mt-0.5">ID: {payslip._id.slice(-6).toUpperCase()}</div>
        </div>
      )
    },
    {
      header: 'Basic Pay',
      accessor: (payslip) => (
        <div className="text-right font-medium text-slate-700">
          ${payslip.basicPay.toLocaleString()}
        </div>
      )
    },
    {
      header: 'Net Pay',
      accessor: (payslip) => (
        <div className="text-right">
          <div className="font-bold text-slate-900">{currencySymbol}{payslip.netPay.toLocaleString()}</div>
          {(payslip.allowances > 0 || payslip.deductions > 0) && (
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">Adjusted</div>
          )}
        </div>
      )
    },
    {
      header: 'Status',
      accessor: (payslip) => (
        <div>
          <Badge variant={payslip.status === 'PAID' ? 'success' : 'neutral'}>
            {payslip.status}
          </Badge>
          {payslip.status === 'PAID' && payslip.paymentDate && (
            <div className="text-[10px] text-emerald-600 font-medium mt-1">
              {format(new Date(payslip.paymentDate), 'MMM d, yyyy')}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Action',
      accessor: (payslip) => (
        <div className="text-right">
          {payslip.status === 'DRAFT' ? (
            hasPermission('EDIT_HR') ? (
              <Button 
                onClick={() => markAsPaid(payslip._id)}
                variant="outline"
                size="sm"
                className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300"
              >
                Mark Paid
              </Button>
            ) : (
              <span className="text-xs font-medium text-slate-500">DRAFT</span>
            )
          ) : (
            <Button 
              variant="outline"
              size="sm"
              disabled
            >
              Paid
            </Button>
          )}
        </div>
      )
    }
  ], []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader 
        title="Payroll & Payslips"
        description="Generate payslips and track employee compensation payouts."
        icon={Banknote}
        actions={
          <Button onClick={() => setIsCreating(true)} className="gap-2">
            <Plus size={18} /> Generate Payslip
          </Button>
        }
      />

      <Card>
        <div className="p-4 border-b border-slate-200 flex justify-between gap-4">
          <SearchInput 
            value={search}
            onChange={setSearch}
            placeholder="Search payslips by employee or period..."
            className="w-full md:w-96"
          />
        </div>
        
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Loading payslips...</div>
        ) : filteredPayslips.length > 0 ? (
          <DataTable 
            columns={columns}
            data={filteredPayslips}
          />
        ) : (
          <div className="p-8">
            <EmptyState 
              icon={FileCheck}
              title={search ? "No payslips found" : "No payslips yet"}
              description={search ? `No results for "${search}"` : "Get started by generating the first payslip."}
              action={!search && (
                <Button onClick={() => setIsCreating(true)} variant="outline" className="mt-4 gap-2">
                  <Plus size={16} /> Generate Payslip
                </Button>
              )}
            />
          </div>
        )}
      </Card>

      <Modal
        isOpen={isCreating}
        onClose={() => !isSubmitting && setIsCreating(false)}
        title="New Payslip Draft"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Select Employee" required>
              <Select
                required
                value={formData.employeeId}
                onChange={handleEmployeeSelect}
                disabled={isSubmitting}
                options={[
                  { value: '', label: 'Choose...' },
                  ...employees.map(e => ({ value: e._id, label: `${e.firstName} ${e.lastName} - ${e.jobTitle}` }))
                ]}
              />
            </FormField>
            
            <FormField label="Pay Period" required>
              <Input 
                required 
                placeholder="e.g. Aug 2026"
                value={formData.payPeriod} 
                onChange={e => setFormData({...formData, payPeriod: e.target.value})} 
                disabled={isSubmitting}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <FormField label="Basic Pay (Monthly)" required>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">{currencySymbol}</span>
                <Input 
                  type="number"
                  min="0"
                  required 
                  className="pl-8"
                  value={formData.basicPay} 
                  onChange={e => setFormData({...formData, basicPay: e.target.value})} 
                  disabled={isSubmitting}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">Auto-calculated from Annual Base</p>
            </FormField>
            
            <FormField label="Allowances & Bonuses (+)">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">{currencySymbol}</span>
                <Input 
                  type="number"
                  min="0"
                  className="pl-8"
                  value={formData.allowances} 
                  onChange={e => setFormData({...formData, allowances: e.target.value})} 
                  disabled={isSubmitting}
                />
              </div>
            </FormField>
            
            <FormField label="Deductions (-)">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">{currencySymbol}</span>
                <Input 
                  type="number"
                  min="0"
                  className="pl-8"
                  value={formData.deductions} 
                  onChange={e => setFormData({...formData, deductions: e.target.value})} 
                  disabled={isSubmitting}
                />
              </div>
            </FormField>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <div>
              <div className="text-xs font-medium text-slate-500 mb-1">Calculated Net Pay</div>
              <div className="text-2xl font-bold text-slate-900">{currencySymbol}{computedNetPay.toLocaleString()}</div>
            </div>
            
            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsCreating(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? 'Saving...' : 'Save Draft'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Payroll;
