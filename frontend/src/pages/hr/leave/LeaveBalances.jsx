import React, { useState, useEffect } from 'react';
import { Target, Search } from 'lucide-react';
import axios from 'axios';
import { PageHeader } from '../../../components/common/PageHeader';
import { Card, CardContent } from '../../../components/common/Card';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';

const LeaveBalances = () => {
  const [employees, setEmployees] = useState([]);
  const [balances, setBalances] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployee && selectedYear) {
      fetchBalances(selectedEmployee, selectedYear);
    } else {
      setBalances([]);
    }
  }, [selectedEmployee, selectedYear]);

  const fetchEmployees = async () => {
    try {
      const { data } = await axios.get('http://localhost:5000/api/v1/hr/employees', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setEmployees(data);
    } catch (error) {
      console.error('Failed to fetch employees', error);
    }
  };

  const fetchBalances = async (employeeId, year) => {
    setIsLoading(true);
    try {
      const { data } = await axios.get(`http://localhost:5000/api/v1/hr/leave-balances?employeeId=${employeeId}&year=${year}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setBalances(data);
    } catch (error) {
      console.error('Failed to fetch leave balances', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
      <PageHeader 
        title={
          <div className="flex items-center gap-2">
            <Target className="text-primary h-8 w-8" /> 
            Leave Balances
          </div>
        }
        description="View and manage employee leave balances."
      />

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Select Employee</label>
              <Select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}>
                <option value="">-- Choose Employee --</option>
                {employees.map(emp => (
                  <option key={emp._id} value={emp._id}>
                    {emp.employeeCode} - {emp.firstName} {emp.lastName}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Year</label>
              <Input type="number" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} />
            </div>
          </div>

          {!selectedEmployee ? (
            <div className="text-center py-8 text-muted-foreground">
              Please select an employee to view their balances.
            </div>
          ) : isLoading ? (
            <div className="text-center py-8">Loading balances...</div>
          ) : balances.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No leave balances generated for this year. 
              (Tip: HR needs to assign Leave Types or run Accrual to generate them.)
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {balances.map(bal => (
                <div key={bal._id} className="border rounded-xl p-4 bg-muted/10">
                  <h4 className="font-bold text-foreground mb-1 flex justify-between">
                    {bal.leaveTypeId?.name}
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{bal.leaveTypeId?.unit}</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-y-2 text-sm mt-3">
                    <div className="text-muted-foreground">Opening</div>
                    <div className="font-semibold text-right">{bal.openingBalance}</div>
                    <div className="text-muted-foreground">Accrued</div>
                    <div className="font-semibold text-right text-green-600">+{bal.accrued}</div>
                    <div className="text-muted-foreground">Used</div>
                    <div className="font-semibold text-right text-red-500">-{bal.used}</div>
                    <div className="text-muted-foreground border-b pb-1">Pending</div>
                    <div className="font-semibold text-right text-amber-500 border-b pb-1">{bal.pending}</div>
                    <div className="text-foreground font-bold mt-1">Available</div>
                    <div className="font-bold text-right text-primary text-lg mt-1">{bal.closingBalance}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaveBalances;
