import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import axios from 'axios';
import { PageHeader } from '../../../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/common/Card';
import { FormField } from '../../../components/common/FormField';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';

const SalaryStructureForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [isLoading, setIsLoading] = useState(false);
  const [availableComponents, setAvailableComponents] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    currency: 'USD',
    payFrequency: 'MONTHLY',
    status: 'ACTIVE',
    components: []
  });

  useEffect(() => {
    const fetchDependencies = async () => {
      try {
        const { data: compData } = await axios.get('/api/v1/hr/salary-components', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setAvailableComponents(compData.filter(c => c.status === 'ACTIVE'));
        
        if (isEdit) {
          const { data: structData } = await axios.get(`/api/v1/hr/salary-structures/${id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          setFormData(structData);
        }
      } catch (error) {
        console.error('Error fetching data', error);
      }
    };
    fetchDependencies();
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addComponent = () => {
    setFormData(prev => ({
      ...prev,
      components: [
        ...prev.components,
        { componentId: '', calculationType: 'FIXED', amount: 0, sequence: prev.components.length + 1 }
      ]
    }));
  };

  const updateComponent = (index, field, value) => {
    const newComps = [...formData.components];
    newComps[index][field] = value;
    
    // Auto-fill calculation type based on selected component
    if (field === 'componentId') {
      const selected = availableComponents.find(c => c._id === value);
      if (selected) {
        newComps[index].calculationType = selected.calculationType;
      }
    }
    setFormData({ ...formData, components: newComps });
  };

  const removeComponent = (index) => {
    const newComps = formData.components.filter((_, i) => i !== index);
    setFormData({ ...formData, components: newComps });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isEdit) {
        await axios.put(`/api/v1/hr/salary-structures/${id}`, formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      } else {
        await axios.post('/api/v1/hr/salary-structures', formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      }
      navigate('/salary-structures');
    } catch (error) {
      console.error('Failed to save structure', error);
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
            {isEdit ? 'Edit Salary Structure' : 'New Salary Structure'}
          </div>
        }
        actions={
          <Button onClick={handleSubmit} leftIcon={isLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} disabled={isLoading}>
            {isEdit ? 'Update Structure' : 'Save Structure'}
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Structure Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Structure Name" required>
              <Input name="name" value={formData.name} onChange={handleChange} required />
            </FormField>
            <FormField label="Code" required>
              <Input name="code" value={formData.code} onChange={handleChange} required className="uppercase" />
            </FormField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Currency" required>
              <Select name="currency" value={formData.currency} onChange={handleChange}>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="AED">AED - Emirati Dirham</option>
                <option value="INR">INR - Indian Rupee</option>
              </Select>
            </FormField>
            <FormField label="Pay Frequency" required>
              <Select name="payFrequency" value={formData.payFrequency} onChange={handleChange}>
                <option value="MONTHLY">Monthly</option>
                <option value="BIWEEKLY">Biweekly</option>
                <option value="WEEKLY">Weekly</option>
              </Select>
            </FormField>
            <FormField label="Status" required>
              <Select name="status" value={formData.status} onChange={handleChange}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </Select>
            </FormField>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Assigned Components</CardTitle>
          <Button type="button" onClick={addComponent} leftIcon={<Plus size={16} />} variant="outline">
            Add Component
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {formData.components.map((comp, index) => (
              <div key={index} className="flex gap-4 items-end bg-muted/20 p-4 rounded-lg border border-border">
                <div className="flex-1">
                  <FormField label="Component">
                    <Select 
                      value={comp.componentId?._id || comp.componentId} 
                      onChange={(e) => updateComponent(index, 'componentId', e.target.value)}
                    >
                      <option value="">Select component</option>
                      {availableComponents.map(c => (
                        <option key={c._id} value={c._id}>{c.name} ({c.type})</option>
                      ))}
                    </Select>
                  </FormField>
                </div>
                <div className="w-40">
                  <FormField label="Calculation">
                    <Select value={comp.calculationType} onChange={(e) => updateComponent(index, 'calculationType', e.target.value)}>
                      <option value="FIXED">Fixed Amount</option>
                      <option value="PERCENTAGE">Percentage</option>
                    </Select>
                  </FormField>
                </div>
                <div className="w-32">
                  <FormField label={comp.calculationType === 'PERCENTAGE' ? 'Percentage %' : 'Amount'}>
                    <Input 
                      type="number" 
                      min="0" 
                      value={comp.calculationType === 'PERCENTAGE' ? comp.percentage : comp.amount}
                      onChange={(e) => updateComponent(index, comp.calculationType === 'PERCENTAGE' ? 'percentage' : 'amount', e.target.value)} 
                    />
                  </FormField>
                </div>
                <Button type="button" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => removeComponent(index)}>
                  <Trash2 size={18} />
                </Button>
              </div>
            ))}
            {formData.components.length === 0 && (
              <p className="text-sm text-muted-foreground italic text-center py-4">No components added yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalaryStructureForm;
