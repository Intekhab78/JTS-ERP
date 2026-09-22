import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { UserCircle, Plus, Mail, Phone, MapPin, Building2, Briefcase, Users } from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { DataTable } from '../../components/common/DataTable';
import { SearchInput } from '../../components/ui/SearchInput';
import { Modal } from '../../components/common/Modal';
import { FormField } from '../../components/common/FormField';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/common/EmptyState';

const Employees = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('/api/v1/hr/employees', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setEmployees(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        await axios.delete(`/api/v1/hr/employees/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        fetchEmployees();
      } catch (error) {
        console.error('Error deleting employee:', error);
        alert('Failed to delete employee. Please check if there are related records.');
      }
    }
  };
  const filteredEmployees = useMemo(() => {
    return employees.filter(e => 
      e.firstName.toLowerCase().includes(search.toLowerCase()) || 
      e.lastName.toLowerCase().includes(search.toLowerCase()) ||
      e.jobTitle.toLowerCase().includes(search.toLowerCase())
    );
  }, [employees, search]);

  const columns = useMemo(() => [
    {
      header: 'Employee Code',
      cell: (emp) => <div className="font-medium text-slate-700">{emp.employeeCode}</div>
    },
    {
      header: 'Employee',
      cell: (emp) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
            {emp.profilePhoto?.url ? (
               <img src={emp.profilePhoto.url} className="w-full h-full rounded-full object-cover" alt="Profile" />
            ) : (
               `${emp.firstName[0]}${emp.lastName[0]}`
            )}
          </div>
          <div>
            <div className="font-bold text-slate-900">{emp.firstName} {emp.lastName}</div>
            <div className="text-xs text-slate-500 font-medium">{emp.designation || emp.jobTitle}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Dept & Branch',
      cell: (emp) => (
        <div>
          <div className="font-medium text-slate-900 flex items-center gap-1.5"><Briefcase size={14}/> {emp.departmentId?.name || '—'}</div>
          <div className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
            <Building2 size={14}/> {emp.branchId?.name || '—'}
          </div>
        </div>
      )
    },
    {
      header: 'Contact',
      cell: (emp) => (
        <div>
          <div className="text-sm text-slate-700 flex items-center gap-1.5">
            <Mail size={14} className="text-slate-400"/> {emp.email || emp.personalEmail || '—'}
          </div>
          <div className="text-sm text-slate-700 flex items-center gap-1.5 mt-1">
            <Phone size={14} className="text-slate-400"/> {emp.phone || emp.personalMobile || '—'}
          </div>
        </div>
      )
    },
    {
      header: 'Status',
      cell: (emp) => {
        const variants = {
          ACTIVE: 'success',
          ON_LEAVE: 'warning',
          TERMINATED: 'danger',
          SUSPENDED: 'danger',
          RESIGNED: 'neutral'
        };
        return (
          <Badge variant={variants[emp.status] || 'neutral'}>
            {emp.status}
          </Badge>
        );
      }
    },
    {
      header: 'User Access',
      cell: (emp) => (
        <Badge variant={emp.userId ? 'success' : 'neutral'}>
          {emp.userId ? 'LINKED' : 'NOT LINKED'}
        </Badge>
      )
    },
    {
      header: 'Actions',
      cell: (emp) => (
        <div className="flex items-center gap-1 justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/employees/${emp._id}`); }} className="h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs font-medium">View</Button>
          <Button type="button" variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/employees/edit/${emp._id}`); }} className="h-7 px-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 text-xs font-medium">Edit</Button>
          <Button type="button" variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(emp._id); }} className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 text-xs font-medium">Delete</Button>
        </div>
      )
    }
  ], []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader 
        title="Employee Directory"
        description="Manage workforce details, titles, and base compensation."
        icon={UserCircle}
        actions={
          <Button onClick={() => navigate('/employees/new')} className="gap-2">
            <Plus size={18} /> New Employee
          </Button>
        }
      />

      <Card>
        <div className="p-4 border-b border-slate-200">
          <SearchInput 
            value={search}
            onChange={setSearch}
            placeholder="Search employees by name or title..."
            className="w-full md:w-96"
          />
        </div>
        
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Loading employees...</div>
        ) : filteredEmployees.length > 0 ? (
          <DataTable 
            columns={columns}
            data={filteredEmployees}
            onRowClick={(emp) => navigate(`/employees/${emp._id}`)}
          />
        ) : (
          <div className="p-8">
            <EmptyState 
              icon={Users}
              title={search ? "No employees found" : "No employees yet"}
              description={search ? `No results for "${search}"` : "Get started by registering your first employee."}
              action={!search && (
                <Button onClick={() => navigate('/employees/new')} variant="outline" className="mt-4 gap-2">
                  <Plus size={16} /> Register Employee
                </Button>
              )}
            />
          </div>
        )}
      </Card>


    </div>
  );
};

export default Employees;
