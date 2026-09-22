import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Loader2 } from 'lucide-react';
import axios from 'axios';
import { PageHeader } from '../../../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/common/Card';
import { FormField } from '../../../components/common/FormField';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';

const HolidayCalendarForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    year: new Date().getFullYear(),
    description: '',
    status: 'ACTIVE'
  });

  useEffect(() => {
    if (isEditing) {
      const fetchAll = async () => {
        try {
          const { data } = await axios.get(`/api/v1/hr/holiday-calendars`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          const found = data.find(c => c._id === id);
          if (found) {
            setFormData({
              name: found.name,
              year: found.year,
              description: found.description || '',
              status: found.status
            });
          }
        } catch (error) {
          console.error('Failed to fetch', error);
        }
      }
      fetchAll();
    }
  }, [id, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      if (isEditing) {
        await axios.put(`/api/v1/hr/holiday-calendars/${id}`, formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      } else {
        await axios.post('/api/v1/hr/holiday-calendars', formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      }
      navigate('/holiday-calendars');
    } catch (error) {
      console.error('Save failed:', error);
      alert(error.response?.data?.message || 'Failed to save holiday calendar');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="animate-in fade-in zoom-in-95 duration-300 space-y-6 max-w-2xl">
      <PageHeader 
        title={isEditing ? 'Edit Holiday Calendar' : 'New Holiday Calendar'}
        description="Configure a holiday calendar."
        onBack={() => navigate('/holiday-calendars')}
        actions={
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => navigate('/holiday-calendars')}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} leftIcon={isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}>
              {isSaving ? 'Saving...' : 'Save Calendar'}
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Calendar Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Name" required>
              <Input name="name" value={formData.name} onChange={handleChange} required placeholder="e.g. US Public Holidays" />
            </FormField>
            <FormField label="Year" required>
              <Input name="year" type="number" min="2000" max="2100" value={formData.year} onChange={handleChange} required />
            </FormField>
          </div>

          <FormField label="Description">
            <Input name="description" value={formData.description} onChange={handleChange} placeholder="Optional description" />
          </FormField>

          <FormField label="Status" required>
            <Select name="status" value={formData.status} onChange={handleChange}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
          </FormField>
        </CardContent>
      </Card>
    </form>
  );
};

export default HolidayCalendarForm;
