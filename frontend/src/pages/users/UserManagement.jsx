import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, UserPlus, Trash2, Lock } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { FormField } from '../../components/common/FormField';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import ReactSelect from 'react-select';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isInviting, setIsInviting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({ 
    firstName: '', 
    lastName: '', 
    email: '', 
    password: '', 
    roleId: '', 
    branches: [], 
    employeeId: '',
    portalAccess: 'NO ACCESS',
    isActive: true
  });
  
  const [editUserId, setEditUserId] = useState(null);
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const [posPinModalOpen, setPosPinModalOpen] = useState(false);
  const [posPinValue, setPosPinValue] = useState('');
  const [selectedUserIdForPin, setSelectedUserIdForPin] = useState(null);

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get('/api/v1/users', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const { data } = await axios.get('/api/v1/roles', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setRoles(data);
    } catch (error) {
      console.error('Failed to fetch roles', error);
    }
  };

  const fetchBranches = async () => {
    try {
      const { data } = await axios.get('/api/v1/branches', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setBranches(data);
    } catch (error) {
      console.error('Failed to fetch branches', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data } = await axios.get('/api/v1/hr/employees', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      // Filter out employees already linked to a user (if possible on frontend)
      const unlinked = data.filter(e => !e.userId);
      setEmployees(unlinked);
    } catch (error) {
      console.error('Failed to fetch employees', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchBranches();
    fetchEmployees();
  }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    try {
      if (editUserId) {
        // Exclude password if empty during edit, though our backend ignores it for update anyway right now
        await axios.put(`/api/v1/users/${editUserId}`, formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      } else {
        await axios.post('/api/v1/users', formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      }
      setIsInviting(false);
      setEditUserId(null);
      setFormData({ 
        firstName: '', lastName: '', email: '', password: '', 
        roleId: '', branches: [], employeeId: '', portalAccess: 'NO ACCESS', isActive: true
      });
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.message || `Failed to ${editUserId ? 'update' : 'create'} user`);
    }
  };

  const openEditDrawer = (user) => {
    setEditUserId(user._id);
    setFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      password: '', // blank password when editing
      roleId: user.roleId?._id || '',
      branches: user.branches?.map(b => b._id) || [],
      employeeId: user.employeeId?._id || '',
      portalAccess: user.portalAccess || 'NO ACCESS',
      isActive: user.isActive !== false
    });
    setIsInviting(true);
  };

  const openInviteDrawer = () => {
    setEditUserId(null);
    setFormData({ 
      firstName: '', lastName: '', email: '', password: '', 
      roleId: '', branches: [], employeeId: '', portalAccess: 'NO ACCESS', isActive: true
    });
    setIsInviting(true);
  };

  const promptDelete = (id) => {
    setUserToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    try {
      await axios.delete(`/api/v1/users/${userToDelete}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error) {
      alert('Failed to delete user');
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
    }
  };

  const handleSetPosPin = async () => {
    if (!posPinValue || posPinValue.length < 4 || posPinValue.length > 6) {
      alert('PIN must be between 4 and 6 characters.');
      return;
    }
    try {
      await axios.post('/api/v1/auth/set-pos-pin', {
        userId: selectedUserIdForPin,
        posPin: posPinValue
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPosPinModalOpen(false);
      setPosPinValue('');
      setSelectedUserIdForPin(null);
      alert('POS PIN updated successfully');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update POS PIN');
    }
  };

  const columns = [
    {
      header: 'Name',
      accessorKey: 'firstName',
      cell: (row) => <span className="font-bold text-foreground">{row.firstName} {row.lastName}</span>
    },
    {
      header: 'Email',
      accessorKey: 'email',
      cell: (row) => <span className="text-muted-foreground font-medium">{row.email}</span>
    },
    {
      header: 'Company',
      accessorKey: 'tenantId',
      cell: (row) => <span className="text-muted-foreground font-medium">{row.tenantId?.name || 'Platform'}</span>
    },
    {
      header: 'Role',
      accessorKey: 'roleId',
      cell: (row) => (
        <Badge variant="secondary" className="uppercase tracking-wider">
          {row.roleId?.name || (row.tenantId ? 'Tenant User' : 'Super Admin')}
        </Badge>
      )
    },
    {
      header: 'Branches',
      accessorKey: 'branches',
      cell: (row) => (
        <Badge variant="outline" className="uppercase tracking-wider">
          {row.branches?.length > 0 ? `${row.branches.length} Branches` : 'All Branches'}
        </Badge>
      )
    },
    {
      header: 'Linked Employee',
      accessorKey: 'employeeId',
      cell: (row) => (
        row.employeeId 
          ? <span className="text-sm font-medium">{row.employeeId.employeeCode} - {row.employeeId.firstName} {row.employeeId.lastName}</span>
          : <span className="text-muted-foreground text-sm italic">Not Linked</span>
      )
    },
    {
      header: 'Portal Access',
      accessorKey: 'portalAccess',
      cell: (row) => (
        <Badge variant={row.portalAccess === 'NO ACCESS' ? 'neutral' : 'success'}>
          {row.portalAccess || 'NO ACCESS'}
        </Badge>
      )
    },
    {
      header: 'Status',
      accessorKey: 'isActive',
      cell: (row) => (
        <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider">
          <div className={`w-2 h-2 rounded-full ${row.isActive ? 'bg-success' : 'bg-error'}`}></div>
          <span className={row.isActive ? 'text-success' : 'text-error'}>
            {row.isActive ? 'Active' : 'Disabled'}
          </span>
        </div>
      )
    },
    {
      header: 'Actions',
      accessorKey: 'actions',
      className: 'text-right',
      cell: (row) => (
        <div className="flex justify-end gap-2">
          {hasPermission('EDIT_USERS') && (
            <>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedUserIdForPin(row._id);
                  setPosPinValue('');
                  setPosPinModalOpen(true);
                }}
                className="text-amber-600 hover:bg-amber-50 font-bold text-xs"
                title="Set POS PIN"
              >
                <Lock size={14} className="mr-1.5" />
                Set POS PIN
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  openEditDrawer(row);
                }}
                className="text-primary hover:bg-primary/10"
              >
                Edit
              </Button>
            </>
          )}
          {hasPermission('DELETE_USERS') && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => {
                e.stopPropagation();
                promptDelete(row._id);
              }} 
              className="text-error hover:text-error hover:bg-error/10"
              aria-label="Delete user"
            >
              <Trash2 size={16} />
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
      <PageHeader 
        title={
          <div className="flex items-center gap-2">
            <Users className="text-primary h-8 w-8" /> 
            User Management
          </div>
        }
        description="Manage your team members, assign them roles, and allocate branches."
        actions={
          hasPermission('CREATE_USERS') && (
            <Button onClick={openInviteDrawer} leftIcon={<UserPlus size={18} />}>
              Invite User
            </Button>
          )
        }
      />

      <DataTable 
        columns={columns} 
        data={users} 
        isLoading={isLoading}
        emptyTitle="No users found."
        emptyDescription="Get started by inviting a new team member."
      />

      <Modal
        isOpen={isInviting}
        onClose={() => setIsInviting(false)}
        title={editUserId ? "Edit User Details" : "Invite New User"}
        size="lg"
      >
        <form onSubmit={handleInvite} className="flex flex-col">
          <div className="space-y-4">

            {/* ── Link Employee FIRST so all fields auto-fill ── */}
            <FormField label="Link Employee (Optional)">
              <ReactSelect 
                options={[
                  { value: '', label: 'No Employee Link', emp: null },
                  ...employees.map(emp => ({ 
                    value: emp._id, 
                    label: `${emp.employeeCode || ''} - ${emp.firstName} ${emp.lastName}`,
                    emp
                  }))
                ]}
                value={
                  formData.employeeId 
                    ? (() => {
                        const emp = employees.find(e => e._id === formData.employeeId);
                        return emp
                          ? { value: emp._id, label: `${emp.employeeCode || ''} - ${emp.firstName} ${emp.lastName}`, emp }
                          : { value: formData.employeeId, label: 'Unknown Employee', emp: null };
                      })()
                    : null
                }
                onChange={opt => {
                  const emp = opt?.emp || null;
                  if (emp) {
                    setFormData(prev => ({
                      ...prev,
                      employeeId: emp._id,
                      firstName: emp.firstName || prev.firstName,
                      lastName: emp.lastName || prev.lastName,
                      email: emp.email || emp.personalEmail || prev.email,
                      branches: emp.branchId?._id ? [emp.branchId._id] : prev.branches
                    }));
                  } else {
                    setFormData(prev => ({ ...prev, employeeId: '' }));
                  }
                }}
                isSearchable={true}
                isClearable={true}
                placeholder="🔍 Search employee by name or code..."
                className="text-sm"
                styles={{
                  control: (base) => ({
                    ...base,
                    borderColor: '#e2e8f0',
                    boxShadow: 'none',
                    '&:hover': { borderColor: '#cbd5e1' }
                  })
                }}
              />
              {formData.employeeId ? (
                <p className="text-xs text-emerald-600 mt-1 font-medium">✓ Employee selected — name, email & branch auto-filled below. You can still edit.</p>
              ) : (
                <p className="text-xs text-slate-400 mt-1">Select an employee to auto-fill their details into the form below.</p>
              )}
            </FormField>

            <div className="border-t border-slate-100 pt-3" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="First Name" required>
                <Input required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
              </FormField>
              <FormField label="Last Name" required>
                <Input required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
              </FormField>
            </div>
            
            <FormField label="Email Address" required>
              <Input type="email" required disabled={!!editUserId} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </FormField>
            
            {!editUserId && (
              <FormField label="Temporary Password" required>
                <Input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </FormField>
            )}
            
            <FormField label="Assign Role" required>
              <Select required value={formData.roleId} onChange={e => setFormData({...formData, roleId: e.target.value})}>
                <option value="" disabled>Select a Role</option>
                {roles.map(role => (
                  <option key={role._id} value={role._id}>{role.name}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Portal Access" required>
              <Select required value={formData.portalAccess} onChange={e => setFormData({...formData, portalAccess: e.target.value})}>
                <option value="NO ACCESS">No Access (Disabled Login)</option>
                <option value="WEB LOGIN">Web Login Only</option>
                <option value="MOBILE LOGIN">Mobile Login Only</option>
                <option value="WEB + MOBILE">Web + Mobile</option>
              </Select>
            </FormField>
            
            <FormField label="Assign Branch (Optional)">
              <div className="space-y-1">
                <div className="border border-slate-200 rounded-md p-2 bg-white max-h-36 overflow-y-auto space-y-1">
                  {branches.map(branch => (
                    <label key={branch._id} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer">
                      <input 
                        type="checkbox"
                        className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary"
                        checked={formData.branches.includes(branch._id)}
                        onChange={(e) => {
                          const newBranches = e.target.checked 
                            ? [...formData.branches, branch._id]
                            : formData.branches.filter(id => id !== branch._id);
                          setFormData({ ...formData, branches: newBranches });
                        }}
                      />
                      <span className="text-sm font-medium text-slate-700">{branch.name}</span>
                    </label>
                  ))}
                  {branches.length === 0 && (
                    <div className="text-sm text-slate-500 italic p-2">No branches available</div>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">Select all branches this user can access. Leave empty for all if superadmin.</p>
              </div>
            </FormField>

            {editUserId && (
              <FormField label="Account Status" required>
                <Select required value={formData.isActive.toString()} onChange={e => setFormData({...formData, isActive: e.target.value === 'true'})}>
                  <option value="true">Active</option>
                  <option value="false">Disabled</option>
                </Select>
              </FormField>
            )}
          </div>
          
          <div className="pt-6 mt-4 border-t flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsInviting(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editUserId ? 'Save Changes' : 'Create User'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Are you sure you want to delete this user?"
        description="This action cannot be undone. This will permanently delete the user account and remove their access to the system."
        confirmText="Delete User"
      />

      {posPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">Set POS PIN</h3>
            <p className="text-sm text-slate-500 mb-4">Enter a 4-6 digit PIN for manager overrides and approvals.</p>
            <Input 
              type="password" 
              placeholder="e.g. 1234" 
              maxLength={6}
              value={posPinValue}
              onChange={(e) => setPosPinValue(e.target.value)}
              className="mb-6 tracking-widest text-center text-lg"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setPosPinModalOpen(false); setPosPinValue(''); }}>Cancel</Button>
              <Button onClick={handleSetPosPin}>Save PIN</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
