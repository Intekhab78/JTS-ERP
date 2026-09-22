import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Target } from 'lucide-react';
import { Card, CardContent } from '../../../components/common/Card';
import { Button } from '../../../components/ui/Button';

const EmployeeLeaveBalanceTab = ({ employeeId, hasPermission }) => {
  const [balances, setBalances] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  
  useEffect(() => {
    const fetchBalances = async () => {
      try {
        const { data } = await axios.get(`/api/v1/hr/leave-balances?employeeId=${employeeId}&year=${year}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setBalances(data);
      } catch (error) {
        console.error('Failed to fetch balances', error);
      }
    };
    if (employeeId) fetchBalances();
  }, [employeeId, year]);

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800">
          <Target size={20} className="text-primary" /> Leave Balance
        </h3>
        <select 
          value={year} 
          onChange={e => setYear(Number(e.target.value))}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
          <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</option>
        </select>
      </div>

      {balances.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No balances found for {year}.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div className="text-foreground font-bold mt-1">Available</div>
                <div className="font-bold text-right text-primary text-lg mt-1">{bal.closingBalance}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default EmployeeLeaveBalanceTab;
