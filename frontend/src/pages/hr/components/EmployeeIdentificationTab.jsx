import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/ui/Button';
import { DataTable } from '../../../components/common/DataTable';
import { Modal } from '../../../components/common/Modal';
import { FormField } from '../../../components/common/FormField';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Plus, Eye, Trash2, Edit } from 'lucide-react';

const EmployeeIdentificationTab = ({ employeeId, hasPermission }) => {
  const [identifications, setIdentifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  
  const [formData, setFormData] = useState({
    identificationType: '',
    identificationNumber: '',
    issuingCountry: '',
    issueDate: '',
    expiryDate: '',
    remarks: ''
  });

  const [unmaskedData, setUnmaskedData] = useState({});

  useEffect(() => {
    fetchIdentifications();
  }, [employeeId]);

  const fetchIdentifications = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/v1/hr/employees/${employeeId}/identifications`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setIdentifications(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (ident = null) => {
    if (ident) {
      setIsEditing(true);
      setCurrentId(ident);
      setFormData({
        identificationType: ident.identificationType,
        identificationNumber: '', // Keep empty to not update accidentally, or they must re-enter if changing
        issuingCountry: ident.issuingCountry || '',
        issueDate: ident.issueDate ? ident.issueDate.split('T')[0] : '',
        expiryDate: ident.expiryDate ? ident.expiryDate.split('T')[0] : '',
        remarks: ident.remarks || ''
      });
    } else {
      setIsEditing(false);
      setCurrentId(null);
      setFormData({
        identificationType: '',
        identificationNumber: '',
        issuingCountry: '',
        issueDate: '',
        expiryDate: '',
        remarks: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = isEditing 
        ? `http://localhost:5000/api/v1/hr/employees/${employeeId}/identifications/${currentId._id}`
        : `http://localhost:5000/api/v1/hr/employees/${employeeId}/identifications`;
        
      const method = isEditing ? 'put' : 'post';
      
      const payload = { ...formData };
      if (isEditing && !payload.identificationNumber) {
        delete payload.identificationNumber;
      }
      
      await axios[method](url, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setIsModalOpen(false);
      fetchIdentifications();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save identification');
    }
  };

  const handleDelete = async (identId) => {
    if (!window.confirm('Are you sure you want to delete this identification?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/v1/hr/employees/${employeeId}/identifications/${identId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchIdentifications();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete identification');
    }
  };

  const handleViewSensitive = async (identId) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/v1/hr/employees/${employeeId}/identifications/${identId}/unmask`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setUnmaskedData(prev => ({
        ...prev,
        [identId]: res.data.identificationNumber
      }));
      
      // Auto re-mask after 10 seconds
      setTimeout(() => {
        setUnmaskedData(prev => {
          const next = {...prev};
          delete next[identId];
          return next;
        });
      }, 10000);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to view sensitive data. You may lack permissions.');
    }
  };

  const columns = [
    { header: 'Type', accessor: (ident) => <span className="font-medium text-slate-700">{ident.identificationType}</span> },
    { header: 'Number', accessor: (ident) => (
      <span className="font-mono text-sm bg-slate-100 px-2 py-1 rounded">
        {unmaskedData[ident._id] || ident.maskedIdentificationNumber}
      </span>
    )},
    { header: 'Country', accessor: (ident) => ident.issuingCountry || '—' },
    { header: 'Expiry', accessor: (ident) => ident.expiryDate ? new Date(ident.expiryDate).toLocaleDateString() : '—' },
    { 
      header: 'Status', 
      accessor: (ident) => {
        const variants = {
          ACTIVE: 'success',
          EXPIRING_SOON: 'warning',
          EXPIRED: 'danger',
          NOT_PROVIDED: 'neutral'
        };
        return <Badge variant={variants[ident.status]}>{ident.status}</Badge>;
      } 
    },
    {
      header: 'Actions',
      accessor: (ident) => (
        <div className="flex gap-2">
          {hasPermission('HR.EMPLOYEE_IDENTIFICATION.VIEW_SENSITIVE') && (
            <Button variant="ghost" className="p-1 text-blue-600" onClick={() => handleViewSensitive(ident._id)} title="View Sensitive"><Eye size={16}/></Button>
          )}
          {hasPermission('HR.EMPLOYEE_IDENTIFICATION.EDIT') && (
            <Button variant="ghost" className="p-1 text-amber-600" onClick={() => handleOpenModal(ident)}><Edit size={16}/></Button>
          )}
          {hasPermission('HR.EMPLOYEE_IDENTIFICATION.DELETE') && (
            <Button variant="ghost" className="p-1 text-red-600" onClick={() => handleDelete(ident._id)}><Trash2 size={16}/></Button>
          )}
        </div>
      )
    }
  ];

  if (isLoading) return <div>Loading...</div>;

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-slate-800">Identifications</h3>
        {hasPermission('HR.EMPLOYEE_IDENTIFICATION.CREATE') && (
          <Button onClick={() => handleOpenModal()} className="gap-2">
            <Plus size={16} /> Add Identification
          </Button>
        )}
      </div>

      <DataTable columns={columns} data={identifications} />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? 'Edit Identification' : 'Add Identification'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Identification Type (e.g., SSN, PAN, Passport)" required>
            <Input value={formData.identificationType} onChange={e => setFormData({...formData, identificationType: e.target.value})} required />
          </FormField>
          <FormField label={isEditing ? "Identification Number (Leave blank to keep current)" : "Identification Number"} required={!isEditing}>
            <Input value={formData.identificationNumber} onChange={e => setFormData({...formData, identificationNumber: e.target.value})} required={!isEditing} />
          </FormField>
          <FormField label="Issuing Country">
            <Input value={formData.issuingCountry} onChange={e => setFormData({...formData, issuingCountry: e.target.value})} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Issue Date">
              <Input type="date" value={formData.issueDate} onChange={e => setFormData({...formData, issueDate: e.target.value})} />
            </FormField>
            <FormField label="Expiry Date">
              <Input type="date" value={formData.expiryDate} onChange={e => setFormData({...formData, expiryDate: e.target.value})} />
            </FormField>
          </div>
          <FormField label="Remarks">
            <Input value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} />
          </FormField>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Identification</Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
};

export default EmployeeIdentificationTab;
