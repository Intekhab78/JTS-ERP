import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Loader2, Info } from 'lucide-react';
import axios from 'axios';
import { PageHeader } from '../../../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/common/Card';
import { FormField } from '../../../components/common/FormField';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';

const LeaveTypeForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    paidLeave: true,
    unit: 'DAYS',
    annualEntitlement: 0,
    accrualEnabled: false,
    accrualFrequency: 'NONE',
    accrualAmount: 0,
    carryForwardEnabled: false,
    maximumCarryForward: 0,
    carryForwardExpiry: 0,
    encashmentEnabled: false,
    maximumEncashment: 0,
    requiresApproval: true,
    requiresDocument: false,
    minimumNoticeDays: 0,
    maximumConsecutiveDays: 0,
    genderRestriction: 'ALL',
    status: 'ACTIVE'
  });

  useEffect(() => {
    if (isEditing) {
      fetchLeaveType();
    }
  }, [id]);

  const fetchLeaveType = async () => {
    try {
      const { data } = await axios.get(`/api/v1/hr/leave-types/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      // The get by id might not exist, but let's assume we fetch all and find it, or build a specific GET route.
      // Wait, we didn't add getLeaveTypeById. We will just fetch all and find.
    } catch (error) {
      console.error('Failed to fetch leave type', error);
    }
  };

  // Safe fetch workaround since we didn't add GET /leave-types/:id
  useEffect(() => {
    if (isEditing) {
      const fetchAll = async () => {
        try {
          const { data } = await axios.get(`/api/v1/hr/leave-types`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          const found = data.find(l => l._id === id);
          if (found) {
            setFormData(found);
          }
        } catch (error) {
          console.error('Failed to fetch', error);
        }
      }
      fetchAll();
    }
  }, [id, isEditing]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      if (isEditing) {
        await axios.put(`/api/v1/hr/leave-types/${id}`, formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      } else {
        await axios.post('/api/v1/hr/leave-types', formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      }
      navigate('/leave-types');
    } catch (error) {
      console.error('Save failed:', error);
      alert(error.response?.data?.message || 'Failed to save leave type');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="animate-in fade-in zoom-in-95 duration-300 space-y-6 max-w-4xl">
      <PageHeader 
        title={isEditing ? 'Edit Leave Type' : 'New Leave Type'}
        description="Configure the policies and rules for this leave type."
        onBack={() => navigate('/leave-types')}
        actions={
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => navigate('/leave-types')}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} leftIcon={isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}>
              {isSaving ? 'Saving...' : 'Save Leave Type'}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Name" required>
                <Input name="name" value={formData.name} onChange={handleChange} required placeholder="e.g. Annual Leave" />
              </FormField>
              <FormField label="Code" required>
                <Input name="code" value={formData.code} onChange={handleChange} required className="uppercase" placeholder="e.g. AL" />
              </FormField>
            </div>

            <FormField label="Description">
              <Input name="description" value={formData.description} onChange={handleChange} placeholder="Optional description" />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Unit" required>
                <Select name="unit" value={formData.unit} onChange={handleChange}>
                  <option value="DAYS">Days</option>
                  <option value="HOURS">Hours</option>
                </Select>
              </FormField>
              
              <FormField label="Annual Entitlement" required>
                <Input name="annualEntitlement" type="number" min="0" step="0.5" value={formData.annualEntitlement} onChange={handleChange} required />
              </FormField>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Status" required>
                <Select name="status" value={formData.status} onChange={handleChange}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </Select>
              </FormField>
              
              <FormField label="Gender Restriction">
                <Select name="genderRestriction" value={formData.genderRestriction} onChange={handleChange}>
                  <option value="ALL">All Genders</option>
                  <option value="MALE">Male Only</option>
                  <option value="FEMALE">Female Only</option>
                  <option value="OTHER">Other Only</option>
                </Select>
              </FormField>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Accrual & Carry Forward</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                <Checkbox id="accrualEnabled" name="accrualEnabled" checked={formData.accrualEnabled} onChange={handleChange} />
                <label htmlFor="accrualEnabled" className="text-sm font-semibold cursor-pointer">Enable Accrual</label>
             </div>
             
             {formData.accrualEnabled && (
                <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-primary/20">
                  <FormField label="Accrual Frequency" required>
                    <Select name="accrualFrequency" value={formData.accrualFrequency} onChange={handleChange}>
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="YEARLY">Yearly</option>
                    </Select>
                  </FormField>
                  <FormField label="Accrual Amount" required>
                    <Input name="accrualAmount" type="number" min="0" step="0.1" value={formData.accrualAmount} onChange={handleChange} />
                  </FormField>
                </div>
             )}

            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                <Checkbox id="carryForwardEnabled" name="carryForwardEnabled" checked={formData.carryForwardEnabled} onChange={handleChange} />
                <label htmlFor="carryForwardEnabled" className="text-sm font-semibold cursor-pointer">Enable Carry Forward</label>
             </div>
             
             {formData.carryForwardEnabled && (
                <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-primary/20">
                  <FormField label="Maximum Carry Forward">
                    <Input name="maximumCarryForward" type="number" min="0" step="0.5" value={formData.maximumCarryForward} onChange={handleChange} />
                  </FormField>
                  <FormField label="Expiry (Months) (0=Never)">
                    <Input name="carryForwardExpiry" type="number" min="0" value={formData.carryForwardExpiry} onChange={handleChange} />
                  </FormField>
                </div>
             )}
             
             <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                <Checkbox id="encashmentEnabled" name="encashmentEnabled" checked={formData.encashmentEnabled} onChange={handleChange} />
                <label htmlFor="encashmentEnabled" className="text-sm font-semibold cursor-pointer">Enable Encashment</label>
             </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Policy Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-3">
                 <div className="flex items-center gap-2">
                  <Checkbox id="paidLeave" name="paidLeave" checked={formData.paidLeave} onChange={handleChange} />
                  <label htmlFor="paidLeave" className="text-sm font-medium cursor-pointer">Is Paid Leave?</label>
                 </div>
                 <div className="flex items-center gap-2">
                  <Checkbox id="requiresApproval" name="requiresApproval" checked={formData.requiresApproval} onChange={handleChange} />
                  <label htmlFor="requiresApproval" className="text-sm font-medium cursor-pointer">Requires Approval?</label>
                 </div>
                 <div className="flex items-center gap-2">
                  <Checkbox id="requiresDocument" name="requiresDocument" checked={formData.requiresDocument} onChange={handleChange} />
                  <label htmlFor="requiresDocument" className="text-sm font-medium cursor-pointer">Requires Document?</label>
                 </div>
              </div>

              <FormField label="Minimum Notice Days">
                <Input name="minimumNoticeDays" type="number" min="0" value={formData.minimumNoticeDays} onChange={handleChange} />
                <p className="text-[10px] text-muted-foreground mt-1">Days required before start date</p>
              </FormField>

              <FormField label="Max Consecutive Days">
                <Input name="maximumConsecutiveDays" type="number" min="0" value={formData.maximumConsecutiveDays} onChange={handleChange} />
                <p className="text-[10px] text-muted-foreground mt-1">0 means no limit</p>
              </FormField>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
};

export default LeaveTypeForm;
