import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileCheck, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '../../../components/common/Card';
import { Badge } from '../../../components/ui/Badge';

const EmployeeLeaveRequestsTab = ({ employeeId, hasPermission }) => {
  const [requests, setRequests] = useState([]);
  
  const fetchRequests = async () => {
    try {
      const { data } = await axios.get(`http://localhost:5000/api/v1/hr/leave-requests?employeeId=${employeeId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setRequests(data);
    } catch (error) {
      console.error('Failed to fetch requests', error);
    }
  };

  useEffect(() => {
    if (employeeId) fetchRequests();
  }, [employeeId]);

  const getStatusColor = (status) => {
    switch(status) {
      case 'APPROVED': return 'bg-green-100 text-green-700 border-green-200';
      case 'REJECTED': return 'bg-red-100 text-red-700 border-red-200';
      case 'SUBMITTED': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800">
          <FileCheck size={20} className="text-primary" /> Leave Requests
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border rounded-lg">
          <thead className="bg-muted/50 text-muted-foreground border-b">
            <tr>
              <th className="px-4 py-3 font-semibold">Leave Type</th>
              <th className="px-4 py-3 font-semibold">Duration</th>
              <th className="px-4 py-3 font-semibold">Units</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {requests.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-4 py-8 text-center text-muted-foreground">
                  No leave requests found.
                </td>
              </tr>
            ) : requests.map(req => (
              <tr key={req._id} className="hover:bg-muted/10 transition-colors">
                <td className="px-4 py-3 font-medium text-foreground">
                  {req.leaveTypeId?.name}
                </td>
                <td className="px-4 py-3">
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default EmployeeLeaveRequestsTab;
