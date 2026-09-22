import React, { useState, useEffect } from 'react';
import { Plus, Edit2, History, Banknote } from 'lucide-react';
import axios from 'axios';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/common/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/common/EmptyState';
import { Modal } from '../../../components/common/Modal';
import { FormField } from '../../../components/common/FormField';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';

const EmployeeSalaryTab = ({ employeeId, hasPermission }) => {
  const [currentSalary, setCurrentSalary] = useState(null);
  const [salaryHistory, setSalaryHistory] = useState([]);
  const [payrollHistory, setPayrollHistory] = useState([]);
  const [structures, setStructures] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRevise, setIsRevise] = useState(false);
  
  const [formData, setFormData] = useState({
    salaryStructureId: '',
    effectiveFrom: '',
    currency: 'USD',
    payFrequency: 'MONTHLY',
    basicSalary: 0,
    reasonForRevision: '',
    notes: '',
    components: []
  });

  useEffect(() => {
    fetchData();
  }, [employeeId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (hasPermission('PAYROLL.EMPLOYEE_SALARY.VIEW')) {
        const [salaryRes, historyRes, structsRes, payrollRes] = await Promise.all([
          axios.get(`/api/v1/hr/employees/${employeeId}/salary`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
          axios.get(`/api/v1/hr/employees/${employeeId}/salary/history`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
          axios.get(`/api/v1/hr/salary-structures`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
          hasPermission('PAYROLL.PAYSLIP.VIEW') 
            ? axios.get(`/api/v1/hr/payslips?employee=${employeeId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
            : Promise.resolve({ data: [] })
        ]);
        setCurrentSalary(salaryRes.data);
        setSalaryHistory(historyRes.data);
        setStructures(structsRes.data.filter(s => s.status === 'ACTIVE'));
        setPayrollHistory(payrollRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch salary data', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStructureSelect = (structId) => {
    const struct = structures.find(s => s._id === structId);
    if (!struct) return;
    
    // Copy the structure components into a snapshot suitable for EmployeeSalary assignment
    const mappedComponents = struct.components.map(c => ({
      componentId: c.componentId._id,
      nameSnapshot: c.componentId.name,
      typeSnapshot: c.componentId.type,
      calculationType: c.calculationType,
      amount: c.amount,
      percentage: c.percentage
    }));

    setFormData(prev => ({
      ...prev,
      salaryStructureId: structId,
      currency: struct.currency,
      payFrequency: struct.payFrequency,
      components: mappedComponents
    }));
  };

  const handleBasicSalaryChange = (e) => {
    const val = Number(e.target.value);
    const newComps = [...formData.components];
    
    // Recalculate percentage based components dynamically
    newComps.forEach(comp => {
      if (comp.calculationType === 'PERCENTAGE') {
        comp.amount = (val * comp.percentage) / 100;
      }
    });

    setFormData({ ...formData, basicSalary: val, components: newComps });
  };

  const handleComponentAmountChange = (index, value) => {
    const newComps = [...formData.components];
    newComps[index].amount = Number(value);
    setFormData({ ...formData, components: newComps });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isRevise) {
        await axios.post(`/api/v1/hr/employees/${employeeId}/salary/revise`, formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      } else {
        await axios.post(`/api/v1/hr/employees/${employeeId}/salary`, formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to assign salary');
    }
  };

  const openAssignModal = () => {
    setIsRevise(false);
    setFormData({
      salaryStructureId: '',
      effectiveFrom: new Date().toISOString().split('T')[0],
      currency: 'USD',
      payFrequency: 'MONTHLY',
      basicSalary: 0,
      reasonForRevision: '',
      notes: '',
      components: []
    });
    setIsModalOpen(true);
  };

  const openReviseModal = () => {
    setIsRevise(true);
    if (currentSalary) {
      setFormData({
        salaryStructureId: currentSalary.salaryStructureId._id,
        effectiveFrom: new Date().toISOString().split('T')[0],
        currency: currentSalary.currency,
        payFrequency: currentSalary.payFrequency,
        basicSalary: currentSalary.basicSalary,
        reasonForRevision: '',
        notes: '',
        components: currentSalary.components.map(c => ({...c}))
      });
    }
    setIsModalOpen(true);
  };

  if (!hasPermission('PAYROLL.EMPLOYEE_SALARY.VIEW')) {
    return (
      <EmptyState 
        icon={<Banknote className="h-10 w-10 opacity-70" />}
        title="Access Denied"
        description="You do not have permission to view salary details."
      />
    );
  }

  if (isLoading) return <div className="p-4 text-center">Loading salary data...</div>;

  return (
    <div className="space-y-6">
      {!currentSalary ? (
        <EmptyState 
          icon={<Banknote className="h-10 w-10 opacity-70" />}
          title="No Salary Assigned"
          description="This employee currently has no active salary structure assigned."
          action={hasPermission('PAYROLL.EMPLOYEE_SALARY.CREATE') && (
            <Button onClick={openAssignModal} leftIcon={<Plus size={16} />}>Assign Salary</Button>
          )}
        />
      ) : (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border">
              <CardTitle className="text-lg">Current Salary</CardTitle>
              {hasPermission('PAYROLL.EMPLOYEE_SALARY.REVISE') && (
                <Button variant="outline" size="sm" onClick={openReviseModal} leftIcon={<Edit2 size={14} />}>
                  Revise Salary
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                <div>
                  <p className="text-sm text-muted-foreground">Structure</p>
                  <p className="font-semibold">{currentSalary.salaryStructureId.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Effective From</p>
                  <p className="font-semibold">{new Date(currentSalary.effectiveFrom).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pay Frequency</p>
                  <p className="font-semibold">{currentSalary.payFrequency}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant="success">ACTIVE</Badge>
                </div>
              </div>

              <div className="bg-muted/20 p-4 rounded-lg border border-border">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Basic Salary</p>
                    <p className="text-xl font-bold">{currentSalary.basicSalary.toLocaleString()} {currentSalary.currency}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Allowances</p>
                    <p className="text-xl font-bold text-green-600">{(currentSalary.totalEarnings - currentSalary.basicSalary).toLocaleString()} {currentSalary.currency}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Deductions</p>
                    <p className="text-xl font-bold text-red-600">{currentSalary.totalDeductions.toLocaleString()} {currentSalary.currency}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Net Salary</p>
                    <p className="text-2xl font-black text-primary">{currentSalary.netSalary.toLocaleString()} {currentSalary.currency}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <h4 className="font-medium text-sm mb-3 text-muted-foreground">Salary Components Breakdown</h4>
                <div className="space-y-2">
                  {currentSalary.components.map((comp, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                      <div>
                        <span className="font-medium">{comp.nameSnapshot}</span>
                        <span className="text-xs ml-2 text-muted-foreground">({comp.typeSnapshot})</span>
                      </div>
                      <div className={`font-semibold ${comp.typeSnapshot === 'DEDUCTION' ? 'text-red-600' : 'text-green-600'}`}>
                        {comp.typeSnapshot === 'DEDUCTION' ? '-' : '+'}{comp.amount.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {salaryHistory.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><History size={18}/> Salary History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Effective Period</th>
                      <th className="px-4 py-3 font-semibold">Structure</th>
                      <th className="px-4 py-3 font-semibold">Basic</th>
                      <th className="px-4 py-3 font-semibold">Net</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {salaryHistory.map((hist) => (
                      <tr key={hist._id} className={hist.status === 'ACTIVE' ? 'bg-primary/5' : ''}>
                        <td className="px-4 py-3">
                          {new Date(hist.effectiveFrom).toLocaleDateString()} 
                          {hist.effectiveTo ? ` - ${new Date(hist.effectiveTo).toLocaleDateString()}` : ' - Present'}
                        </td>
                        <td className="px-4 py-3">{hist.salaryStructureId.name}</td>
                        <td className="px-4 py-3">{hist.basicSalary.toLocaleString()} {hist.currency}</td>
                        <td className="px-4 py-3 font-semibold">{hist.netSalary.toLocaleString()} {hist.currency}</td>
                        <td className="px-4 py-3">
                          <Badge variant={hist.status === 'ACTIVE' ? 'success' : 'secondary'}>{hist.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {payrollHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Banknote size={18}/> Processed Payroll History (Payslips)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Period</th>
                      <th className="px-4 py-3 font-semibold">Payslip No</th>
                      <th className="px-4 py-3 font-semibold">Gross</th>
                      <th className="px-4 py-3 font-semibold">Deductions</th>
                      <th className="px-4 py-3 font-semibold">Net</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payrollHistory.map((hist) => (
                      <tr key={hist._id}>
                        <td className="px-4 py-3">
                          <div className="font-semibold">{hist.payrollPeriodId?.name}</div>
                          <div className="text-xs text-muted-foreground">{new Date(hist.paymentDate).toLocaleDateString()}</div>
                        </td>
                        <td className="px-4 py-3 text-primary font-medium">{hist.payslipNumber}</td>
                        <td className="px-4 py-3">{hist.grossSalary.toLocaleString()} {hist.currency}</td>
                        <td className="px-4 py-3 text-red-600">{hist.totalDeductions.toLocaleString()} {hist.currency}</td>
                        <td className="px-4 py-3 font-bold text-green-600">{hist.netSalary.toLocaleString()} {hist.currency}</td>
                        <td className="px-4 py-3">
                          <Badge variant={hist.status === 'FINALIZED' ? 'success' : 'secondary'}>{hist.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                           <a href={`/payslips/${hist._id}`} target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium text-xs">View</a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Assign / Revise Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isRevise ? "Revise Salary" : "Assign Salary"}>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
          <FormField label="Salary Structure" required>
            <Select value={formData.salaryStructureId} onChange={(e) => handleStructureSelect(e.target.value)} required disabled={isRevise}>
              <option value="">Select structure...</option>
              {structures.map(s => (
                <option key={s._id} value={s._id}>{s.name} ({s.currency})</option>
              ))}
            </Select>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Effective From" required>
              <Input type="date" value={formData.effectiveFrom} onChange={e => setFormData({...formData, effectiveFrom: e.target.value})} required />
            </FormField>
            
            <FormField label="Basic Salary" required>
              <Input type="number" min="0" value={formData.basicSalary} onChange={handleBasicSalaryChange} required />
            </FormField>
          </div>

          {formData.components.length > 0 && (
            <div className="mt-4 p-4 border border-border rounded-lg bg-muted/10 space-y-3">
              <h4 className="font-semibold text-sm mb-2">Adjust Components</h4>
              {formData.components.map((comp, idx) => (
                <div key={idx} className="flex justify-between items-center gap-4">
                  <div className="flex-1">
                    <span className="text-sm font-medium">{comp.nameSnapshot}</span>
                    <span className="text-xs block text-muted-foreground">{comp.typeSnapshot} • {comp.calculationType}</span>
                  </div>
                  <div className="w-32">
                    <Input 
                      type="number" 
                      min="0" 
                      value={comp.amount} 
                      onChange={(e) => handleComponentAmountChange(idx, e.target.value)}
                      disabled={comp.calculationType === 'PERCENTAGE'}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {isRevise && (
            <FormField label="Reason for Revision" required>
              <Input value={formData.reasonForRevision} onChange={e => setFormData({...formData, reasonForRevision: e.target.value})} required placeholder="e.g. Annual Promotion" />
            </FormField>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">{isRevise ? 'Save Revision' : 'Assign Salary'}</Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default EmployeeSalaryTab;
