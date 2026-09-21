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

const SalaryComponentForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'EARNING',
    calculationType: 'FIXED',
    defaultAmount: 0,
    status: 'ACTIVE',
    taxable: true,
    recurring: true
  });

  useEffect(() => {
    if (isEdit) {
      const fetchComponent = async () => {
        try {
          const { data } = await axios.get('http://localhost:5000/api/v1/hr/salary-components', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          const comp = data.find(c => c._id === id);
          if (comp) setFormData(comp);
        } catch (error) {
          console.error('Error fetching component', error);
        }
      };
      fetchComponent();
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
        await axios.put(`http://localhost:5000/api/v1/hr/salary-components/${id}`, formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      } else {
        await axios.post('http://localhost:5000/api/v1/hr/salary-components', formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      }
      navigate('/salary-components');
    } catch (error) {
      console.error('Failed to save component', error);
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
            {isEdit ? 'Edit Salary Component' : 'New Salary Component'}
          </div>
        }
        actions={
          <Button onClick={handleSubmit} leftIcon={isLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} disabled={isLoading}>
            {isEdit ? 'Update Component' : 'Save Component'}
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Component Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Component Name" required>
              <Input name="name" value={formData.name} onChange={handleChange} required />
            </FormField>
            
            <FormField label="Code" required>
              <Input name="code" value={formData.code} onChange={handleChange} required className="uppercase" />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Type" required>
              <Select name="type" value={formData.type} onChange={handleChange}>
                <option value="EARNING">Earning</option>
                <option value="DEDUCTION">Deduction</option>
                <option value="EMPLOYER_CONTRIBUTION">Employer Contribution</option>
                <option value="REIMBURSEMENT">Reimbursement</option>
              </Select>
            </FormField>

            <FormField label="Calculation Type" required>
              <Select name="calculationType" value={formData.calculationType} onChange={handleChange}>
                <option value="FIXED">Fixed Amount</option>
                <option value="PERCENTAGE">Percentage</option>
                <option value="FORMULA">Formula</option>
                <option value="MANUAL">Manual</option>
              </Select>
            </FormField>

            <FormField label="Status" required>
              <Select name="status" value={formData.status} onChange={handleChange}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </Select>
            </FormField>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormField label="Default Amount" required>
                <Input name="defaultAmount" type="number" min="0" value={formData.defaultAmount} onChange={handleChange} />
             </FormField>
          </div>

        </CardContent>
      </Card>
    </div>
  );
};

export default SalaryComponentForm;
