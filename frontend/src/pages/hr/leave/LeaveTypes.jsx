import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Edit2, Trash2 } from 'lucide-react';
import axios from 'axios';
import { PageHeader } from '../../../components/common/PageHeader';
import { Card, CardContent } from '../../../components/common/Card';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/common/EmptyState';
import { Badge } from '../../../components/ui/Badge';
import { CardSkeleton } from '../../../components/common/CardSkeleton';

const LeaveTypes = () => {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = user.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  const fetchLeaveTypes = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get('http://localhost:5000/api/v1/hr/leave-types', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setLeaveTypes(data);
    } catch (error) {
      console.error('Failed to fetch leave types', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
      <PageHeader 
        title={
          <div className="flex items-center gap-2">
            <FileText className="text-primary h-8 w-8" /> 
            Leave Types
          </div>
        }
        description="Manage leave types, accrual rules, and carry-forward limits."
        actions={
          hasPermission('LEAVE.TYPE.CREATE') && (
            <Button onClick={() => navigate('/leave-types/new')} leftIcon={<Plus size={18} />}>
              New Leave Type
            </Button>
          )
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : leaveTypes.length === 0 ? (
        <EmptyState 
          icon={<FileText className="h-10 w-10 opacity-70" />}
          title="No leave types found"
          description="Create your first leave type to get started."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {leaveTypes.map(leave => (
            <Card key={leave._id} className="relative group overflow-hidden hover:shadow-md transition-shadow">
              <div className={`absolute top-0 left-0 w-1 h-full ${leave.status === 'ACTIVE' ? 'bg-green-500' : 'bg-muted'}`}></div>
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{leave.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">{leave.code}</Badge>
                      <Badge variant={leave.paidLeave ? "default" : "secondary"} className="text-[10px]">{leave.paidLeave ? 'PAID' : 'UNPAID'}</Badge>
                    </div>
                  </div>
                  {hasPermission('LEAVE.TYPE.EDIT') && (
                    <button 
                      onClick={() => navigate(`/leave-types/edit/${leave._id}`)}
                      className="p-1.5 text-muted-foreground hover:text-primary bg-muted/50 hover:bg-primary/10 rounded-md transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[40px]">
                  {leave.description || 'No description provided.'}
                </p>

                <div className="space-y-2 text-sm bg-muted/30 p-3 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-medium">Entitlement</span>
                    <span className="font-bold">{leave.annualEntitlement} {leave.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-medium">Accrual</span>
                    <span className="font-bold">{leave.accrualEnabled ? leave.accrualFrequency : 'None'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-medium">Carry Fwd Limit</span>
                    <span className="font-bold">{leave.carryForwardEnabled ? leave.maximumCarryForward : 'None'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default LeaveTypes;
