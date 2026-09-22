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
    <form onSubmit={handleSubmit} className="animate-in fade-in zoom-in-95 duration-300 space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button type="button" variant="ghost" onClick={() => navigate('/suppliers')} className="p-2">
            <ArrowLeft size={20} />
          </Button>
          <PageHeader 
            title={isEdit ? 'Edit Supplier' : 'New Supplier'} 
            description={isEdit ? `Update supplier ${formData.vendorCode || ''}` : 'Create a new vendor profile in the system'} 
          />
        </div>
        <Button type="submit" disabled={submitting} leftIcon={<Save size={16} />}>
          {submitting ? 'Saving...' : 'Save Supplier'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Owner Photo */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Owner / Supplier Photo</CardTitle>
          </CardHeader>
          <CardContent>
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
                <input 
                  type="file" 
                  accept="image/jpeg, image/png, image/webp" 
                  onChange={handlePhotoChange} 
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
                <p className="text-xs text-slate-500 mt-2">Maximum file size: 5MB. Allowed formats: JPEG, PNG, WebP.</p>
                {photoFile && <p className="text-xs font-semibold text-emerald-600 mt-1">Ready to upload: {photoFile.name} ({(photoFile.size / 1024 / 1024).toFixed(2)} MB)</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Company Details */}
        <Card>
          <CardHeader>
            <CardTitle>Company Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Company Name <span className="text-red-500">*</span></label>
                <Input name="name" value={formData.name} onChange={handleChange} required placeholder="Acme Corp" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Vendor Type</label>
                <Select name="vendorType" value={formData.vendorType} onChange={handleChange}>
                  <option value="Transport">Transport</option>
                  <option value="Packaging">Packaging</option>
                  <option value="Food">Food</option>
                  <option value="Other">Other</option>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Vendor Code</label>
                <Input name="vendorCode" value={formData.vendorCode} onChange={handleChange} placeholder="Auto-generated if empty" disabled={isEdit && formData.vendorCode} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Website</label>
                <Input name="website" value={formData.website} onChange={handleChange} placeholder="https://example.com" type="url" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Company Email</label>
                <Input name="email" value={formData.email} onChange={handleChange} type="email" placeholder="contact@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Company Mobile</label>
                <Input name="phone" value={formData.phone} onChange={handleChange} placeholder="+1234567890" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Details */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Person</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">First Name</label>
                <Input name="firstName" value={formData.contactDetails.firstName} onChange={(e) => handleChange(e, 'contactDetails')} placeholder="John" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Last Name</label>
                <Input name="lastName" value={formData.contactDetails.lastName} onChange={(e) => handleChange(e, 'contactDetails')} placeholder="Doe" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input name="email" type="email" value={formData.contactDetails.email} onChange={(e) => handleChange(e, 'contactDetails')} placeholder="john@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mobile</label>
                <Input name="mobile" value={formData.contactDetails.mobile} onChange={(e) => handleChange(e, 'contactDetails')} placeholder="+1234567890" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address Details */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Address Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Street Address</label>
              <Input name="address" value={formData.addressDetails.address} onChange={(e) => handleChange(e, 'addressDetails')} placeholder="123 Main St" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">City</label>
                <Input name="city" value={formData.addressDetails.city} onChange={(e) => handleChange(e, 'addressDetails')} placeholder="City" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">State / Province</label>
                <Input name="state" value={formData.addressDetails.state} onChange={(e) => handleChange(e, 'addressDetails')} placeholder="State" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ZIP / Postal Code</label>
                <Input name="zip" value={formData.addressDetails.zip} onChange={(e) => handleChange(e, 'addressDetails')} placeholder="ZIP Code" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Country</label>
                <Input name="country" value={formData.addressDetails.country} onChange={(e) => handleChange(e, 'addressDetails')} placeholder="Country" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bank Details */}
        <Card>
          <CardHeader>
            <CardTitle>Bank Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Bank Name</label>
                <Input name="bankName" value={formData.bankDetails.bankName} onChange={(e) => handleChange(e, 'bankDetails')} placeholder="Chase Bank" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Account Holder</label>
                <Input name="accountHolderName" value={formData.bankDetails.accountHolderName} onChange={(e) => handleChange(e, 'bankDetails')} placeholder="Acme Corp LLC" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Account No.</label>
                <Input name="accountNo" value={formData.bankDetails.accountNo} onChange={(e) => handleChange(e, 'bankDetails')} placeholder="123456789" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">IFSC / Routing / Swift</label>
                <Input name="ifsc" value={formData.bankDetails.ifsc} onChange={(e) => handleChange(e, 'bankDetails')} placeholder="Code" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Branch Name</label>
              <Input name="branchName" value={formData.bankDetails.branchName} onChange={(e) => handleChange(e, 'bankDetails')} placeholder="Downtown Branch" />
            </div>
          </CardContent>
        </Card>

        {/* Tax & Legal */}
        <Card>
          <CardHeader>
            <CardTitle>Tax & Legal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tax Registration Number</label>
                <Input name="taxRegistrationNumber" value={formData.legalDetails.taxRegistrationNumber} onChange={(e) => handleChange(e, 'legalDetails')} placeholder="TRN12345" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Company Reg Number</label>
                <Input name="companyRegistrationNumber" value={formData.legalDetails.companyRegistrationNumber} onChange={(e) => handleChange(e, 'legalDetails')} placeholder="CRN12345" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Trade License No.</label>
                <Input name="tradeLicense" value={formData.legalDetails.tradeLicense} onChange={(e) => handleChange(e, 'legalDetails')} placeholder="TL12345" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Trade License Expiry Date</label>
                <Input type="date" name="tradeLicenseExpiryDate" value={formData.legalDetails.tradeLicenseExpiryDate} onChange={(e) => handleChange(e, 'legalDetails')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Import License No.</label>
                <Input name="importLicenseNo" value={formData.legalDetails.importLicenseNo} onChange={(e) => handleChange(e, 'legalDetails')} placeholder="IL12345" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Supplier Documents */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Supplier Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
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
                            {existingDoc.expiryDate && ` • Expires: ${new Date(existingDoc.expiryDate).toLocaleDateString()}`}
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
                          <Input value={pendingDoc.documentName} onChange={e => handleComplianceDocChange(type, 'documentName', e.target.value)} placeholder="e.g. ISO Certificate" />
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Expiry Date (Optional)</label>
                        <Input type="date" value={pendingDoc.expiryDate} onChange={e => handleComplianceDocChange(type, 'expiryDate', e.target.value)} />
                      </div>
                      <div className={type === 'OTHER_DOCUMENT' ? '' : 'md:col-span-2'}>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Upload File (PDF/Image)</label>
                        <input type="file" accept=".pdf,image/jpeg,image/png,image/webp" onChange={e => handleComplianceFileChange(type, e)} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" />
                        {pendingDoc.file && (
                          <p className="text-xs text-emerald-600 font-medium mt-1">Ready: {pendingDoc.file.name}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Legacy Vendor Documents (Text References) */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>Legacy Document References</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addDocument} leftIcon={<Plus size={16} />}>
              Add Legacy Reference
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.documents.filter(d => !d.fileUrl).map((doc, idx) => (
              <div key={idx} className="flex flex-wrap items-end gap-4 p-4 border border-border rounded-md relative bg-muted/10">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-medium mb-1">Document Name</label>
                  <Input value={doc.documentName} onChange={(e) => handleDocumentChange(idx, 'documentName', e.target.value)} placeholder="e.g. Contract" />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-medium mb-1">Document No.</label>
                  <Input value={doc.documentNumber} onChange={(e) => handleDocumentChange(idx, 'documentNumber', e.target.value)} placeholder="No." />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-medium mb-1">File URL / Reference</label>
                  <Input value={doc.documentUrl} onChange={(e) => handleDocumentChange(idx, 'documentUrl', e.target.value)} placeholder="https://..." />
                </div>
                <Button type="button" variant="ghost" className="text-red-500 px-2" onClick={() => removeDocument(idx)}>
                  <Trash2 size={18} />
                </Button>
              </div>
            ))}
            {formData.documents.filter(d => !d.fileUrl).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No legacy references added.</p>
            )}
          </CardContent>
        </Card>

        {/* Status and Remarks */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <Select name="status" value={formData.status} onChange={handleChange}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Inactive suppliers cannot be used for new POs.</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Remarks</label>
                <Input name="remarks" value={formData.remarks} onChange={handleChange} placeholder="Any additional notes..." />
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </form>
  );
}
