import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { BookOpen, Plus } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { SearchInput } from '../../components/ui/SearchInput';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { FormField } from '../../components/common/FormField';

const ACCOUNT_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];

const Accounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState('');
  
  const [formData, setFormData] = useState({ code: '', name: '', type: 'ASSET', description: '' });

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/v1/accounts', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAccounts(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/v1/accounts', formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setIsCreating(false);
      setFormData({ code: '', name: '', type: 'ASSET', description: '' });
      fetchAccounts();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create account');
    }
  };

  const filteredAccounts = accounts.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) || 
    a.code.toLowerCase().includes(search.toLowerCase()) ||
    a.type.toLowerCase().includes(search.toLowerCase())
  );

  const getAccountBadge = (type) => {
    switch (type) {
      case 'ASSET':
        return <Badge variant="success">ASSET</Badge>;
      case 'LIABILITY':
        return <Badge variant="destructive">LIABILITY</Badge>;
      case 'EQUITY':
        return <Badge className="bg-purple-100 text-purple-700 border-purple-200">EQUITY</Badge>;
      case 'REVENUE':
        return <Badge variant="info">REVENUE</Badge>;
      case 'EXPENSE':
      default:
        return <Badge variant="warning">EXPENSE</Badge>;
    }
  };

  const columns = useMemo(() => [
    {
      header: 'Code',
      accessorKey: 'code',
      cell: (account) => <span className="font-extrabold text-blue-600">{account.code}</span>
    },
    {
      header: 'Name',
      accessorKey: 'name',
      cell: (account) => <span className="font-bold text-foreground">{account.name}</span>
    },
    {
      header: 'Type',
      accessorKey: 'type',
      cell: (account) => getAccountBadge(account.type)
    },
    {
      header: 'Status',
      accessorKey: 'isActive',
      cell: (account) => (
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${account.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
          <span className={`text-xs font-bold uppercase tracking-wider ${account.isActive ? 'text-emerald-700' : 'text-slate-500'}`}>
            {account.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      )
    }
  ], []);

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
      <div className="flex justify-between items-start mb-2">
        <PageHeader 
          title="Chart of Accounts"
          description="Manage the core financial buckets for double-entry bookkeeping."
          icon={<BookOpen className="text-blue-600 h-8 w-8" />}
        />
        {hasPermission('CREATE_ACCOUNTS') && (
          <Button onClick={() => setIsCreating(true)} size="lg" className="mt-2" leftIcon={<Plus size={18} />}>
            New Account
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30">
          <SearchInput 
            placeholder="Search accounts by code, name, or type..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <DataTable 
          columns={columns}
          data={filteredAccounts}
          searchQuery=""
          emptyMessage="No accounts found. Create your Chart of Accounts to get started."
        />
      </Card>

      <Modal
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        title="Create New Account"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FormField label="Account Code" className="lg:col-span-1">
              <Input 
                type="text" 
                required 
                placeholder="e.g. 1000" 
                value={formData.code} 
                onChange={e => setFormData({...formData, code: e.target.value})} 
              />
            </FormField>
            
            <FormField label="Account Name" className="lg:col-span-2">
              <Input 
                type="text" 
                required 
                placeholder="e.g. Cash in Bank" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
              />
            </FormField>
            
            <FormField label="Type" className="lg:col-span-1">
              <Select 
                required 
                value={formData.type} 
                onChange={e => setFormData({...formData, type: e.target.value})}
              >
                {ACCOUNT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
              </Select>
            </FormField>
            
            <FormField label="Description (Optional)" className="lg:col-span-4">
              <Input 
                type="text" 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})} 
              />
            </FormField>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Save Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Accounts;
