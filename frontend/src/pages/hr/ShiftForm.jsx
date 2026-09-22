import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { FormField } from '../../components/common/FormField';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Clock, Save, ArrowLeft } from 'lucide-react';

const ShiftForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    startTime: '',
    endTime: '',
    breakMinutes: 0,
    graceInMinutes: 0,
    graceOutMinutes: 0,
    overtimeAllowed: false,
    overtimeAfterMinutes: 0,
    workingHours: 8,
    overnightShift: false,
    status: 'ACTIVE'
  });

  useEffect(() => {
    if (isEditing) {
      fetchShift();
    }
  }, [id]);

  const fetchShift = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`/api/v1/hr/shifts`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const shift = res.data.find(s => s._id === id);
      if (shift) {
        setFormData({
          name: shift.name,
          code: shift.code,
          startTime: shift.startTime,
          endTime: shift.endTime,
          breakMinutes: shift.breakMinutes,
          graceInMinutes: shift.graceInMinutes,
          graceOutMinutes: shift.graceOutMinutes,
          overtimeAllowed: shift.overtimeAllowed,
          overtimeAfterMinutes: shift.overtimeAfterMinutes,
          workingHours: shift.workingHours,
          overnightShift: shift.overnightShift,
          status: shift.status
        });
      } else {
        navigate('/shifts');
      }
    } catch (error) {
      alert('Failed to fetch shift');
      navigate('/shifts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const url = isEditing 
        ? `/api/v1/hr/shifts/${id}`
        : '/api/v1/hr/shifts';
      
      const method = isEditing ? 'put' : 'post';
      
      const payload = { 
        ...formData,
        breakMinutes: Number(formData.breakMinutes),
        graceInMinutes: Number(formData.graceInMinutes),
        graceOutMinutes: Number(formData.graceOutMinutes),
        overtimeAfterMinutes: Number(formData.overtimeAfterMinutes),
        workingHours: Number(formData.workingHours)
      };
      
      await axios[method](url, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      navigate('/shifts');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save shift');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/shifts')} className="p-2">
          <ArrowLeft size={20} />
        </Button>
        <PageHeader 
          title={isEditing ? 'Edit Shift' : 'New Shift'}
          description="Configure shift timings and rules"
          icon={Clock}
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card title="Basic Details" className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Shift Name" required>
              <Input name="name" value={formData.name} onChange={handleChange} required placeholder="e.g. Morning Shift" />
            </FormField>
            <FormField label="Shift Code" required>
              <Input name="code" value={formData.code} onChange={handleChange} required placeholder="e.g. MORN_01" />
            </FormField>
            <FormField label="Start Time (HH:mm)" required>
              <Input type="time" name="startTime" value={formData.startTime} onChange={handleChange} required />
            </FormField>
            <FormField label="End Time (HH:mm)" required>
              <Input type="time" name="endTime" value={formData.endTime} onChange={handleChange} required />
            </FormField>
            <FormField label="Total Working Hours" required>
              <Input type="number" step="0.5" name="workingHours" value={formData.workingHours} onChange={handleChange} required />
            </FormField>
            <FormField label="Status">
              <Select name="status" value={formData.status} onChange={handleChange} options={[
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' }
              ]} />
            </FormField>
            <FormField label="Overnight Shift">
              <div className="flex items-center h-10">
                <input 
                  type="checkbox" 
                  name="overnightShift" 
                  checked={formData.overnightShift} 
                  onChange={handleChange} 
                  className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-slate-700">Check if the shift ends on the next calendar day</span>
              </div>
            </FormField>
          </div>
        </Card>

        <Card title="Rules & Grace Periods" className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Break Minutes">
              <Input type="number" name="breakMinutes" value={formData.breakMinutes} onChange={handleChange} min="0" />
            </FormField>
            <FormField label="Grace In Minutes">
              <Input type="number" name="graceInMinutes" value={formData.graceInMinutes} onChange={handleChange} min="0" />
            </FormField>
            <FormField label="Grace Out Minutes">
              <Input type="number" name="graceOutMinutes" value={formData.graceOutMinutes} onChange={handleChange} min="0" />
            </FormField>
          </div>
        </Card>

        <Card title="Overtime Configuration" className="p-4">
          <div className="space-y-4">
            <FormField label="Allow Overtime">
              <div className="flex items-center h-10">
                <input 
                  type="checkbox" 
                  name="overtimeAllowed" 
                  checked={formData.overtimeAllowed} 
                  onChange={handleChange} 
                  className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-slate-700">Enable overtime calculation for this shift</span>
              </div>
            </FormField>
            
            {formData.overtimeAllowed && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <FormField label="Overtime Starts After (Minutes)">
                  <Input type="number" name="overtimeAfterMinutes" value={formData.overtimeAfterMinutes} onChange={handleChange} min="0" />
                  <p className="text-xs text-slate-500 mt-1">Minimum extra minutes worked before overtime is counted.</p>
                </FormField>
              </div>
            )}
          </div>
        </Card>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-lg flex justify-end gap-3 z-50 px-8">
          <Button type="button" variant="outline" onClick={() => navigate('/shifts')} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            <Save size={16} /> {isSubmitting ? 'Saving...' : 'Save Shift'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ShiftForm;
