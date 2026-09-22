import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Plus, Edit2, Trash2, X, Search } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { FormField } from '../../components/common/FormField';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Checkbox } from '../../components/ui/Checkbox';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { Badge } from '../../components/ui/Badge';
import { CardSkeleton } from '../../components/common/CardSkeleton';

import { ERP_MODULES, ACTIONS, getAllPermissionModules } from '../../config/modules.jsx';

const RoleManagement = () => {
  const [roles, setRoles] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({ name: '', description: '', permissions: [], tenantId: '' });
  const [selectedCompany, setSelectedCompany] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = user.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  const fetchRoles = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get('/api/v1/roles', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setRoles(data);
    } catch (error) {
      console.error('Failed to fetch roles', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleTogglePermission = (moduleId, actionId) => {
    const permString = `${actionId}_${moduleId}`;
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permString)
        ? prev.permissions.filter(p => p !== permString)
        : [...prev.permissions, permString]
    }));
  };

  const handleToggleModuleFullAccess = (moduleId) => {
    const modulePerms = ACTIONS.map(a => `${a.id}_${moduleId}`);
    const hasAll = modulePerms.every(p => formData.permissions.includes(p));
    
    setFormData(prev => {
      let newPerms = [...prev.permissions];
      if (hasAll) {
        newPerms = newPerms.filter(p => !modulePerms.includes(p));
      } else {
        modulePerms.forEach(p => {
          if (!newPerms.includes(p)) newPerms.push(p);
        });
      }
      return { ...prev, permissions: newPerms };
    });
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`/api/v1/roles/${editingId}`, formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      } else {
        await axios.post('/api/v1/roles', formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      }
      setIsCreating(false);
      setEditingId(null);
      setFormData({ name: '', description: '', permissions: [], tenantId: '' });
      fetchRoles();
    } catch (error) {
      alert(error.response?.data?.message || `Failed to ${editingId ? 'update' : 'create'} role`);
    }
  };

  const handleEdit = (role) => {
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions || [],
      tenantId: role.tenantId?._id || role.tenantId || ''
    });
    setEditingId(role._id);
    setIsCreating(true);
  };

  const handleDelete = async (roleId) => {
    if (!window.confirm('Are you sure you want to delete this role?')) return;
    
    try {
      await axios.delete(`/api/v1/roles/${roleId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchRoles();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete role');
    }
  };

  const uniqueCompaniesMap = roles.reduce((acc, role) => {
    if (role.tenantId && role.tenantId._id) {
      acc[role.tenantId._id] = role.tenantId.name;
    }
    return acc;
  }, {});
  
  const uniqueCompanies = Object.entries(uniqueCompaniesMap).map(([id, name]) => ({ id, name }));

  const filteredRoles = roles.filter(r => {
    const matchesCompany = selectedCompany ? r.tenantId && r.tenantId._id === selectedCompany : true;
    const matchesSearch = searchTerm ? (r.name || '').toLowerCase().includes(searchTerm.toLowerCase()) : true;
    return matchesCompany && matchesSearch;
  });

  // Sort roles: custom roles first, then newest first
  const sortedRoles = [...filteredRoles].sort((a, b) => {
    if (a.isSystem && !b.isSystem) return 1;
    if (!a.isSystem && b.isSystem) return -1;
    
    // Then sort alphabetically by company name
    const compA = a.tenantId?.name || '';
    const compB = b.tenantId?.name || '';
    if (compA !== compB) return compA.localeCompare(compB);
    
    return 0;
  });

  // Helper to render visual dots for a role's permissions
  const renderPermissionDots = (rolePerms) => {
    // Group permissions by module using the flat list
    const allModules = getAllPermissionModules();
    const grouped = allModules.map(mod => {
      const modulePerms = ACTIONS.map(a => {
        const has = rolePerms.includes('*') || rolePerms.includes(`${a.id}_${mod.id}`);
        // Support legacy permissions temporarily for display
        const legacyHas = a.id === 'VIEW' && rolePerms.includes(`VIEW_${mod.id}`) || 
                          (a.id !== 'VIEW' && rolePerms.includes(`MANAGE_${mod.id}`));
        return { action: a, has: has || legacyHas };
      });
      return { module: mod, perms: modulePerms };
    }).filter(g => g.perms.some(p => p.has));

    const posOverrides = [
      { id: 'OVERRIDE_SESSION_VARIANCE', label: 'Variance', color: 'bg-amber-500' },
      { id: 'OVERRIDE_POS_DISCOUNT', label: 'Discount', color: 'bg-amber-500' },
      { id: 'OVERRIDE_POS_PRICE', label: 'Price', color: 'bg-amber-500' },
      { id: 'VOID_POS_ORDER', label: 'Void', color: 'bg-amber-500' },
      { id: 'OVERRIDE_POS_RETURN', label: 'Return', color: 'bg-amber-500' },
      { id: 'OPEN_CASH_DRAWER', label: 'Drawer', color: 'bg-amber-500' }
    ];
    
    const posOverridePerms = posOverrides.map(a => {
      const has = rolePerms.includes('*') || rolePerms.includes(a.id);
      return { action: a, has };
    });

    if (posOverridePerms.some(p => p.has)) {
      grouped.push({
        module: { id: 'POS_OVERRIDES', name: 'POS Overrides' },
        perms: posOverridePerms
      });
    }

    if (grouped.length === 0) return <span className="text-xs text-muted-foreground mt-2 block">No permissions assigned</span>;

    return (
      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
        {grouped.map(g => (
          <div key={g.module.id} className="flex items-center gap-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mr-1">
              {g.module.name}
            </span>
            <div className="flex gap-0.5">
              {g.perms.map(p => (
                <div 
                  key={p.action.id} 
                  title={`${p.action.label} ${g.module.name}`}
                  className={`w-2 h-2 rounded-full ${p.has ? p.action.color : 'bg-muted'}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
      <PageHeader 
        title={
          <div className="flex items-center gap-2">
            <Shield className="text-primary h-8 w-8" /> 
            Role Master
          </div>
        }
        description="Create custom roles and define specific access permissions across the ERP."
        actions={
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <Search size={16} />
              </div>
              <Input
                type="text"
                placeholder="Search roles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            {uniqueCompanies.length > 0 && (
              <Select 
                value={selectedCompany} 
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-48"
              >
                <option value="">All Companies</option>
                {uniqueCompanies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            )}
            {hasPermission('CREATE_ROLES') && !isCreating && !editingId && (
              <Button onClick={() => {
                setEditingId(null);
                setFormData({ name: '', description: '', permissions: [], tenantId: '' });
                setIsCreating(true);
              }} leftIcon={<Plus size={18} />}>
                New Role
              </Button>
            )}
          </div>
        }
      />

      <div className="flex flex-col gap-6">
        {isLoading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : sortedRoles.map(role => (
          <Card key={role._id} className="relative group overflow-hidden bg-white shadow-sm hover:shadow-md transition-all border border-slate-200 rounded-xl flex flex-col h-full">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/80"></div>
                <CardHeader className="pb-3 border-b border-slate-50 bg-slate-50/50">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg font-bold text-slate-800 tracking-tight">{role.name}</CardTitle>
                        {role.isSystem && <Badge variant="secondary" className="text-[9px] h-4 px-1.5 font-bold uppercase tracking-wider bg-blue-100 text-blue-700">System Role</Badge>}
                        {!role.isSystem && role.tenantId && role.tenantId.name && (
                           <Badge variant="outline" className="text-[9px] h-4 px-1.5 font-bold uppercase tracking-wider text-emerald-600 border-emerald-200 bg-emerald-50">Active</Badge>
                        )}
                      </div>
                      {role.tenantId && role.tenantId.name && (
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">{role.tenantId.name}</span>
                      )}
                    </div>
                    {!role.isSystem && (
                      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {hasPermission('EDIT_ROLES') && (
                          <button 
                            type="button"
                            onClick={() => handleEdit(role)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 bg-white border border-slate-200 hover:border-amber-200 hover:bg-amber-50 rounded-md transition-all shadow-sm"
                            title="Edit Role"
                          >
                            <Edit2 size={13} />
                          </button>
                        )}
                        {hasPermission('DELETE_ROLES') && (
                          <button 
                            type="button"
                            onClick={() => handleDelete(role._id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 bg-white border border-slate-200 hover:border-red-200 hover:bg-red-50 rounded-md transition-all shadow-sm"
                            title="Delete Role"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-3 flex-1 flex flex-col">
                  <p className="text-[10px] text-slate-500 mb-4 font-bold uppercase tracking-wide">
                    {role.description || 'No description provided'}
                  </p>
                  
                  <div className="mt-auto pt-2 border-t border-slate-100/50">
                    {renderPermissionDots(role.permissions)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
      <Modal
        isOpen={isCreating || editingId}
        onClose={() => {
          setIsCreating(false);
          setEditingId(null);
        }}
        title={editingId ? "Edit Role" : "Create New Role"}
        size="md"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => {
              setIsCreating(false);
              setEditingId(null);
            }}>
              Cancel
            </Button>
            <Button type="submit" form="role-form">
              {editingId ? 'Update Role' : 'Save Role'}
            </Button>
          </>
        }
      >
        <form id="role-form" onSubmit={handleCreateOrUpdate} className="flex flex-col h-full">
          <div className="flex-1 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Role Name" required>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Store Incharge" />
              </FormField>
              <FormField label="Description">
                <Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="What can this role do?" />
              </FormField>
            </div>

            {uniqueCompanies.length > 0 && (
              <FormField label="Assign Company" required>
                <Select required value={formData.tenantId} onChange={e => setFormData({...formData, tenantId: e.target.value})}>
                  <option value="" disabled>Select a Company</option>
                  {uniqueCompanies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </FormField>
            )}
            
            <div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Granular Permissions</h3>
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {ERP_MODULES.map(parentMod => {
                  if (!parentMod.isParent) {
                    return (
                      <div key={parentMod.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm">
                         <div className="text-xs font-bold text-slate-800 uppercase mb-3 flex items-center gap-2">
                           {parentMod.icon} {parentMod.name}
                         </div>
                         <div className="flex flex-wrap gap-2">
                           {ACTIONS.map(a => {
                              const permId = `${a.id}_${parentMod.id}`;
                              const isChecked = formData.permissions.includes(permId);
                              return (
                                <button type="button" key={a.id} onClick={() => handleTogglePermission(parentMod.id, a.id)}
                                        className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-colors ${isChecked ? 'bg-primary text-primary-foreground border-primary' : 'bg-white text-slate-500 border-slate-200 hover:border-primary'}`}>
                                  {a.label}
                                </button>
                              )
                           })}
                         </div>
                      </div>
                    )
                  }

                  return (
                    <div key={parentMod.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                       <div className="bg-slate-50/80 px-4 py-3 text-xs font-bold text-slate-800 uppercase border-b border-slate-200 flex items-center gap-2">
                         {parentMod.icon} {parentMod.name}
                       </div>
                       <div className="p-4 space-y-5">
                         {parentMod.subModules.map(subMod => {
                           if (subMod.children) {
                             return (
                               <div key={subMod.id} className="space-y-3">
                                 <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b pb-1">{subMod.name}</div>
                                 <div className="pl-3 space-y-4 border-l-2 border-slate-100">
                                   {subMod.children.map(child => (
                                     <div key={child.id}>
                                       <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">{child.name}</div>
                                       <div className="flex flex-wrap gap-2">
                                         {ACTIONS.map(a => {
                                            const permId = `${a.id}_${child.id}`;
                                            const isChecked = formData.permissions.includes(permId);
                                            return (
                                              <button type="button" key={a.id} onClick={() => handleTogglePermission(child.id, a.id)}
                                                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-colors ${isChecked ? 'bg-primary text-primary-foreground border-primary' : 'bg-white text-slate-500 border-slate-200 hover:border-primary'}`}>
                                                {a.label}
                                              </button>
                                            )
                                         })}
                                       </div>
                                     </div>
                                   ))}
                                 </div>
                               </div>
                             )
                           }

                           return (
                             <div key={subMod.id}>
                               <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">{subMod.name}</div>
                               <div className="flex flex-wrap gap-2">
                                 {ACTIONS.map(a => {
                                    const permId = `${a.id}_${subMod.id}`;
                                    const isChecked = formData.permissions.includes(permId);
                                    return (
                                      <button type="button" key={a.id} onClick={() => handleTogglePermission(subMod.id, a.id)}
                                              className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-colors ${isChecked ? 'bg-primary text-primary-foreground border-primary' : 'bg-white text-slate-500 border-slate-200 hover:border-primary'}`}>
                                        {a.label}
                                      </button>
                                    )
                                 })}
                               </div>
                             </div>
                           )
                         })}
                       </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Shield size={12} /> POS Specific Overrides
              </h3>
              <div className="bg-amber-50/50 border border-amber-100 rounded-xl overflow-hidden shadow-sm p-4">
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'OVERRIDE_SESSION_VARIANCE', label: 'Cash Variance Override' },
                    { id: 'OVERRIDE_POS_DISCOUNT', label: 'Discount Override' },
                    { id: 'OVERRIDE_POS_PRICE', label: 'Price Override' },
                    { id: 'VOID_POS_ORDER', label: 'Void Order' },
                    { id: 'OVERRIDE_POS_RETURN', label: 'Return Override' },
                    { id: 'OPEN_CASH_DRAWER', label: 'Open Drawer' }
                  ].map(action => {
                    const isChecked = formData.permissions.includes(action.id);
                    return (
                      <button type="button" key={action.id} 
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  permissions: prev.permissions.includes(action.id)
                                    ? prev.permissions.filter(p => p !== action.id)
                                    : [...prev.permissions, action.id]
                                }));
                              }}
                              className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-colors ${isChecked ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-amber-400 hover:text-amber-600'}`}>
                        {action.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default RoleManagement;

