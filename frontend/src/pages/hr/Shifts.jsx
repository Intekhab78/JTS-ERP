import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { DataTable } from '../../components/common/DataTable';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Plus, Edit, Trash2, Clock } from 'lucide-react';

const Shifts = () => {
  const [shifts, setShifts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    try {
      const res = await axios.get('/api/v1/hr/shifts', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setShifts(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this shift?')) return;
    try {
      await axios.delete(`/api/v1/hr/shifts/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchShifts();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete shift');
    }
  };

  const columns = [
    { header: 'Code', accessor: 'code' },
    { header: 'Name', accessor: 'name' },
    { header: 'Timings', accessor: (row) => `${row.startTime} - ${row.endTime}` },
    { header: 'Working Hours', accessor: (row) => `${row.workingHours} hrs` },
    { header: 'Overtime', accessor: (row) => row.overtimeAllowed ? <Badge variant="success">Allowed</Badge> : <Badge variant="neutral">Not Allowed</Badge> },
    { header: 'Overnight', accessor: (row) => row.overnightShift ? <Badge variant="warning">Yes</Badge> : <Badge variant="neutral">No</Badge> },
    { header: 'Status', accessor: (row) => <Badge variant={row.status === 'ACTIVE' ? 'success' : 'danger'}>{row.status}</Badge> },
    {
      header: 'Actions',
      accessor: (row) => (
        <div className="flex gap-2">
          {hasPermission('SHIFT.EDIT') && (
            <Button variant="ghost" className="p-1 text-amber-600" onClick={() => navigate(`/shifts/edit/${row._id}`)}><Edit size={16}/></Button>
          )}
          {hasPermission('SHIFT.DELETE') && (
            <Button variant="ghost" className="p-1 text-red-600" onClick={() => handleDelete(row._id)}><Trash2 size={16}/></Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <PageHeader 
          title="Shifts"
          description="Manage working shifts for your organization"
          icon={Clock}
        />
        {hasPermission('SHIFT.CREATE') && (
          <Button onClick={() => navigate('/shifts/new')} className="gap-2">
            <Plus size={20} /> Create Shift
          </Button>
        )}
      </div>

      <Card className="p-0">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading shifts...</div>
        ) : (
          <DataTable columns={columns} data={shifts} />
        )}
      </Card>
    </div>
  );
};

export default Shifts;
