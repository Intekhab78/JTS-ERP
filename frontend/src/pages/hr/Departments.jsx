import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Layers, Plus, Building, Users, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { SearchInput } from '../../components/ui/SearchInput';
import { Modal } from '../../components/common/Modal';
import { FormField } from '../../components/common/FormField';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { CardSkeleton } from '../../components/common/CardSkeleton';

const Departments = () => {
  const [departments, setDepartments] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({ name: '', description: '', managerName: '', isActive: true });

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('/api/v1/hr/departments', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setDepartments(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      alert("Department Name is required");
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (editingId) {
        await axios.put(`/api/v1/hr/departments/${editingId}`, formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      } else {
        await axios.post('/api/v1/hr/departments', formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      }
      setIsCreating(false);
      setEditingId(null);
      setFormData({ name: '', description: '', managerName: '', isActive: true });
      fetchDepartments();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save department');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (dept) => {
    setFormData({
      name: dept.name || '',
      description: dept.description || '',
      managerName: dept.managerName || '',
      isActive: dept.isActive !== false
    });
    setEditingId(dept._id);
    setIsCreating(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this department?")) return;
    try {
      await axios.delete(`/api/v1/hr/departments/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchDepartments();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete department');
    }
  };

  const filteredDepartments = useMemo(() => {
    return departments.filter(d => 
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.description && d.description.toLowerCase().includes(search.toLowerCase())) ||
      (d.managerName && d.managerName.toLowerCase().includes(search.toLowerCase()))
    );
  }, [departments, search]);

  // Metrics Calculation
  const totalDepartments = departments.length;
  const activeDepartments = departments.filter(d => d.isActive).length;
  const needsManager = departments.filter(d => !d.managerName || !d.managerName.trim()).length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader 
        title="Departments"
        description="Manage organizational structure and functional teams."
        icon={Layers}
        actions={
          <Button onClick={() => {
            setFormData({ name: '', description: '', managerName: '', isActive: true });
            setEditingId(null);
            setIsCreating(true);
          }} className="gap-2">
            <Plus size={18} /> New Department
          </Button>
        }
      />

      {/* Mini Dashboard */}
      {!isLoading && departments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white border border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Departments</p>
                  <h3 className="text-3xl font-bold text-slate-800">{totalDepartments}</h3>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <Building size={24} />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Active Teams</p>
                  <h3 className="text-3xl font-bold text-slate-800">{activeDepartments}</h3>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Users size={24} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-white border ${needsManager > 0 ? 'border-amber-200' : 'border-slate-200'} shadow-sm`}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className={`text-sm font-semibold uppercase tracking-wider mb-1 ${needsManager > 0 ? 'text-amber-600' : 'text-slate-500'}`}>Needs Manager</p>
                  <h3 className="text-3xl font-bold text-slate-800">{needsManager}</h3>
                </div>
                <div className={`p-3 rounded-xl ${needsManager > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
                  <AlertCircle size={24} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Departments Listing */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <SearchInput 
          value={search}
          onChange={setSearch}
          placeholder="Search departments..."
          className="w-full md:w-96"
        />
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CardSkeleton /><CardSkeleton /><CardSkeleton />
        </div>
      ) : filteredDepartments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredDepartments.map(dept => (
            <Card key={dept._id} className="relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className={`absolute top-0 left-0 w-1.5 h-full ${dept.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              <CardHeader className="pb-3 border-b border-slate-50 bg-slate-50/50">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1.5">
                    <CardTitle className="text-lg font-bold text-slate-800">{dept.name || 'Unnamed Department'}</CardTitle>
                    <Badge variant={dept.isActive ? 'outline' : 'neutral'} className={`text-[10px] uppercase font-bold tracking-wider self-start ${dept.isActive ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : ''}`}>
                      {dept.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      type="button"
                      title="Edit Department"
                      onClick={() => handleEdit(dept)}
                      className="p-1.5 text-slate-400 hover:text-amber-600 bg-white border border-slate-200 hover:border-amber-200 hover:bg-amber-50 rounded-md transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      type="button"
                      title="Delete Department"
                      onClick={() => handleDelete(dept._id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 bg-white border border-slate-200 hover:border-red-200 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-4">
                <p className="text-xs text-slate-500 mb-4 h-10 overflow-hidden line-clamp-2">
                  {dept.description || 'No description provided.'}
                </p>
                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                    <Users size={14} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Manager</span>
                    <span className={`text-sm font-semibold ${!dept.managerName ? 'text-amber-600' : 'text-slate-700'}`}>
                      {dept.managerName || 'Unassigned'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200">
          <EmptyState 
            icon={<Building className="h-10 w-10 opacity-70" />}
            title={search ? "No departments found" : "No departments yet"}
            description={search ? `No results for "${search}"` : "Get started by creating your first department."}
            action={!search && (
              <Button onClick={() => {
                setFormData({ name: '', description: '', managerName: '', isActive: true });
                setEditingId(null);
                setIsCreating(true);
              }} className="mt-4 gap-2">
                <Plus size={16} /> Add Department
              </Button>
            )}
          />
        </div>
      )}

      <Modal
        isOpen={isCreating}
        onClose={() => {
          if (!isSubmitting) {
            setIsCreating(false);
            setEditingId(null);
          }
        }}
        title={editingId ? "Edit Department" : "Create New Department"}
        size="md"
      >
        <form onSubmit={handleCreateOrUpdate} className="space-y-6">
          <div className="space-y-4">
            <FormField label="Department Name" required>
              <Input 
                required 
                placeholder="e.g. Sales" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                disabled={isSubmitting}
              />
            </FormField>
            
            <FormField label="Manager Name (Optional)">
              <Input 
                placeholder="e.g. John Doe"
                value={formData.managerName} 
                onChange={e => setFormData({...formData, managerName: e.target.value})} 
                disabled={isSubmitting}
              />
            </FormField>
            
            <FormField label="Description">
              <Input 
                placeholder="Brief description of department functions..."
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})} 
                disabled={isSubmitting}
              />
            </FormField>

            {editingId && (
              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary cursor-pointer"
                  disabled={isSubmitting}
                />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Department is Active
                </label>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setIsCreating(false);
                setEditingId(null);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : (editingId ? 'Update Department' : 'Save Department')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Departments;
