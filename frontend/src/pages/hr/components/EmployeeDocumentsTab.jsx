import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/ui/Button';
import { DataTable } from '../../../components/common/DataTable';
import { Modal } from '../../../components/common/Modal';
import { FormField } from '../../../components/common/FormField';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Badge } from '../../../components/ui/Badge';
import { Plus, Eye, Trash2, Edit } from 'lucide-react';

const EmployeeDocumentsTab = ({ employeeId, hasPermission }) => {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentDoc, setCurrentDoc] = useState(null);
  
  const [formData, setFormData] = useState({
    documentType: 'PASSPORT',
    documentName: '',
    documentNumber: '',
    issuingCountry: '',
    issueDate: '',
    expiryDate: '',
    remarks: '',
    file: null
  });

  useEffect(() => {
    fetchDocuments();
  }, [employeeId]);

  const fetchDocuments = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/v1/hr/employees/${employeeId}/documents`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setDocuments(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (doc = null) => {
    if (doc) {
      setIsEditing(true);
      setCurrentDoc(doc);
      setFormData({
        documentType: doc.documentType,
        documentName: doc.documentName,
        documentNumber: doc.documentNumber || '',
        issuingCountry: doc.issuingCountry || '',
        issueDate: doc.issueDate ? doc.issueDate.split('T')[0] : '',
        expiryDate: doc.expiryDate ? doc.expiryDate.split('T')[0] : '',
        remarks: doc.remarks || '',
        file: null
      });
    } else {
      setIsEditing(false);
      setCurrentDoc(null);
      setFormData({
        documentType: 'PASSPORT',
        documentName: '',
        documentNumber: '',
        issuingCountry: '',
        issueDate: '',
        expiryDate: '',
        remarks: '',
        file: null
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isEditing && !formData.file) {
      alert("Please select a file to upload.");
      return;
    }
    
    const fd = new FormData();
    fd.append('documentType', formData.documentType);
    fd.append('documentName', formData.documentName);
    fd.append('documentNumber', formData.documentNumber);
    fd.append('issuingCountry', formData.issuingCountry);
    if (formData.issueDate) fd.append('issueDate', formData.issueDate);
    if (formData.expiryDate) fd.append('expiryDate', formData.expiryDate);
    fd.append('remarks', formData.remarks);
    if (formData.file) fd.append('file', formData.file);

    try {
      const url = isEditing 
        ? `http://localhost:5000/api/v1/hr/employees/${employeeId}/documents/${currentDoc._id}`
        : `http://localhost:5000/api/v1/hr/employees/${employeeId}/documents`;
        
      const method = isEditing ? 'put' : 'post';
      
      await axios[method](url, fd, {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setIsModalOpen(false);
      fetchDocuments();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save document');
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/v1/hr/employees/${employeeId}/documents/${docId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchDocuments();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete document');
    }
  };

  const handleView = async (docId) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/v1/hr/employees/${employeeId}/documents/${docId}/view`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `document-${docId}`);
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      alert('Failed to view document');
    }
  };

  const columns = [
    { header: 'Type', accessor: (doc) => <span className="font-medium text-slate-700">{doc.documentType}</span> },
    { header: 'Name', accessor: 'documentName' },
    { header: 'Number', accessor: (doc) => doc.documentNumber || '—' },
    { header: 'Country', accessor: (doc) => doc.issuingCountry || '—' },
    { header: 'Expiry', accessor: (doc) => doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : '—' },
    { 
      header: 'Status', 
      accessor: (doc) => {
        const variants = {
          ACTIVE: 'success',
          EXPIRING_SOON: 'warning',
          EXPIRED: 'danger',
          NOT_PROVIDED: 'neutral'
        };
        return <Badge variant={variants[doc.status]}>{doc.status}</Badge>;
      } 
    },
    {
      header: 'Actions',
      accessor: (doc) => (
        <div className="flex gap-2">
          {hasPermission('HR.EMPLOYEE_DOCUMENT.VIEW') && (
            <Button variant="ghost" className="p-1 text-blue-600" onClick={() => handleView(doc._id)}><Eye size={16}/></Button>
          )}
          {hasPermission('HR.EMPLOYEE_DOCUMENT.EDIT') && (
            <Button variant="ghost" className="p-1 text-amber-600" onClick={() => handleOpenModal(doc)}><Edit size={16}/></Button>
          )}
          {hasPermission('HR.EMPLOYEE_DOCUMENT.DELETE') && (
            <Button variant="ghost" className="p-1 text-red-600" onClick={() => handleDelete(doc._id)}><Trash2 size={16}/></Button>
          )}
        </div>
      )
    }
  ];

  if (isLoading) return <div>Loading...</div>;

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-slate-800">Compliance Documents</h3>
        {hasPermission('HR.EMPLOYEE_DOCUMENT.CREATE') && (
          <Button onClick={() => handleOpenModal()} className="gap-2">
            <Plus size={16} /> Add Document
          </Button>
        )}
      </div>

      <DataTable columns={columns} data={documents} />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? 'Edit Document' : 'Upload Document'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Document Type" required>
            <Select 
              value={formData.documentType} 
              onChange={e => setFormData({...formData, documentType: e.target.value})} 
              required
              options={[
                { value: 'PASSPORT', label: 'Passport' },
                { value: 'VISA', label: 'Visa' },
                { value: 'WORK_PERMIT', label: 'Work Permit' },
                { value: 'RESIDENCE_PERMIT', label: 'Residence Permit' },
                { value: 'NATIONAL_ID', label: 'National ID' },
                { value: 'DRIVING_LICENSE', label: 'Driving License' },
                { value: 'EMPLOYMENT_CONTRACT', label: 'Employment Contract' },
                { value: 'EDUCATION_CERTIFICATE', label: 'Education Certificate' },
                { value: 'PROFESSIONAL_CERTIFICATE', label: 'Professional Certificate' },
                { value: 'MEDICAL_CERTIFICATE', label: 'Medical Certificate' },
                { value: 'INSURANCE', label: 'Insurance' },
                { value: 'TAX_DOCUMENT', label: 'Tax Document' },
                { value: 'OTHER', label: 'Other' }
              ]}
            />
          </FormField>
          <FormField label="Document Name" required>
            <Input value={formData.documentName} onChange={e => setFormData({...formData, documentName: e.target.value})} required />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Document Number">
              <Input value={formData.documentNumber} onChange={e => setFormData({...formData, documentNumber: e.target.value})} />
            </FormField>
            <FormField label="Issuing Country">
              <Input value={formData.issuingCountry} onChange={e => setFormData({...formData, issuingCountry: e.target.value})} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Issue Date">
              <Input type="date" value={formData.issueDate} onChange={e => setFormData({...formData, issueDate: e.target.value})} />
            </FormField>
            <FormField label="Expiry Date">
              <Input type="date" value={formData.expiryDate} onChange={e => setFormData({...formData, expiryDate: e.target.value})} />
            </FormField>
          </div>
          <FormField label="File (Max 10MB, PDF/JPEG/PNG)" required={!isEditing}>
            <Input type="file" onChange={e => setFormData({...formData, file: e.target.files[0]})} accept=".pdf,.jpg,.jpeg,.png,.webp" />
          </FormField>
          <FormField label="Remarks">
            <Input value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} />
          </FormField>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Document</Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
};

export default EmployeeDocumentsTab;
