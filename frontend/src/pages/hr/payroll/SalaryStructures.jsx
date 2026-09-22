import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Edit2 } from 'lucide-react';
import axios from 'axios';
import { PageHeader } from '../../../components/common/PageHeader';
import { Card, CardContent } from '../../../components/common/Card';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/common/EmptyState';
import { Badge } from '../../../components/ui/Badge';
import { CardSkeleton } from '../../../components/common/CardSkeleton';

const SalaryStructures = () => {
  const [structures, setStructures] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = user.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  const fetchStructures = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get('/api/v1/hr/salary-structures', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setStructures(data);
    } catch (error) {
      console.error('Failed to fetch salary structures', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStructures();
  }, []);

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
      <PageHeader 
        title={
          <div className="flex items-center gap-2">
            <FileText className="text-primary h-8 w-8" /> 
            Salary Structures
          </div>
        }
        description="Manage salary structures mapped to countries and currencies."
        actions={
          hasPermission('PAYROLL.SALARY_STRUCTURE.CREATE') && (
            <Button onClick={() => navigate('/salary-structures/new')} leftIcon={<Plus size={18} />}>
              New Structure
            </Button>
          )
        }
      />

      {isLoading ? (
        <CardSkeleton />
      ) : structures.length === 0 ? (
        <EmptyState 
          icon={<FileText className="h-10 w-10 opacity-70" />}
          title="No salary structures found"
          description="Create your first salary structure to begin."
        />
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Code</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Currency</th>
                  <th className="px-4 py-3 font-semibold">Pay Frequency</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {structures.map(structure => (
                  <tr key={structure._id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-bold">{structure.code}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{structure.name}</td>
                    <td className="px-4 py-3 font-bold">{structure.currency}</td>
                    <td className="px-4 py-3">{structure.payFrequency}</td>
                    <td className="px-4 py-3">
                      <Badge variant={structure.status === 'ACTIVE' ? 'success' : 'secondary'}>{structure.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {hasPermission('PAYROLL.SALARY_STRUCTURE.EDIT') && (
                        <button 
                          onClick={() => navigate(`/salary-structures/edit/${structure._id}`)}
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

export default SalaryStructures;
