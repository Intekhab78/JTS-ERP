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
import { Plus } from 'lucide-react';

const EmployeeAttendanceTab = ({ employeeId, hasPermission }) => {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    attendanceDate: new Date().toISOString().split('T')[0],
    punchType: 'IN',
    timestamp: '',
    source: 'MANUAL',
    remarks: ''
  });

  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchAttendance();
  }, [employeeId, dateRange]);

  const fetchAttendance = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/v1/hr/employees/${employeeId}/attendance?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setRecords(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = () => {
    const now = new Date();
    // format to YYYY-MM-DDTHH:mm for datetime-local
    const pad = n => n < 10 ? '0'+n : n;
    const localDateTime = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    
    setFormData({
      attendanceDate: now.toISOString().split('T')[0],
      punchType: 'IN',
      timestamp: localDateTime,
      source: 'MANUAL',
      remarks: ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        timestamp: new Date(formData.timestamp).toISOString()
      };

      await axios.post(`http://localhost:5000/api/v1/hr/employees/${employeeId}/attendance`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      setIsModalOpen(false);
      fetchAttendance();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to mark attendance');
    }
  };

  const formatMinutes = (mins) => {
    if (!mins) return '0h 0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const columns = [
    { header: 'Date', accessor: (r) => new Date(r.attendanceDate).toLocaleDateString() },
    { 
      header: 'Status', 
      accessor: (r) => {
        const variants = {
          PRESENT: 'success',
          ABSENT: 'danger',
          HALF_DAY: 'warning',
          LATE: 'warning',
          EARLY_EXIT: 'warning',
          ON_LEAVE: 'neutral',
          HOLIDAY: 'neutral'
        };
        return <Badge variant={variants[r.status] || 'neutral'}>{r.status}</Badge>;
      } 
    },
    { header: 'Shift', accessor: (r) => r.shiftId ? r.shiftId.name : '—' },
    { header: 'First In', accessor: (r) => formatTime(r.firstCheckIn) },
    { header: 'Last Out', accessor: (r) => formatTime(r.lastCheckOut) },
    { header: 'Total Work', accessor: (r) => <span className="font-medium">{formatMinutes(r.totalWorkingMinutes)}</span> },
    { header: 'Late/Early', accessor: (r) => (
      <div className="text-sm">
        {r.lateMinutes > 0 && <div className="text-red-500">Late: {formatMinutes(r.lateMinutes)}</div>}
        {r.earlyExitMinutes > 0 && <div className="text-orange-500">Early: {formatMinutes(r.earlyExitMinutes)}</div>}
        {r.lateMinutes === 0 && r.earlyExitMinutes === 0 && <span className="text-slate-400">—</span>}
      </div>
    )},
    { header: 'Overtime', accessor: (r) => r.overtimeMinutes > 0 ? <span className="text-green-600 font-medium">{formatMinutes(r.overtimeMinutes)}</span> : '—' },
    { 
      header: 'Punches', 
      accessor: (r) => (
        <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">
          {r.punches?.length || 0} punches
        </span>
      ) 
    }
  ];

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-slate-800">Attendance History</h3>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-md border border-slate-200">
            <Input 
              type="date" 
              value={dateRange.startDate} 
              onChange={e => setDateRange({...dateRange, startDate: e.target.value})} 
              className="border-none bg-transparent h-8"
            />
            <span className="text-slate-400">to</span>
            <Input 
              type="date" 
              value={dateRange.endDate} 
              onChange={e => setDateRange({...dateRange, endDate: e.target.value})} 
              className="border-none bg-transparent h-8"
            />
          </div>
          {hasPermission('ATTENDANCE.CREATE') && (
            <Button onClick={handleOpenModal} className="gap-2">
              <Plus size={16} /> Manual Punch
            </Button>
          )}
        </div>
      </div>

      {isLoading ? <div>Loading...</div> : <DataTable columns={columns} data={records} />}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Manual Punch">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Canonical Date (Shift Date)" required>
            <Input type="date" value={formData.attendanceDate} onChange={e => setFormData({...formData, attendanceDate: e.target.value})} required />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Punch Type" required>
              <Select 
                value={formData.punchType} 
                onChange={e => setFormData({...formData, punchType: e.target.value})} 
                required
                options={[
                  { value: 'IN', label: 'Check IN' },
                  { value: 'OUT', label: 'Check OUT' }
                ]}
              />
            </FormField>
            <FormField label="Timestamp" required>
              <Input type="datetime-local" value={formData.timestamp} onChange={e => setFormData({...formData, timestamp: e.target.value})} required />
            </FormField>
          </div>
          <FormField label="Remarks">
            <Input value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} />
          </FormField>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Punch</Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
};

export default EmployeeAttendanceTab;
