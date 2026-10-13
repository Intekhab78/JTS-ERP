import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { getFileUrl } from '../../config/api';
import { ArrowLeft, Save, Plus, Trash2, Camera, X, FileText } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardHeader, CardContent, CardTitle } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

export default function SupplierForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');

  const [complianceDocs, setComplianceDocs] = useState({
    TRADE_LICENSE: { file: null, expiryDate: '' },
    TAX_CERTIFICATE: { file: null, expiryDate: '' },
    IMPORT_LICENSE: { file: null, expiryDate: '' },
    OTHER_DOCUMENT: { file: null, expiryDate: '', documentName: '' }
  });

  const [formData, setFormData] = useState({
    vendorCode: '',
    vendorType: 'Other',
    name: '',
    website: '',
    phone: '',
    email: '',
    remarks: '',
    status: 'ACTIVE',
    contactDetails: { firstName: '', lastName: '', email: '', mobile: '' },
    addressDetails: { address: '', city: '', state: '', zip: '', country: '' },
    bankDetails: { bankName: '', accountHolderName: '', accountNo: '', ifsc: '', swift: '', branchName: '' },
    legalDetails: { tradeLicense: '', tradeLicenseExpiryDate: '', taxCertificate: '', taxRegistrationNumber: '', importLicenseNo: '', companyRegistrationNumber: '' },
    documents: []
  });

  useEffect(() => {
    if (isEdit) {
      fetchSupplier();
    }
  }, [id]);

  const fetchSupplier = async () => {
    try {
      const { data } = await axios.get(`/api/v1/suppliers/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      // Merge with default structure to prevent uncontrolled components
      setFormData({
        vendorCode: data.vendorCode || '',
        vendorType: data.vendorType || 'Other',
        name: data.name || '',
        website: data.website || '',
        phone: data.phone || '',
        email: data.email || '',
        remarks: data.remarks || '',
        status: data.status || 'ACTIVE',
        contactDetails: {
          firstName: data.contactDetails?.firstName || '',
          lastName: data.contactDetails?.lastName || '',
          email: data.contactDetails?.email || '',
          mobile: data.contactDetails?.mobile || ''
        },
        addressDetails: {
          address: data.addressDetails?.address || data.address || '',
          city: data.addressDetails?.city || '',
          state: data.addressDetails?.state || '',
          zip: data.addressDetails?.zip || '',
          country: data.addressDetails?.country || ''
        },
        bankDetails: {
          bankName: data.bankDetails?.bankName || '',
          accountHolderName: data.bankDetails?.accountHolderName || '',
          accountNo: data.bankDetails?.accountNo || '',
          ifsc: data.bankDetails?.ifsc || '',
          swift: data.bankDetails?.swift || '',
          branchName: data.bankDetails?.branchName || ''
        },
        legalDetails: {
          tradeLicense: data.legalDetails?.tradeLicense || '',
          tradeLicenseExpiryDate: data.legalDetails?.tradeLicenseExpiryDate ? data.legalDetails.tradeLicenseExpiryDate.split('T')[0] : '',
          taxCertificate: data.legalDetails?.taxCertificate || '',
          taxRegistrationNumber: data.legalDetails?.taxRegistrationNumber || data.taxId || '',
          importLicenseNo: data.legalDetails?.importLicenseNo || '',
          companyRegistrationNumber: data.legalDetails?.companyRegistrationNumber || ''
        },
        documents: data.documents || []
      });

      if (data.ownerPhoto && data.ownerPhoto.url) {
        setPhotoPreviewUrl(getFileUrl(data.ownerPhoto.url));
      }
    } catch (error) {
      alert('Failed to load supplier');
      navigate('/suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e, section = null) => {
    const { name, value } = e.target;
    if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: { ...prev[section], [name]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleDocumentChange = (index, field, value) => {
    const newDocs = [...formData.documents];
    newDocs[index][field] = value;
    setFormData(prev => ({ ...prev, documents: newDocs }));
  };

  const addDocument = () => {
    setFormData(prev => ({
      ...prev,
      documents: [...prev.documents, { documentName: '', documentType: '', documentNumber: '', documentUrl: '', remarks: '' }]
    }));
  };

  const removeDocument = (index) => {
    const newDocs = formData.documents.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, documents: newDocs }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        alert('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit.');
        return;
      }
      setPhotoFile(file);
      setPhotoPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleComplianceDocChange = (type, field, value) => {
    setComplianceDocs(prev => ({
      ...prev,
      [type]: { ...prev[type], [field]: value }
    }));
  };
  
  const handleComplianceFileChange = (type, e) => {
    const file = e.target.files[0];
    if (file) {
      if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        alert('Invalid file type. Only PDF, JPEG, PNG, and WebP are allowed.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert('File size exceeds 10MB limit.');
        return;
      }
      handleComplianceDocChange(type, 'file', file);
    }
  };

  const removeExistingComplianceDoc = async (docId) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        await axios.delete(`/api/v1/suppliers/${id}/documents/${docId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        fetchSupplier(); // Reload to reflect changes
      } catch (error) {
        alert('Failed to delete document');
      }
    }
  };

  const removePhoto = async () => {
    if (isEdit && formData.ownerPhoto) {
      if (window.confirm('Are you sure you want to delete the current owner photo?')) {
        try {
          await axios.delete(`/api/v1/suppliers/${id}/owner-photo`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          setPhotoPreviewUrl('');
          setPhotoFile(null);
          // Assuming the supplier refetch isn't strictly necessary just to clear UI
        } catch (error) {
          alert('Failed to delete photo');
        }
      }
    } else {
      setPhotoPreviewUrl('');
      setPhotoFile(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    // For legacy compatibility, also copy addressDetails.address -> address
    const payload = {
      ...formData,
      address: formData.addressDetails.address,
      taxId: formData.legalDetails.taxRegistrationNumber
    };

    try {
      let savedSupplierId = id;

      if (isEdit) {
        await axios.put(`/api/v1/suppliers/${id}`, payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      } else {
        const response = await axios.post('/api/v1/suppliers', payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        savedSupplierId = response.data._id;
      }

      // Handle photo upload if a new file was selected
      if (photoFile && savedSupplierId) {
        const formDataUpload = new FormData();
        formDataUpload.append('photo', photoFile);
        
        await axios.post(`/api/v1/suppliers/${savedSupplierId}/owner-photo`, formDataUpload, {
          headers: { 
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      // Handle compliance docs upload
      for (const [docType, docData] of Object.entries(complianceDocs)) {
        if (docData.file && savedSupplierId) {
          const docFormData = new FormData();
          docFormData.append('file', docData.file);
          docFormData.append('documentType', docType);
          if (docData.expiryDate) {
            docFormData.append('expiryDate', docData.expiryDate);
          }
          if (docType === 'OTHER_DOCUMENT' && docData.documentName) {
            docFormData.append('documentName', docData.documentName);
          }
          
          try {
            await axios.post(`/api/v1/suppliers/${savedSupplierId}/documents`, docFormData, {
              headers: { 
                Authorization: `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'multipart/form-data'
              }
            });
          } catch (err) {
            console.error(`Failed to upload ${docType}:`, err);
          }
        }
      }

      navigate('/suppliers');
    } catch (error) {
      alert(error.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} supplier`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  return (
    <form onSubmit={handleSubmit} className="animate-in fade-in zoom-in-95 duration-500 space-y-6 max-w-[1400px] mx-auto pb-10 bg-[#f8fafc] min-h-screen">
      <div className="relative overflow-hidden rounded-none sm:rounded-xl bg-[#0a0f1c] border-l-4 border-blue-500 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-start gap-4">
            <button type="button" onClick={() => navigate('/suppliers')} className="p-2.5 bg-slate-800/50 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 mt-1">
              <ArrowLeft size={20} className="text-slate-300" />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-black tracking-tight text-white uppercase">{isEdit ? 'Edit Supplier' : 'New Supplier'}</h1>
              </div>
              <p className="text-slate-400 text-sm font-medium tracking-wide uppercase tracking-widest">
                {isEdit ? `Update supplier ${formData.vendorCode || ''}` : 'Create a new vendor profile in the system'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-[#111827] border border-slate-800 p-2.5 rounded-lg shadow-inner">
            <button 
              type="submit" 
              disabled={submitting} 
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-bold uppercase tracking-widest transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.4)]"
            >
              <Save size={16} /> {submitting ? 'Saving...' : 'Save Supplier'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Owner Photo */}
        <div className="md:col-span-2 rounded-xl border-slate-200 shadow-sm overflow-hidden bg-white">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">Owner / Supplier Photo</h3>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden relative group shrink-0">
                {photoPreviewUrl ? (
                  <img src={photoPreviewUrl} alt="Owner Preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="text-slate-400" size={32} />
                )}
                {photoPreviewUrl && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <button type="button" onClick={removePhoto} className="text-white hover:text-red-400 p-1 bg-black/50 rounded-full">
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <input className="h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold shadow-sm" 
                  type="file" 
                  accept="image/jpeg, image/png, image/webp" 
                  onChange={handlePhotoChange} 
                  
                />
                <p className="text-xs text-slate-500 mt-2">Maximum file size: 5MB. Allowed formats: JPEG, PNG, WebP.</p>
                {photoFile && <p className="text-xs font-semibold text-emerald-600 mt-1">Ready to upload: {photoFile.name} ({(photoFile.size / 1024 / 1024).toFixed(2)} MB)</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Company Details */}
        <div className="rounded-xl border-slate-200 shadow-sm overflow-hidden bg-white">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">Company Details</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Company Name <span className="text-red-500">*</span></label>
                <input className="h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold shadow-sm" name="name" value={formData.name} onChange={handleChange} required placeholder="Acme Corp" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Vendor Type</label>
                <select className="h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 text-sm font-bold shadow-sm" name="vendorType" value={formData.vendorType} onChange={handleChange}>
                  <option value="Transport">Transport</option>
                  <option value="Packaging">Packaging</option>
                  <option value="Food">Food</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Vendor Code</label>
                <input className="h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold shadow-sm" name="vendorCode" value={formData.vendorCode} onChange={handleChange} placeholder="Auto-generated if empty" disabled={isEdit && formData.vendorCode} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Website</label>
                <input className="h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold shadow-sm" name="website" value={formData.website} onChange={handleChange} placeholder="https://example.com" type="url" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Company Email</label>
                <input className="h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold shadow-sm" name="email" value={formData.email} onChange={handleChange} type="email" placeholder="contact@example.com" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Company Mobile</label>
                <input className="h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold shadow-sm" name="phone" value={formData.phone} onChange={handleChange} placeholder="+1234567890" />
              </div>
            </div>
          </div>
        </div>

        {/* Contact Details */}
        <div className="rounded-xl border-slate-200 shadow-sm overflow-hidden bg-white">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">Contact Person</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">First Name</label>
                <input className="h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold shadow-sm" name="firstName" value={formData.contactDetails.firstName} onChange={(e) => handleChange(e, 'contactDetails')} placeholder="John" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Last Name</label>
                <input className="h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold shadow-sm" name="lastName" value={formData.contactDetails.lastName} onChange={(e) => handleChange(e, 'contactDetails')} placeholder="Doe" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Email</label>
                <input className="h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold shadow-sm" name="email" type="email" value={formData.contactDetails.email} onChange={(e) => handleChange(e, 'contactDetails')} placeholder="john@example.com" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Mobile</label>
                <input className="h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold shadow-sm" name="mobile" value={formData.contactDetails.mobile} onChange={(e) => handleChange(e, 'contactDetails')} placeholder="+1234567890" />
              </div>
            </div>
          </div>
        </div>

        {/* Address Details */}
        <div className="md:col-span-2 rounded-xl border-slate-200 shadow-sm overflow-hidden bg-white">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">Address Details</h3>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Street Address</label>
              <input className="h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold shadow-sm" name="address" value={formData.addressDetails.address} onChange={(e) => handleChange(e, 'addressDetails')} placeholder="123 Main St" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">City</label>
                <input className="h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold shadow-sm" name="city" value={formData.addressDetails.city} onChange={(e) => handleChange(e, 'addressDetails')} placeholder="City" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">State / Province</label>
                <input className="h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold shadow-sm" name="state" value={formData.addressDetails.state} onChange={(e) => handleChange(e, 'addressDetails')} placeholder="State" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">ZIP / Postal Code</label>
                <input className="h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold shadow-sm" name="zip" value={formData.addressDetails.zip} onChange={(e) => handleChange(e, 'addressDetails')} placeholder="ZIP Code" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Country</label>
                <input className="h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold shadow-sm" name="country" value={formData.addressDetails.country} onChange={(e) => handleChange(e, 'addressDetails')} placeholder="Country" />
              </div>
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div className="rounded-xl border-slate-200 shadow-sm overflow-hidden bg-white">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">Bank Details</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Bank Name</label>
                <input className="h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold shadow-sm" name="bankName" value={formData.bankDetails.bankName} onChange={(e) => handleChange(e, 'bankDetails')} placeholder="Chase Bank" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Account Holder</label>
                <input className="h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold shadow-sm" name="accountHolderName" value={formData.bankDetails.accountHolderName} onChange={(e) => handleChange(e, 'bankDetails')} placeholder="Acme Corp LLC" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Account No.</label>
                <input className="h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold shadow-sm" name="accountNo" value={formData.bankDetails.accountNo} onChange={(e) => handleChange(e, 'bankDetails')} placeholder="123456789" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">IFSC / Routing / Swift</label>
                <input className="h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold shadow-sm" name="ifsc" value={formData.bankDetails.ifsc} onChange={(e) => handleChange(e, 'bankDetails')} placeholder="Code" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Branch Name</label>
              <input className="h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold shadow-sm" name="branchName" value={formData.bankDetails.branchName} onChange={(e) => handleChange(e, 'bankDetails')} placeholder="Downtown Branch" />
            </div>
          </div>
        </div>

        {/* Tax & Legal */}
        <div className="rounded-xl border-slate-200 shadow-sm overflow-hidden bg-white">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">Tax & Legal</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Tax Registration Number</label>
                <input className="h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold shadow-sm" name="taxRegistrationNumber" value={formData.legalDetails.taxRegistrationNumber} onChange={(e) => handleChange(e, 'legalDetails')} placeholder="TRN12345" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Company Reg Number</label>
                <input className="h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold shadow-sm" name="companyRegistrationNumber" value={formData.legalDetails.companyRegistrationNumber} onChange={(e) => handleChange(e, 'legalDetails')} placeholder="CRN12345" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Trade License No.</label>
                <input className="h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold shadow-sm" name="tradeLicense" value={formData.legalDetails.tradeLicense} onChange={(e) => handleChange(e, 'legalDetails')} placeholder="TL12345" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Trade License Expiry Date</label>
                <input className="h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold shadow-sm" type="date" name="tradeLicenseExpiryDate" value={formData.legalDetails.tradeLicenseExpiryDate} onChange={(e) => handleChange(e, 'legalDetails')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Import License No.</label>
                <input className="h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold shadow-sm" name="importLicenseNo" value={formData.legalDetails.importLicenseNo} onChange={(e) => handleChange(e, 'legalDetails')} placeholder="IL12345" />
              </div>
            </div>
          </div>
        </div>

        {/* Supplier Documents */}
        <div className="md:col-span-2 rounded-xl border-slate-200 shadow-sm overflow-hidden bg-white">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">Supplier Documents</h3>
          </div>
          <div className="p-5 space-y-6">
            {['TRADE_LICENSE', 'TAX_CERTIFICATE', 'IMPORT_LICENSE', 'OTHER_DOCUMENT'].map(type => {
              const existingDoc = formData.documents.find(d => d.documentType === type && d.fileUrl);
              const pendingDoc = complianceDocs[type];
              const titleMap = {
                TRADE_LICENSE: 'Trade License',
                TAX_CERTIFICATE: 'Tax Certificate',
                IMPORT_LICENSE: 'Import License',
                OTHER_DOCUMENT: 'Other Document'
              };

              return (
                <div key={type} className="p-5 border border-slate-200 rounded-lg bg-slate-50/50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-800">{titleMap[type]}</h3>
                    {existingDoc && (
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${existingDoc.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : existingDoc.status === 'EXPIRED' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                        {existingDoc.status}
                      </span>
                    )}
                  </div>
                  
                  {existingDoc ? (
                    <div className="flex items-center justify-between bg-white p-3 rounded border border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="bg-indigo-50 text-indigo-600 p-2 rounded">
                          <FileText size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{existingDoc.fileName || existingDoc.documentName}</p>
                          <p className="text-xs text-slate-500">
                            Uploaded: {new Date(existingDoc.uploadedAt).toLocaleDateString()}
                            {existingDoc.expiryDate && ` Ã¢â‚¬Â¢ Expires: ${new Date(existingDoc.expiryDate).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => window.open(`/api/v1/suppliers/${id}/documents/${existingDoc._id}/view?token=${localStorage.getItem('token')}`, '_blank')}>
                          View
                        </Button>
                        <Button type="button" variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => removeExistingComplianceDoc(existingDoc._id)}>
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {type === 'OTHER_DOCUMENT' && (
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Document Name</label>
                          <input className="h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold shadow-sm" value={pendingDoc.documentName} onChange={e => handleComplianceDocChange(type, 'documentName', e.target.value)} placeholder="e.g. ISO Certificate" />
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Expiry Date (Optional)</label>
                        <input className="h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold shadow-sm" type="date" value={pendingDoc.expiryDate} onChange={e => handleComplianceDocChange(type, 'expiryDate', e.target.value)} />
                      </div>
                      <div className={type === 'OTHER_DOCUMENT' ? '' : 'md:col-span-2'}>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Upload File (PDF/Image)</label>
                        <input className="h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold shadow-sm" type="file" accept=".pdf,image/jpeg,image/png,image/webp" onChange={e => handleComplianceFileChange(type, e)}  />
                        {pendingDoc.file && (
                          <p className="text-xs text-emerald-600 font-medium mt-1">Ready: {pendingDoc.file.name}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legacy Vendor Documents (Text References) */}
        <div className="md:col-span-2 rounded-xl border-slate-200 shadow-sm overflow-hidden bg-white">
          <div className="flex flex-row justify-between items-center p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">Legacy Document References</h3>
            <Button type="button" variant="outline" size="sm" onClick={addDocument} leftIcon={<Plus size={16} />}>
              Add Legacy Reference
            </Button>
          </div>
          <div className="p-5 space-y-4">
            {formData.documents.filter(d => !d.fileUrl).map((doc, idx) => (
              <div key={idx} className="flex flex-wrap items-end gap-4 p-4 border border-border rounded-md relative bg-muted/10">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-medium mb-1">Document Name</label>
                  <input className="h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold shadow-sm" value={doc.documentName} onChange={(e) => handleDocumentChange(idx, 'documentName', e.target.value)} placeholder="e.g. Contract" />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-medium mb-1">Document No.</label>
                  <input className="h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold shadow-sm" value={doc.documentNumber} onChange={(e) => handleDocumentChange(idx, 'documentNumber', e.target.value)} placeholder="No." />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-medium mb-1">File URL / Reference</label>
                  <input className="h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold shadow-sm" value={doc.documentUrl} onChange={(e) => handleDocumentChange(idx, 'documentUrl', e.target.value)} placeholder="https://..." />
                </div>
                <Button type="button" variant="ghost" className="text-red-500 px-2" onClick={() => removeDocument(idx)}>
                  <Trash2 size={18} />
                </Button>
              </div>
            ))}
            {formData.documents.filter(d => !d.fileUrl).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No legacy references added.</p>
            )}
          </div>
        </div>

        {/* Status and Remarks */}
        <div className="md:col-span-2 rounded-xl border-slate-200 shadow-sm overflow-hidden bg-white">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">Additional Information</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Status</label>
                <select className="h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 text-sm font-bold shadow-sm" name="status" value={formData.status} onChange={handleChange}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">Inactive suppliers cannot be used for new POs.</p>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Remarks</label>
                <input className="h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold shadow-sm" name="remarks" value={formData.remarks} onChange={handleChange} placeholder="Any additional notes..." />
              </div>
            </div>
          </div>
        </div>

      </div>
    </form>
  );
}

