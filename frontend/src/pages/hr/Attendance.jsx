import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { DataTable } from '../../components/common/DataTable';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Calendar } from 'lucide-react';

const Attendance = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  useEffect(() => {
    fetchDailyAttendance();
  }, [date]);

  const fetchDailyAttendance = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`/api/v1/hr/attendance/daily?date=${date}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setRecords(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
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
    { header: 'Employee ID', accessor: (r) => r.employeeId?.employeeCode },
    { header: 'Name', accessor: (r) => <span className="font-medium text-slate-700">{r.employeeId?.firstName} {r.employeeId?.lastName}</span> },
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
    { header: 'Shift', accessor: (r) => r.shiftId?.name || '—' },
    { header: 'First In', accessor: (r) => formatTime(r.firstCheckIn) },
    { header: 'Last Out', accessor: (r) => formatTime(r.lastCheckOut) },
    { header: 'Total Work', accessor: (r) => <span className="font-medium">{formatMinutes(r.totalWorkingMinutes)}</span> },
    { header: 'Late/Early', accessor: (r) => (
      <div className="text-sm">
        {r.lateMinutes > 0 && <div className="text-red-500">Late: {formatMinutes(r.lateMinutes)}</div>}
        {r.earlyExitMinutes > 0 && <div className="text-orange-500">Early: {formatMinutes(r.earlyExitMinutes)}</div>}
        {r.lateMinutes === 0 && r.earlyExitMinutes === 0 && <span className="text-slate-400">—</span>}
      </div>
    )}
  ];

  if (!hasPermission('ATTENDANCE.VIEW')) {
    return <div className="p-8 text-center text-red-500">You do not have permission to view global attendance.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader 
          title="Daily Attendance"
          description="Monitor organization-wide daily attendance"
          icon={Calendar}
        />
        <div className="flex items-center gap-3 bg-white p-2 rounded-lg shadow-sm border border-slate-200">
          <span className="text-sm font-medium text-slate-600 pl-2">Select Date:</span>
          <Input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)}
            className="w-48"
          />
        </div>
      </div>

      <Card className="p-0">
        <div className="p-4 border-b border-slate-100 flex gap-4 text-sm">
          <div className="flex flex-col">
            <span className="text-slate-500">Total Records</span>
            <span className="font-bold text-lg">{records.length}</span>
          </div>
          <div className="w-px bg-slate-200 mx-2"></div>
          <div className="flex flex-col">
            <span className="text-slate-500">Present</span>
            <span className="font-bold text-lg text-green-600">{records.filter(r => r.status === 'PRESENT' || r.status === 'LATE' || r.status === 'EARLY_EXIT').length}</span>
          </div>
          <div className="w-px bg-slate-200 mx-2"></div>
          <div className="flex flex-col">
            <span className="text-slate-500">Absent</span>
            <span className="font-bold text-lg text-red-600">{records.filter(r => r.status === 'ABSENT').length}</span>
          </div>
          <div className="w-px bg-slate-200 mx-2"></div>
          <div className="flex flex-col">
            <span className="text-slate-500">On Leave</span>
            <span className="font-bold text-lg text-slate-600">{records.filter(r => r.status === 'ON_LEAVE').length}</span>
          </div>
        </div>
        
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading attendance...</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No attendance records found for this date.</div>
        ) : (
          <DataTable columns={columns} data={records} />
        )}
      </Card>
    </div>
  );
};

export default Attendance;
