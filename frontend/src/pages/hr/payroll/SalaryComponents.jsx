import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Banknote, Plus, Edit2, Trash2 } from 'lucide-react';
import axios from 'axios';
import { PageHeader } from '../../../components/common/PageHeader';
import { Card, CardContent } from '../../../components/common/Card';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/common/EmptyState';
import { Badge } from '../../../components/ui/Badge';
import { CardSkeleton } from '../../../components/common/CardSkeleton';

const SalaryComponents = () => {
  const [components, setComponents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = user.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  const fetchComponents = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get('/api/v1/hr/salary-components', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setComponents(data);
    } catch (error) {
      console.error('Failed to fetch salary components', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComponents();
  }, []);

  const getTypeColor = (type) => {
    switch (type) {
      case 'EARNING': return 'bg-green-100 text-green-800 border-green-200';
      case 'DEDUCTION': return 'bg-red-100 text-red-800 border-red-200';
      case 'EMPLOYER_CONTRIBUTION': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'REIMBURSEMENT': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
      <PageHeader 
        title={
          <div className="flex items-center gap-2">
            <Banknote className="text-primary h-8 w-8" /> 
            Salary Components
          </div>
        }
        description="Manage earnings, deductions, and reimbursements."
        actions={
          hasPermission('PAYROLL.SALARY_COMPONENT.CREATE') && (
            <Button onClick={() => navigate('/salary-components/new')} leftIcon={<Plus size={18} />}>
              New Component
            </Button>
          )
        }
      />

      {isLoading ? (
        <CardSkeleton />
      ) : components.length === 0 ? (
        <EmptyState 
          icon={<Banknote className="h-10 w-10 opacity-70" />}
          title="No salary components found"
          description="Create your first salary component to get started."
        />
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Code</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Calculation</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {components.map(comp => (
                  <tr key={comp._id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-bold">{comp.code}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{comp.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold border ${getTypeColor(comp.type)}`}>
                        {comp.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{comp.calculationType}</td>
                    <td className="px-4 py-3">
                      <Badge variant={comp.status === 'ACTIVE' ? 'success' : 'secondary'}>{comp.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {hasPermission('PAYROLL.SALARY_COMPONENT.EDIT') && (
                        <button 
                          onClick={() => navigate(`/salary-components/edit/${comp._id}`)}
                          className="p-1.5 text-muted-foreground hover:text-primary bg-muted/50 hover:bg-primary/10 rounded-md transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
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

export default SalaryComponents;
