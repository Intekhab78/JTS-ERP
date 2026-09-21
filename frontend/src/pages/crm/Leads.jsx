import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Target, Plus, Phone, Mail, Building, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/ui/Button';
import { Drawer } from '../../components/common/Drawer';
import { FormField } from '../../components/common/FormField';
import { Input } from '../../components/ui/Input';

const PIPELINE_STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'LOST'];

const Leads = () => {
  const [leads, setLeads] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({ name: '', company: '', email: '', phone: '', status: 'NEW', notes: '' });

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/v1/crm/leads', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setLeads(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await axios.post('http://localhost:5000/api/v1/crm/leads', formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setIsCreating(false);
      setFormData({ name: '', company: '', email: '', phone: '', status: 'NEW', notes: '' });
      fetchLeads();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateLeadStatus = async (id, newStatus) => {
    try {
      await axios.put(`http://localhost:5000/api/v1/crm/leads/${id}`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchLeads();
    } catch (error) {
      alert('Failed to update status');
    }
  };

  // Group leads by status for Kanban board
  const kanbanBoard = PIPELINE_STAGES.map(stage => ({
    id: stage,
    title: stage,
    leads: leads.filter(l => l.status === stage)
  }));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader 
        title="Sales Pipeline"
        description="Track potential customers through the sales process."
        icon={Target}
        action={
          hasPermission('CREATE_CRM') && (
            <Button onClick={() => setIsCreating(true)} className="gap-2">
              <Plus size={18} /> Add Lead
            </Button>
          )
        }
      />

      {/* Kanban Board */}
      <div className="flex gap-6 overflow-x-auto pb-4 h-[calc(100vh-280px)] custom-scrollbar">
        {kanbanBoard.map(column => (
          <div key={column.id} className="min-w-[320px] w-[320px] flex flex-col bg-slate-100 rounded-2xl p-4 border border-slate-200 shadow-inner">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-extrabold text-slate-700 text-sm tracking-wide">{column.title}</h3>
              <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full">{column.leads.length}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
              {column.leads.map(lead => (
                <div key={lead._id} className="bg-card text-card-foreground p-4 rounded-xl shadow-sm border border-border cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group relative">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary/80 rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <h4 className="font-bold text-sm leading-tight">{lead.name}</h4>
                  {lead.company && (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground mt-1.5">
                      <Building size={12} /> {lead.company}
                    </div>
                  )}
                  
                  <div className="mt-3 space-y-1.5">
                    {lead.email && <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium"><Mail size={12} /> <span className="truncate">{lead.email}</span></div>}
                    {lead.phone && <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium"><Phone size={12} /> {lead.phone}</div>}
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex justify-between items-center">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      <Clock size={10} /> {format(new Date(lead.createdAt), 'MMM d')}
                    </div>
                    
                    {/* Quick move actions */}
                    {hasPermission('EDIT_CRM') && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity scale-95 group-hover:scale-100">
                        {PIPELINE_STAGES.map(stage => (
                          stage !== lead.status && (
                            <button
                              key={stage}
                              onClick={(e) => { e.stopPropagation(); updateLeadStatus(lead._id, stage); }}
                              title={`Move to ${stage}`}
                              className="w-5 h-5 rounded-md bg-muted hover:bg-primary hover:text-primary-foreground flex items-center justify-center text-[9px] font-black text-muted-foreground transition-colors"
                            >
                              {stage[0]}
                            </button>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {column.leads.length === 0 && (
                <div className="h-24 border-2 border-dashed border-border rounded-xl flex items-center justify-center text-xs font-bold text-muted-foreground bg-muted/20">
                  Drop leads here
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Drawer
        isOpen={isCreating}
        onClose={() => !isSubmitting && setIsCreating(false)}
        title="Create New Lead"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <FormField label="Contact Name" required>
            <Input 
              required
              placeholder="Full name of contact"
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})}
              disabled={isSubmitting}
            />
          </FormField>
          
          <FormField label="Company">
            <Input 
              placeholder="Company name"
              value={formData.company} 
              onChange={e => setFormData({...formData, company: e.target.value})}
              disabled={isSubmitting}
            />
          </FormField>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Email">
              <Input 
                type="email"
                placeholder="email@example.com"
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})}
                disabled={isSubmitting}
              />
            </FormField>
            
            <FormField label="Phone Number">
              <Input 
                placeholder="+1 555-0000"
                value={formData.phone} 
                onChange={e => setFormData({...formData, phone: e.target.value})}
                disabled={isSubmitting}
              />
            </FormField>
          </div>
          
          <FormField label="Initial Notes / Requirements">
            <Input 
              placeholder="What are they interested in?"
              value={formData.notes} 
              onChange={e => setFormData({...formData, notes: e.target.value})}
              disabled={isSubmitting}
            />
          </FormField>
          
          <div className="pt-6 mt-6 border-t border-border flex justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsCreating(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Lead'}
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
};

export default Leads;
