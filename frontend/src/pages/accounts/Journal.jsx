import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { SearchInput } from '../../components/ui/SearchInput';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { FormField } from '../../components/common/FormField';
import { EmptyState } from '../../components/common/EmptyState';

const Journal = () => {
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState('');
  
  // New Entry Form State
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [lines, setLines] = useState([
    { accountId: '', debit: '', credit: '', description: '' },
    { accountId: '', debit: '', credit: '', description: '' }
  ]);

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  useEffect(() => {
    fetchEntries();
    fetchAccounts();
  }, []);

  const fetchEntries = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/v1/journal', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setEntries(res.data);
    } catch (error) {
      console.error(error);
    }
  };

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
      await axios.post('http://localhost:5000/api/v1/journal', {
        description,
        reference,
        date,
        lines: lines.filter(l => l.accountId && (l.debit || l.credit))
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setIsCreating(false);
      setDescription('');
      setReference('');
      setDate(new Date().toISOString().split('T')[0]);
      setLines([
        { accountId: '', debit: '', credit: '', description: '' },
        { accountId: '', debit: '', credit: '', description: '' }
      ]);
      fetchEntries();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create journal entry');
    }
  };

  const handleAction = async (id, action) => {
    try {
      await axios.post(`http://localhost:5000/api/v1/journal/${id}/${action}`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchEntries();
    } catch (error) {
      alert(error.response?.data?.message || `Failed to ${action} journal entry`);
    }
  };

  const updateLine = (index, field, value) => {
    const newLines = [...lines];
    
    // If they type in debit, clear credit. If credit, clear debit.
    if (field === 'debit' && value) newLines[index].credit = '';
    if (field === 'credit' && value) newLines[index].debit = '';
    
    newLines[index][field] = value;
    setLines(newLines);
  };

  const addLine = () => setLines([...lines, { accountId: '', debit: '', credit: '', description: '' }]);
  const removeLine = (index) => setLines(lines.filter((_, i) => i !== index));

  const totalDebits = lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
  const totalCredits = lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.001 && totalDebits > 0;

  const filteredEntries = entries.filter(e => 
    e.description.toLowerCase().includes(search.toLowerCase()) || 
    (e.reference && e.reference.toLowerCase().includes(search.toLowerCase())) ||
    e._id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
      <div className="flex justify-between items-start mb-2">
        <PageHeader 
          title="General Journal"
          description="Record and view manual double-entry financial transactions."
          icon={<FileText className="text-blue-600 h-8 w-8" />}
        />
        {hasPermission('CREATE_ACCOUNTS') && (
          <Button onClick={() => setIsCreating(true)} size="lg" className="mt-2" leftIcon={<Plus size={18} />}>
            New Journal Entry
          </Button>
        )}
      </div>

      <div className="mb-6 w-full md:w-96">
        <SearchInput 
          placeholder="Search journal entries..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <Modal
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        title="Create Journal Entry"
        size="xl"
      >
        <form onSubmit={handleCreate} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Description / Memo" className="md:col-span-2">
              <Input 
                type="text" 
                required 
                placeholder="e.g. Initial Capital Investment" 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
              />
            </FormField>
            <FormField label="Date">
              <Input 
                type="date" 
                required 
                value={date} 
                onChange={e => setDate(e.target.value)} 
              />
            </FormField>
          </div>
          
          <div className="w-1/3">
            <FormField label="Reference # (Optional)">
              <Input 
                type="text" 
                placeholder="e.g. INV-1002" 
                value={reference} 
                onChange={e => setReference(e.target.value)} 
              />
            </FormField>
          </div>

          <div className="border border-border rounded-xl overflow-hidden bg-background">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-muted/30 border-b border-border">
                  <tr>
                    <th className="p-3 text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest min-w-[200px]">Account</th>
                    <th className="p-3 text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest min-w-[200px]">Line Description</th>
                    <th className="p-3 text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest w-32">Debit ($)</th>
                    <th className="p-3 text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest w-32">Credit ($)</th>
                    <th className="p-3 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => (
                    <tr key={index} className="border-b border-border bg-card">
                      <td className="p-2">
                        <Select 
                          required 
                          value={line.accountId} 
                          onChange={e => updateLine(index, 'accountId', e.target.value)}
                        >
                          <option value="">Select Account</option>
                          {accounts.map(a => <option key={a._id} value={a._id}>{a.code} - {a.name}</option>)}
                        </Select>
                      </td>
                      <td className="p-2">
                        <Input 
                          type="text" 
                          placeholder="Optional" 
                          value={line.description} 
                          onChange={e => updateLine(index, 'description', e.target.value)} 
                        />
                      </td>
                      <td className="p-2">
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01" 
                          className="font-bold"
                          value={line.debit} 
                          onChange={e => updateLine(index, 'debit', e.target.value)} 
                        />
                      </td>
                      <td className="p-2">
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01" 
                          className="font-bold"
                          value={line.credit} 
                          onChange={e => updateLine(index, 'credit', e.target.value)} 
                        />
                      </td>
                      <td className="p-2 text-center">
                        {lines.length > 2 && (
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => removeLine(index)} 
                            className="h-10 px-3 text-error hover:bg-error/10 hover:text-error border-error/50 shrink-0"
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/10">
                  <tr>
                    <td colSpan="2" className="p-3 text-right text-xs font-extrabold text-muted-foreground uppercase tracking-widest">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={addLine} 
                        className="float-left text-blue-600 border-blue-200 hover:bg-blue-50"
                        leftIcon={<Plus size={16} />}
                      >
                        Add Line
                      </Button>
                      <div className="flex items-center justify-end h-10">Totals:</div>
                    </td>
                    <td className={`p-3 font-extrabold text-sm align-middle ${totalDebits !== totalCredits ? 'text-error' : 'text-success'}`}>${totalDebits.toFixed(2)}</td>
                    <td className={`p-3 font-extrabold text-sm align-middle ${totalDebits !== totalCredits ? 'text-error' : 'text-success'}`}>${totalCredits.toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-border">
            <div className="text-sm font-bold">
              {!isBalanced ? (
                <span className="text-error bg-error/10 px-3 py-1.5 rounded-lg border border-error/20">Out of Balance! Difference: ${Math.abs(totalDebits - totalCredits).toFixed(2)}</span>
              ) : (
                <span className="text-success bg-success/10 px-3 py-1.5 rounded-lg border border-success/20">Balanced</span>
              )}
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!isBalanced}>
                Post Journal Entry
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      <div className="space-y-6">
        {filteredEntries.map(entry => (
          <Card key={entry._id} className="relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
            <div className="p-5 border-b border-border flex flex-col sm:flex-row justify-between items-start gap-4 bg-muted/30">
              <div>
                <h3 className="font-extrabold text-foreground text-lg">{entry.description}</h3>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <span>{format(new Date(entry.entryDate), 'MMM d, yyyy')}</span>
                  {entry.reference && (
                    <>
                      <span className="w-1 h-1 bg-border rounded-full"></span>
                      <span>Ref: {entry.reference}</span>
                    </>
                  )}
                  <span className="w-1 h-1 bg-border rounded-full"></span>
                  <span className="text-blue-600">JE-{entry._id.slice(-6).toUpperCase()}</span>
                  {entry.sourceModel && (
                    <>
                      <span className="w-1 h-1 bg-border rounded-full"></span>
                      <span className="text-emerald-600">Source: {entry.sourceModel}</span>
                    </>
                  )}
                  {entry.reversalOf && (
                    <>
                      <span className="w-1 h-1 bg-border rounded-full"></span>
                      <span className="text-amber-600">Reversal of: JE-{entry.reversalOf.slice(-6).toUpperCase()}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="sm:text-right flex flex-col items-end gap-2">
                <div className="font-extrabold text-foreground">${entry.totalAmount.toFixed(2)}</div>
                <div>
                  <Badge variant={entry.status === 'POSTED' ? 'success' : entry.status === 'VOIDED' ? 'destructive' : 'warning'} className="text-[10px] uppercase tracking-widest">{entry.status}</Badge>
                </div>
                <div className="flex gap-2 mt-2">
                  {entry.status === 'DRAFT' && hasPermission('CREATE_ACCOUNTS') && (
                    <Button size="sm" variant="outline" onClick={() => handleAction(entry._id, 'post')}>
                      Post
                    </Button>
                  )}
                  {entry.status === 'POSTED' && hasPermission('CREATE_ACCOUNTS') && !entry.reversalOf && (
                    <>
                      <Button size="sm" variant="outline" className="text-error border-error/50 hover:bg-error/10" onClick={() => handleAction(entry._id, 'void')}>
                        Void
                      </Button>
                      <Button size="sm" variant="outline" className="text-amber-600 border-amber-600/50 hover:bg-amber-600/10" onClick={() => handleAction(entry._id, 'reverse')}>
                        Reverse
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest bg-card">
                    <th className="px-5 py-3 w-1/2">Account</th>
                    <th className="px-5 py-3 text-right">Debit</th>
                    <th className="px-5 py-3 text-right">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.lines.map((line, idx) => (
                    <tr key={idx} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-5 py-3 font-medium text-foreground">
                        {line.accountId?.code} - {line.accountId?.name}
                        {line.description && <div className="text-xs text-muted-foreground mt-0.5">{line.description}</div>}
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-muted-foreground">{line.debit > 0 ? `$${line.debit.toFixed(2)}` : '-'}</td>
                      <td className="px-5 py-3 text-right font-bold text-muted-foreground">{line.credit > 0 ? `$${line.credit.toFixed(2)}` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ))}

        {filteredEntries.length === 0 && !isCreating && (
          <EmptyState 
            icon={FileText}
            title="No journal entries found"
            description="Create your first manual journal entry to start recording transactions."
          />
        )}
      </div>
    </div>
  );
};

export default Journal;
