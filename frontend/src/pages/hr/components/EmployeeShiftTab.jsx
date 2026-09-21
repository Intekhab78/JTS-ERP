import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/ui/Button';
import { DataTable } from '../../../components/common/DataTable';
import { Modal } from '../../../components/common/Modal';
import { FormField } from '../../../components/common/FormField';
import { Select } from '../../../components/ui/Select';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Plus, Trash2 } from 'lucide-react';

const EmployeeShiftTab = ({ employeeId, hasPermission }) => {
  const [assignments, setAssignments] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    shiftId: '',
    effectiveFrom: '',
    effectiveTo: ''
  });

  useEffect(() => {
    fetchAssignments();
    fetchShifts();
  }, [employeeId]);

  const fetchAssignments = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/v1/hr/employees/${employeeId}/shifts`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAssignments(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchShifts = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/v1/hr/shifts`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setShifts(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleOpenModal = () => {
    setFormData({
      shiftId: '',
      effectiveFrom: new Date().toISOString().split('T')[0],
      effectiveTo: ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (!payload.effectiveTo) delete payload.effectiveTo;

      await axios.post(`http://localhost:5000/api/v1/hr/employees/${employeeId}/shifts`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      setIsModalOpen(false);
      fetchAssignments();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to assign shift');
    }
  };

  const handleDelete = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to delete this shift assignment?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/v1/hr/employees/${employeeId}/shifts/${assignmentId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchAssignments();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete assignment');
    }
  };

  const columns = [
    { header: 'Shift Name', accessor: (a) => <span className="font-medium text-slate-700">{a.shiftId?.name} ({a.shiftId?.code})</span> },
    { header: 'Timings', accessor: (a) => `${a.shiftId?.startTime} - ${a.shiftId?.endTime}` },
    { header: 'Effective From', accessor: (a) => new Date(a.effectiveFrom).toLocaleDateString() },
    { header: 'Effective To', accessor: (a) => a.effectiveTo ? new Date(a.effectiveTo).toLocaleDateString() : <Badge variant="neutral">Indefinite</Badge> },
    { 
      header: 'Status', 
      accessor: (a) => {
        const now = new Date();
        const start = new Date(a.effectiveFrom);
        const end = a.effectiveTo ? new Date(a.effectiveTo) : null;
        
        let status = 'INACTIVE';
        if (a.status === 'ACTIVE' && start <= now && (!end || end >= now)) {
          status = 'ACTIVE';
        } else if (start > now) {
          status = 'UPCOMING';
        }
        
        return <Badge variant={status === 'ACTIVE' ? 'success' : status === 'UPCOMING' ? 'warning' : 'neutral'}>{status}</Badge>;
      } 
    },
    {
      header: 'Actions',
      accessor: (a) => (
        <div className="flex gap-2">
          {hasPermission('SHIFT.EDIT') && (
            <Button variant="ghost" className="p-1 text-red-600" onClick={() => handleDelete(a._id)}><Trash2 size={16}/></Button>
          )}
        </div>
      )
    }
  ];

  if (isLoading) return <div>Loading...</div>;

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-slate-800">Shift Assignments</h3>
        {hasPermission('SHIFT.EDIT') && (
          <Button onClick={handleOpenModal} className="gap-2">
            <Plus size={16} /> Assign Shift
          </Button>
        )}
      </div>

      <DataTable columns={columns} data={assignments} />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Assign Shift">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Shift" required>
            <Select 
              value={formData.shiftId} 
              onChange={e => setFormData({...formData, shiftId: e.target.value})} 
              required
              options={[
                { value: '', label: 'Select Shift' },
                ...shifts.map(s => ({ value: s._id, label: `${s.name} (${s.startTime} - ${s.endTime})` }))
              ]}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Effective From" required>
              <Input type="date" value={formData.effectiveFrom} onChange={e => setFormData({...formData, effectiveFrom: e.target.value})} required />
            </FormField>
            <FormField label="Effective To (Optional)">
              <Input type="date" value={formData.effectiveTo} onChange={e => setFormData({...formData, effectiveTo: e.target.value})} />
            </FormField>
          </div>
          <p className="text-xs text-slate-500">Leaving "Effective To" blank will make this the active shift indefinitely, automatically ending previous indefinite shifts.</p>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Assign Shift</Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
};

export default EmployeeShiftTab;
