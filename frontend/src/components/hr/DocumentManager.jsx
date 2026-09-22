import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { QuickAddModal } from '../common/QuickAddModal';
import { Eye, Trash2, Upload, X, Save, Plus } from 'lucide-react';

const DocumentManager = ({ employeeId }) => {
  const [documents, setDocuments] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  
  const [uploadData, setUploadData] = useState({
    documentTypeId: '',
    documentNumber: '',
    issuingCountry: '',
    expiryDate: '',
    file: null
  });

  useEffect(() => {
    fetchData();
  }, [employeeId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const [docsRes, typesRes] = await Promise.all([
        axios.get(`/api/v1/hr/employees/${employeeId}/documents`, { headers }),
        axios.get(`/api/v1/hr/document-types`, { headers }).catch(() => ({ data: [] }))
      ]);
      setDocuments(docsRes.data);
      setDocumentTypes(typesRes.data);
    } catch (error) {
      console.error('Failed to fetch documents', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'file') {
      setUploadData(prev => ({ ...prev, file: files[0] }));
    } else {
      setUploadData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadData.file) return alert('Please select a file to upload');
    if (!uploadData.documentTypeId) return alert('Please select a document type');

    setUploading(true);
    const formData = new FormData();
    formData.append('file', uploadData.file);
    formData.append('documentTypeId', uploadData.documentTypeId);
    if (uploadData.documentNumber) formData.append('documentNumber', uploadData.documentNumber);
    if (uploadData.issuingCountry) formData.append('issuingCountry', uploadData.issuingCountry);
    if (uploadData.expiryDate) formData.append('expiryDate', uploadData.expiryDate);

    try {
      await axios.post(`/api/v1/hr/employees/${employeeId}/documents`, formData, {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setUploadData({ documentTypeId: '', documentNumber: '', issuingCountry: '', expiryDate: '', file: null });
      setIsAdding(false);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleView = async (doc) => {
    try {
      const res = await axios.get(`/api/v1/hr/employees/${employeeId}/documents/${doc._id}/view`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: doc.mimeType }));
      window.open(url, '_blank');
    } catch (error) {
      alert('Failed to view document or unauthorized');
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await axios.delete(`/api/v1/hr/employees/${employeeId}/documents/${docId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchData();
    } catch (error) {
      alert('Failed to delete document');
    }
  };

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <h3 className="text-lg font-bold text-slate-800">Employee Documents</h3>
      </div>
      
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading documents...</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Document</th>
                <th className="py-3 px-4">Document Number</th>
                <th className="py-3 px-4">Issued By</th>
                <th className="py-3 px-4">Expiry</th>
                <th className="py-3 px-4">File</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map((doc) => (
                <tr key={doc._id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-medium text-slate-900">
                    {doc.documentTypeId ? doc.documentTypeId.name : (doc.documentType || 'Unknown')}
                  </td>
                  <td className="py-3 px-4 text-slate-600">{doc.documentNumber || '-'}</td>
                  <td className="py-3 px-4 text-slate-600">{doc.issuingCountry || '-'}</td>
                  <td className="py-3 px-4 text-slate-600">
                    {doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : '-'}
                    {doc.status === 'EXPIRED' && <span className="ml-2 text-xs text-red-600 font-bold">(Expired)</span>}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {doc.originalFileName || 'View File'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button type="button" onClick={() => handleView(doc)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded" title="View">
                        <Eye size={18} />
                      </button>
                      <button type="button" onClick={() => handleDelete(doc._id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Delete">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {/* Add Document Row */}
              {isAdding && (
                <tr className="bg-indigo-50/30">
                  <td className="py-2 px-2 flex gap-1 items-center">
                    <Select name="documentTypeId" value={uploadData.documentTypeId} onChange={handleUploadChange} className="w-full text-sm py-1.5" required>
                      <option value="">Select...</option>
                      {documentTypes.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                    </Select>
                    <button type="button" onClick={() => setQuickAddOpen(true)} className="p-1 bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-500" title="Add New Document Type">
                      <Plus size={16} />
                    </button>
                  </td>
                  <td className="py-2 px-2">
                    <Input name="documentNumber" value={uploadData.documentNumber} onChange={handleUploadChange} className="w-full text-sm py-1.5" placeholder="Number" />
                  </td>
                  <td className="py-2 px-2">
                    <Input name="issuingCountry" value={uploadData.issuingCountry} onChange={handleUploadChange} className="w-full text-sm py-1.5" placeholder="Issuer" />
                  </td>
                  <td className="py-2 px-2">
                    <Input type="date" name="expiryDate" value={uploadData.expiryDate} onChange={handleUploadChange} className="w-full text-sm py-1.5" />
                  </td>
                  <td className="py-2 px-2">
                    <input 
                      type="file" 
                      name="file" 
                      onChange={handleUploadChange} 
                      className="w-full text-xs text-slate-500 border bg-white rounded p-1"
                      required
                    />
                  </td>
                  <td className="py-2 px-2 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <Button type="button" size="sm" onClick={handleUploadSubmit} disabled={uploading} className="h-8 px-2 bg-green-600 hover:bg-green-700">
                        {uploading ? '...' : <Save size={16} />}
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setIsAdding(false)} disabled={uploading} className="h-8 px-2 border-slate-300 text-slate-600">
                        <X size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Add Button Row */}
              {!isAdding && (
                <tr>
                  <td colSpan="6" className="py-3 px-4">
                    <button 
                      type="button" 
                      onClick={() => setIsAdding(true)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                    >
                      + Add a document
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {quickAddOpen && (
        <QuickAddModal 
          isOpen={quickAddOpen}
          onClose={() => setQuickAddOpen(false)}
          title="Add Document Type"
          endpoint="/api/v1/hr/document-types"
          onSuccess={(newData) => {
            fetchData();
            setUploadData(prev => ({ ...prev, documentTypeId: newData._id }));
          }}
          fields={[
            { name: 'name', label: 'Name', required: true },
            { name: 'code', label: 'Short Code (e.g. ID, PASS)', required: true }
          ]}
        />
      )}
    </div>
  );
};

export default DocumentManager;
