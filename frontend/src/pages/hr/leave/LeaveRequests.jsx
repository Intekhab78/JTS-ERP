import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCheck, Plus, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';
import { PageHeader } from '../../../components/common/PageHeader';
import { Card, CardContent } from '../../../components/common/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/common/EmptyState';
import { CardSkeleton } from '../../../components/common/CardSkeleton';

const LeaveRequests = () => {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = user.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get('http://localhost:5000/api/v1/hr/leave-requests', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setRequests(data);
    } catch (error) {
      console.error('Failed to fetch leave requests', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (id) => {
    if (!window.confirm('Are you sure you want to approve this leave request?')) return;
    try {
      await axios.post(`http://localhost:5000/api/v1/hr/leave-requests/${id}/approve`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchRequests();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to approve');
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt('Please enter a rejection reason:');
    if (reason === null) return;
    try {
      await axios.post(`http://localhost:5000/api/v1/hr/leave-requests/${id}/reject`, { rejectionReason: reason }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchRequests();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to reject');
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'APPROVED': return 'bg-green-100 text-green-700 border-green-200';
      case 'REJECTED': return 'bg-red-100 text-red-700 border-red-200';
      case 'SUBMITTED': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
      <PageHeader 
        title={
          <div className="flex items-center gap-2">
            <FileCheck className="text-primary h-8 w-8" /> 
            Leave Requests
          </div>
        }
        description="Review and manage employee leave applications."
        actions={
          hasPermission('LEAVE.REQUEST.SUBMIT') && (
            <Button onClick={() => navigate('/leave-requests/new')} leftIcon={<Plus size={18} />}>
              New Request
            </Button>
          )
        }
      />

      {isLoading ? (
        <CardSkeleton />
      ) : requests.length === 0 ? (
        <EmptyState 
          icon={<FileCheck className="h-10 w-10 opacity-70" />}
          title="No leave requests found"
          description="There are currently no leave requests to review."
        />
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Employee</th>
                  <th className="px-4 py-3 font-semibold">Leave Type</th>
                  <th className="px-4 py-3 font-semibold">Duration</th>
                  <th className="px-4 py-3 font-semibold">Units</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {requests.map(req => (
                  <tr key={req._id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {req.employeeId?.firstName} {req.employeeId?.lastName}
                      <div className="text-xs text-muted-foreground">{req.employeeId?.employeeCode}</div>
                    </td>
                    <td className="px-4 py-3">
                      {req.leaveTypeId?.name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(req.fromDate).toLocaleDateString()} to {new Date(req.toDate).toLocaleDateString()}
                      <div className="text-[10px] text-muted-foreground">{req.leaveDurationType.replace(/_/g, ' ')}</div>
                    </td>
                    <td className="px-4 py-3 font-bold">
                      {req.requestedUnits} {req.leaveTypeId?.unit}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(req.status)}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {req.status === 'SUBMITTED' && (
                        <div className="flex justify-end gap-2">
                          {hasPermission('LEAVE.REQUEST.APPROVE') && (
                            <button onClick={() => handleApprove(req._id)} className="text-green-600 hover:bg-green-50 p-1.5 rounded-md" title="Approve">
                              <CheckCircle size={18} />
                            </button>
                          )}
                          {hasPermission('LEAVE.REQUEST.REJECT') && (
                            <button onClick={() => handleReject(req._id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded-md" title="Reject">
                              <XCircle size={18} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LeaveRequests;
