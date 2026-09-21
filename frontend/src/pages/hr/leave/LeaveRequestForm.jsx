import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Loader2 } from 'lucide-react';
import axios from 'axios';
import { PageHeader } from '../../../components/common/PageHeader';
import { Card, CardContent } from '../../../components/common/Card';
import { FormField } from '../../../components/common/FormField';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';

const LeaveRequestForm = () => {
  const navigate = useNavigate();
  
  const [isSaving, setIsSaving] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  
  const [formData, setFormData] = useState({
    employeeId: '',
    leaveTypeId: '',
    fromDate: '',
    toDate: '',
    leaveDurationType: 'FULL_DAY',
    requestedUnits: 0,
    reason: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [empRes, typeRes] = await Promise.all([
          axios.get('http://localhost:5000/api/v1/hr/employees', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }),
          axios.get('http://localhost:5000/api/v1/hr/leave-types', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          })
        ]);
        setEmployees(empRes.data);
        setLeaveTypes(typeRes.data);
      } catch (error) {
        console.error('Failed to fetch data', error);
      }
    };
    fetchData();
  }, []);

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
      await axios.post('http://localhost:5000/api/v1/hr/leave-requests', formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      navigate('/leave-requests');
    } catch (error) {
      console.error('Submit failed:', error);
      alert(error.response?.data?.message || 'Failed to submit leave request');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="animate-in fade-in zoom-in-95 duration-300 space-y-6 max-w-2xl">
      <PageHeader 
        title="Submit Leave Request"
        description="Apply for leave on behalf of an employee."
        onBack={() => navigate('/leave-requests')}
        actions={
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => navigate('/leave-requests')}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} leftIcon={isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}>
              {isSaving ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <FormField label="Employee" required>
            <Select name="employeeId" value={formData.employeeId} onChange={handleChange} required>
              <option value="">-- Select Employee --</option>
              {employees.map(emp => (
                <option key={emp._id} value={emp._id}>
                  {emp.employeeCode} - {emp.firstName} {emp.lastName}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Leave Type" required>
            <Select name="leaveTypeId" value={formData.leaveTypeId} onChange={handleChange} required>
              <option value="">-- Select Leave Type --</option>
              {leaveTypes.map(lt => (
                <option key={lt._id} value={lt._id}>
                  {lt.name} ({lt.unit})
                </option>
              ))}
            </Select>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="From Date" required>
              <Input type="date" name="fromDate" value={formData.fromDate} onChange={handleChange} required />
            </FormField>
            <FormField label="To Date" required>
              <Input type="date" name="toDate" value={formData.toDate} onChange={handleChange} required />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Duration Type" required>
              <Select name="leaveDurationType" value={formData.leaveDurationType} onChange={handleChange}>
                <option value="FULL_DAY">Full Day</option>
                <option value="HALF_DAY_FIRST">Half Day - First Half</option>
                <option value="HALF_DAY_SECOND">Half Day - Second Half</option>
                <option value="HOURLY">Hourly</option>
              </Select>
            </FormField>
            <FormField label="Requested Units" required>
              <Input type="number" step="0.5" min="0.5" name="requestedUnits" value={formData.requestedUnits} onChange={handleChange} required />
              <p className="text-[10px] text-muted-foreground mt-1">Number of Days/Hours (calculated based on working days normally, but input manually for this phase demo)</p>
            </FormField>
          </div>

          <FormField label="Reason" required>
            <Input name="reason" value={formData.reason} onChange={handleChange} required />
          </FormField>
        </CardContent>
      </Card>
    </form>
  );
};

export default LeaveRequestForm;
