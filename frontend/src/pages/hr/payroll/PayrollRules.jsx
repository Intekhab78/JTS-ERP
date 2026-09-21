import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Plus, Edit2 } from 'lucide-react';
import axios from 'axios';
import { PageHeader } from '../../../components/common/PageHeader';
import { Card, CardContent } from '../../../components/common/Card';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/common/EmptyState';
import { Badge } from '../../../components/ui/Badge';
import { CardSkeleton } from '../../../components/common/CardSkeleton';

const PayrollRules = () => {
  const [rules, setRules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = user.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  const fetchRules = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get('http://localhost:5000/api/v1/hr/payroll-rules', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setRules(data);
    } catch (error) {
      console.error('Failed to fetch payroll rules', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
      <PageHeader 
        title={
          <div className="flex items-center gap-2">
            <Shield className="text-primary h-8 w-8" /> 
            Payroll Rules
          </div>
        }
        description="Configure country-specific and global tax, social security, and allowance rules."
        actions={
          hasPermission('PAYROLL.RULE.CREATE') && (
            <Button onClick={() => navigate('/payroll-rules/new')} leftIcon={<Plus size={18} />}>
              New Rule
            </Button>
          )
        }
      />

      {isLoading ? (
        <CardSkeleton />
      ) : rules.length === 0 ? (
        <EmptyState 
          icon={<Shield className="h-10 w-10 opacity-70" />}
          title="No payroll rules found"
          description="Create your first rule to govern tax or deductions."
        />
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Code</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Rule Type</th>
                  <th className="px-4 py-3 font-semibold">Calc Type</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rules.map(rule => (
                  <tr key={rule._id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-bold">{rule.code}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{rule.name}</td>
                    <td className="px-4 py-3">{rule.ruleType.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-muted-foreground">{rule.calculationType}</td>
                    <td className="px-4 py-3">
                      <Badge variant={rule.status === 'ACTIVE' ? 'success' : 'secondary'}>{rule.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {hasPermission('PAYROLL.RULE.EDIT') && (
                        <button 
                          onClick={() => navigate(`/payroll-rules/edit/${rule._id}`)}
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

export default PayrollRules;
