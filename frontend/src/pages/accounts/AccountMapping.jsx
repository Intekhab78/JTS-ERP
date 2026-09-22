import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BookOpen } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';

const SYSTEM_KEYS = [
  'INVENTORY',
  'GRNI',
  'ACCOUNTS_PAYABLE',
  'ACCOUNTS_RECEIVABLE',
  'SALES_REVENUE',
  'COGS',
  'TAX_PAYABLE',
  'CASH',
  'BANK',
  'INVENTORY_ADJUSTMENT',
  'WIP',
  'FINISHED_GOODS'
];

const AccountMapping = () => {
  const [accounts, setAccounts] = useState([]);
  const [mappings, setMappings] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAccounts();
    fetchMappings();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await axios.get('/api/v1/accounts', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAccounts(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchMappings = async () => {
    try {
      const res = await axios.get('/api/v1/account-mappings', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const mappingDict = {};
      res.data.forEach(m => {
        mappingDict[m.key] = m;
      });
      setMappings(mappingDict);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSave = async (key, accountId) => {
    if (!accountId) return;
    try {
      setLoading(true);
      await axios.post('/api/v1/account-mappings', { key, accountId }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      await fetchMappings();
      alert('Mapping saved successfully');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save mapping');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
      <PageHeader 
        title="Account Mappings"
        description="Map system operations to specific accounts in your Chart of Accounts."
        icon={<BookOpen className="text-blue-600 h-8 w-8" />}
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="p-4 font-bold text-muted-foreground uppercase tracking-widest text-xs w-1/3">System Key</th>
                <th className="p-4 font-bold text-muted-foreground uppercase tracking-widest text-xs w-1/3">Mapped Account</th>
                <th className="p-4 font-bold text-muted-foreground uppercase tracking-widest text-xs w-1/3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {SYSTEM_KEYS.map((key) => {
                const currentMapping = mappings[key];
                return (
                  <tr key={key} className="border-b border-border bg-card hover:bg-muted/30">
                    <td className="p-4 font-bold text-foreground">{key}</td>
                    <td className="p-4">
                      <Select 
                        value={currentMapping?.accountId?._id || currentMapping?.accountId || ''} 
                        onChange={(e) => {
                          const newMappings = { ...mappings };
                          newMappings[key] = { ...currentMapping, accountId: e.target.value };
                          setMappings(newMappings);
                        }}
                      >
                        <option value="">-- Select Account --</option>
                        {accounts.filter(a => a.isActive).map(a => (
                          <option key={a._id} value={a._id}>{a.code} - {a.name}</option>
                        ))}
                      </Select>
                      {currentMapping && !currentMapping?.accountId && (
                        <div className="mt-2">
                           <Badge variant="destructive">Unmapped</Badge>
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <Button 
                        onClick={() => handleSave(key, mappings[key]?.accountId?._id || mappings[key]?.accountId)}
                        disabled={loading || !mappings[key]?.accountId}
                      >
                        Save
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default AccountMapping;
