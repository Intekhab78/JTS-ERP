import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/common/Card';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/common/EmptyState';
import { CardSkeleton } from '../../../components/common/CardSkeleton';
import { Banknote } from 'lucide-react';

const PayrollRecords = ({ periodId, periodStatus, hasPermission }) => {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (periodId && hasPermission('PAYROLL.RECORD.VIEW')) {
      fetchRecords();
    } else {
      setIsLoading(false);
    }
  }, [periodId]);

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get(`http://localhost:5000/api/v1/hr/payroll-periods/${periodId}/records`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setRecords(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasPermission('PAYROLL.RECORD.VIEW')) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          You do not have permission to view individual payroll records.
        </CardContent>
      </Card>
    );
  }

  if (isLoading) return <CardSkeleton />;

  if (records.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState 
            icon={<Banknote className="h-10 w-10 opacity-70" />}
            title="No records generated yet"
            description="Open the period and calculate payroll to generate records."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payroll Ledger</CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Employee</th>
              <th className="px-4 py-3 font-semibold">Working Days</th>
              <th className="px-4 py-3 font-semibold text-right">Gross Salary</th>
              <th className="px-4 py-3 font-semibold text-right text-red-600">Deductions</th>
              <th className="px-4 py-3 font-semibold text-right text-green-600">Net Salary</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {records.map(record => (
              <tr key={record._id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-bold">{record.employeeId?.firstName} {record.employeeId?.lastName}</div>
                  <div className="text-muted-foreground text-xs">{record.employeeId?.employeeCode}</div>
                </td>
                <td className="px-4 py-3">{record.presentDays} / {record.workingDays}</td>
                <td className="px-4 py-3 text-right font-medium">{record.grossSalary.toLocaleString()} {record.currency}</td>
                <td className="px-4 py-3 text-right text-red-600">{record.totalDeductions.toLocaleString()} {record.currency}</td>
                <td className="px-4 py-3 text-right text-green-600 font-bold">{record.netSalary.toLocaleString()} {record.currency}</td>
                <td className="px-4 py-3">
                  <Badge variant={record.status === 'APPROVED' ? 'success' : 'secondary'}>{record.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};

export default PayrollRecords;
