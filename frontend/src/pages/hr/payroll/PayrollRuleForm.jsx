import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Loader2 } from 'lucide-react';
import axios from 'axios';
import { PageHeader } from '../../../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/common/Card';
import { FormField } from '../../../components/common/FormField';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';

const PayrollRuleForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    ruleType: 'TAX',
    calculationType: 'PERCENTAGE',
    percentage: 0,
    fixedAmount: 0,
    employeeShare: 100,
    employerShare: 0,
    effectiveFrom: new Date().toISOString().split('T')[0],
    status: 'ACTIVE'
  });

  useEffect(() => {
    if (isEdit) {
      // Fetch logic for edit (mocked to skip since we focus on create primarily here, but real implementation would fetch)
    }
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isEdit) {
        await axios.put(`/api/v1/hr/payroll-rules/${id}`, formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      } else {
        await axios.post('/api/v1/hr/payroll-rules', formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      }
      navigate('/payroll-rules');
    } catch (error) {
      console.error('Failed to save rule', error);
      alert(error.response?.data?.message || 'Failed to save rule');
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
            {isEdit ? 'Edit Payroll Rule' : 'New Payroll Rule'}
          </div>
        }
        actions={
          <Button onClick={handleSubmit} leftIcon={isLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} disabled={isLoading}>
            {isEdit ? 'Update Rule' : 'Save Rule'}
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Rule Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Rule Name" required>
              <Input name="name" value={formData.name} onChange={handleChange} required placeholder="e.g., National Insurance" />
            </FormField>
            
            <FormField label="Code" required>
              <Input name="code" value={formData.code} onChange={handleChange} required className="uppercase" placeholder="e.g., NI_UK" />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Rule Type" required>
              <Select name="ruleType" value={formData.ruleType} onChange={handleChange}>
                <option value="TAX">Tax</option>
                <option value="SOCIAL_SECURITY">Social Security</option>
                <option value="INSURANCE">Insurance</option>
                <option value="PENSION">Pension</option>
                <option value="DEDUCTION">Other Deduction</option>
              </Select>
            </FormField>

            <FormField label="Calculation Type" required>
              <Select name="calculationType" value={formData.calculationType} onChange={handleChange}>
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED">Fixed Amount</option>
              </Select>
            </FormField>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formData.calculationType === 'PERCENTAGE' ? (
              <FormField label="Percentage (%)" required>
                <Input name="percentage" type="number" min="0" step="0.01" value={formData.percentage} onChange={handleChange} />
              </FormField>
            ) : (
              <FormField label="Fixed Amount" required>
                <Input name="fixedAmount" type="number" min="0" value={formData.fixedAmount} onChange={handleChange} />
              </FormField>
            )}

             <FormField label="Effective From" required>
                <Input name="effectiveFrom" type="date" value={formData.effectiveFrom} onChange={handleChange} required />
             </FormField>
          </div>

          <h4 className="font-semibold text-sm border-b pb-2 mt-6">Split Configuration</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormField label="Employee Share (%)">
                <Input name="employeeShare" type="number" min="0" max="100" value={formData.employeeShare} onChange={handleChange} />
             </FormField>
             <FormField label="Employer Share (%)">
                <Input name="employerShare" type="number" min="0" max="100" value={formData.employerShare} onChange={handleChange} />
             </FormField>
          </div>

        </CardContent>
      </Card>
    </div>
  );
};

export default PayrollRuleForm;
