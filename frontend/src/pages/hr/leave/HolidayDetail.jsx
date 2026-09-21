import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, Plus, Trash2, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { PageHeader } from '../../../components/common/PageHeader';
import { Card, CardContent } from '../../../components/common/Card';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/common/Modal';
import { FormField } from '../../../components/common/FormField';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { EmptyState } from '../../../components/common/EmptyState';

const HolidayDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [calendar, setCalendar] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ date: '', name: '', holidayType: 'PUBLIC', description: '' });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = user.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [calRes, holRes] = await Promise.all([
        axios.get('http://localhost:5000/api/v1/hr/holiday-calendars', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get(`http://localhost:5000/api/v1/hr/holiday-calendars/${id}/holidays`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      ]);
      setCalendar(calRes.data.find(c => c._id === id));
      setHolidays(holRes.data);
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`http://localhost:5000/api/v1/hr/holiday-calendars/${id}/holidays`, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setIsAdding(false);
      setFormData({ date: '', name: '', holidayType: 'PUBLIC', description: '' });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to add holiday');
    }
  };

  const handleDelete = async (holidayId) => {
    if (!window.confirm('Are you sure you want to delete this holiday?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/v1/hr/holidays/${holidayId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete holiday');
    }
  };

  if (!calendar && !isLoading) {
    return <div>Calendar not found.</div>;
  }

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6 max-w-4xl">
      <PageHeader 
        title={calendar ? `${calendar.name} (${calendar.year})` : 'Loading...'}
        description="Manage the list of holidays for this calendar."
        onBack={() => navigate('/holiday-calendars')}
        actions={
          hasPermission('HOLIDAY.CREATE') && (
            <Button onClick={() => setIsAdding(true)} leftIcon={<Plus size={18} />}>
              Add Holiday
            </Button>
          )
        }
      />

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {holidays.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-muted-foreground">
                    No holidays added yet.
                  </td>
                </tr>
              ) : holidays.map(h => (
                <tr key={h._id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-bold whitespace-nowrap">
                    {new Date(h.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">{h.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-[10px]">{h.holidayType}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{h.description || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    {hasPermission('HOLIDAY.DELETE') && (
                      <button 
                        onClick={() => handleDelete(h._id)}
                        className="p-1.5 text-muted-foreground hover:text-red-600 bg-muted/50 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Modal
        isOpen={isAdding}
        onClose={() => setIsAdding(false)}
        title="Add Holiday"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
            <Button type="submit" form="holiday-form">
              Add Holiday
            </Button>
          </>
        }
      >
        <form id="holiday-form" onSubmit={handleAddSubmit} className="space-y-4">
          <FormField label="Date" required>
            <Input type="date" name="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
          </FormField>
          <FormField label="Name" required>
            <Input name="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="e.g. Christmas Day" />
          </FormField>
          <FormField label="Type" required>
            <Select name="holidayType" value={formData.holidayType} onChange={e => setFormData({...formData, holidayType: e.target.value})}>
              <option value="PUBLIC">Public Holiday</option>
              <option value="COMPANY">Company Holiday</option>
              <option value="OPTIONAL">Optional/Restricted</option>
            </Select>
          </FormField>
          <FormField label="Description">
            <Input name="description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </FormField>
        </form>
      </Modal>
    </div>
  );
};

export default HolidayDetail;
