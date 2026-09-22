import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Loader2 } from 'lucide-react';
import axios from 'axios';
import { PageHeader } from '../../../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/common/Card';
import { FormField } from '../../../components/common/FormField';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';

const PayrollPeriodForm = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    payFrequency: 'MONTHLY',
    periodStart: '',
    periodEnd: '',
    paymentDate: '',
    currency: 'USD',
    notes: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await axios.post('/api/v1/hr/payroll-periods', formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      navigate('/payroll-periods');
    } catch (error) {
      console.error('Failed to create period', error);
      alert(error.response?.data?.message || 'Failed to create period');
    } finally {
      setIsLoading(false);
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
            New Payroll Period
          </div>
        }
        actions={
          <Button onClick={handleSubmit} leftIcon={isLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} disabled={isLoading}>
            Create Period
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Period Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Period Name" required>
              <Input name="name" value={formData.name} onChange={handleChange} required placeholder="e.g., October 2026 Salary" />
            </FormField>
            
            <FormField label="Code" required>
              <Input name="code" value={formData.code} onChange={handleChange} required className="uppercase" placeholder="e.g., PR_OCT_26" />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Pay Frequency" required>
              <Select name="payFrequency" value={formData.payFrequency} onChange={handleChange}>
                <option value="WEEKLY">Weekly</option>
                <option value="BI_WEEKLY">Bi-Weekly</option>
                <option value="SEMI_MONTHLY">Semi-Monthly</option>
                <option value="MONTHLY">Monthly</option>
              </Select>
            </FormField>
            
            <FormField label="Currency" required>
              <Select name="currency" value={formData.currency} onChange={handleChange}>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="AED">AED - Emirati Dirham</option>
                <option value="INR">INR - Indian Rupee</option>
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Period Start Date" required>
              <Input name="periodStart" type="date" value={formData.periodStart} onChange={handleChange} required />
            </FormField>
            
            <FormField label="Period End Date" required>
              <Input name="periodEnd" type="date" value={formData.periodEnd} onChange={handleChange} required />
            </FormField>
            
            <FormField label="Payment Date" required>
              <Input name="paymentDate" type="date" value={formData.paymentDate} onChange={handleChange} required />
            </FormField>
          </div>
          
          <FormField label="Notes">
             <Input name="notes" value={formData.notes} onChange={handleChange} placeholder="Optional notes for this payroll run" />
          </FormField>

        </CardContent>
      </Card>
    </div>
  );
};

export default PayrollPeriodForm;
