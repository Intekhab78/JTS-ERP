import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Edit, MapPin, Phone, Mail, Building, FileText, Landmark, ShieldCheck, Camera, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardHeader, CardContent, CardTitle } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export default function SupplierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  useEffect(() => {
    fetchSupplier();
  }, [id]);

  const fetchSupplier = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/v1/suppliers/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSupplier(res.data);
    } catch (error) {
      alert('Failed to load supplier');
      navigate('/suppliers');
    } finally {
      setLoading(false);
    }
  };

  const [replacingDocId, setReplacingDocId] = useState(null);

  const handleDocumentReplace = async (e, docId) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Invalid file type. Only PDF, JPEG, PNG, and WebP are allowed.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.put(`http://localhost:5000/api/v1/suppliers/${id}/documents/${docId}`, formData, {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      fetchSupplier();
    } catch (error) {
      alert('Failed to replace document');
    }
  };

  const handleDocumentDelete = async (docId) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        await axios.delete(`http://localhost:5000/api/v1/suppliers/${id}/documents/${docId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        fetchSupplier();
      } catch (error) {
        alert('Failed to delete document');
      }
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit.');
      return;
    }

    const formData = new FormData();
    formData.append('photo', file);

    try {
      await axios.post(`http://localhost:5000/api/v1/suppliers/${id}/owner-photo`, formData, {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      fetchSupplier(); // Reload to get new photo
    } catch (error) {
      alert('Failed to upload photo');
    }
  };

  const removePhoto = async () => {
    if (window.confirm('Are you sure you want to delete the owner photo?')) {
      try {
        await axios.delete(`http://localhost:5000/api/v1/suppliers/${id}/owner-photo`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        fetchSupplier(); // Reload to clear photo
      } catch (error) {
        alert('Failed to delete photo');
      }
    }
  };

  if (loading) return <div className="p-10 text-center">Loading supplier details...</div>;
  if (!supplier) return null;

  const getLicenseStatus = (expiryDate) => {
    if (!expiryDate) return { text: 'NOT PROVIDED', color: 'bg-slate-100 text-slate-800' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expiryDate);
    exp.setHours(0, 0, 0, 0);
    
    if (exp < today) return { text: 'EXPIRED', color: 'bg-red-100 text-red-800' };
    
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    if (exp <= thirtyDaysFromNow) return { text: 'EXPIRING SOON', color: 'bg-orange-100 text-orange-800' };
    
    return { text: 'ACTIVE', color: 'bg-green-100 text-green-800' };
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button type="button" variant="ghost" onClick={() => navigate('/suppliers')} className="p-2">
            <ArrowLeft size={20} />
          </Button>
          
          {/* Owner Photo */}
          <div className="relative group shrink-0">
            <div className="w-16 h-16 rounded-full border-2 border-slate-200 flex items-center justify-center bg-indigo-50 text-indigo-700 font-bold text-xl overflow-hidden">
              {supplier.ownerPhoto?.url ? (
                <img src={`http://localhost:5000${supplier.ownerPhoto.url}`} alt={supplier.name} className="w-full h-full object-cover" />
              ) : (
                supplier.name.substring(0, 2).toUpperCase()
              )}
            </div>
            {hasPermission('EDIT_SUPPLIERS') && (
              <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                <label className="cursor-pointer text-white hover:text-indigo-300 p-1" title="Change Photo">
                  <Camera size={14} />
                  <input type="file" className="hidden" accept="image/jpeg, image/png, image/webp" onChange={handlePhotoChange} />
                </label>
                {supplier.ownerPhoto?.url && (
                  <button onClick={removePhoto} className="text-white hover:text-red-400 p-1" title="Remove Photo">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            )}
          </div>

          <PageHeader 
            title={supplier.name} 
            description={`Vendor Code: ${supplier.vendorCode || 'N/A'}`}
          />
          <Badge variant={supplier.status === 'ACTIVE' ? 'success' : 'secondary'} className="ml-2">
            {supplier.status}
          </Badge>
          <Badge variant="outline" className="ml-2">
            {supplier.vendorType || 'Other'}
          </Badge>
        </div>
        {hasPermission('EDIT_SUPPLIERS') && (
          <Button onClick={() => navigate(`/suppliers/edit/${supplier._id}`)} leftIcon={<Edit size={16} />}>
            Edit
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Quick Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Building size={16} /> Company Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Website</p>
                <p className="text-sm font-medium">{supplier.website || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{supplier.email || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm font-medium">{supplier.phone || '-'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <ShieldCheck size={16} /> Contact Person
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="text-sm font-medium">
                  {supplier.contactDetails?.firstName 
                    ? `${supplier.contactDetails.firstName} ${supplier.contactDetails.lastName || ''}` 
                    : supplier.contactName || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <div className="flex items-center gap-2 mt-1">
                  <Mail size={14} className="text-muted-foreground" />
                  <span className="text-sm font-medium">{supplier.contactDetails?.email || '-'}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mobile</p>
                <div className="flex items-center gap-2 mt-1">
                  <Phone size={14} className="text-muted-foreground" />
                  <span className="text-sm font-medium">{supplier.contactDetails?.mobile || '-'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <MapPin size={16} /> Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              {supplier.addressDetails?.address ? (
                <div className="text-sm">
                  <p>{supplier.addressDetails.address}</p>
                  <p>{supplier.addressDetails.city}, {supplier.addressDetails.state} {supplier.addressDetails.zip}</p>
                  <p>{supplier.addressDetails.country}</p>
                </div>
              ) : (
                <p className="text-sm">{supplier.address || '-'}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Deeper details */}
        <div className="md:col-span-2 space-y-6">
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Landmark size={18} /> Tax & Legal
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-y-4 gap-x-6">
              <div>
                <p className="text-xs text-muted-foreground">Tax Registration No.</p>
                <p className="text-sm font-medium">{supplier.legalDetails?.taxRegistrationNumber || supplier.taxId || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Company Reg No.</p>
                <p className="text-sm font-medium">{supplier.legalDetails?.companyRegistrationNumber || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Trade License</p>
                <p className="text-sm font-medium">{supplier.legalDetails?.tradeLicense || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Trade License Expiry Date</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-medium">
                    {supplier.legalDetails?.tradeLicenseExpiryDate 
                      ? new Date(supplier.legalDetails.tradeLicenseExpiryDate).toLocaleDateString()
                      : '-'}
                  </span>
                  {supplier.legalDetails?.tradeLicenseExpiryDate && (
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${getLicenseStatus(supplier.legalDetails.tradeLicenseExpiryDate).color}`}>
                      {getLicenseStatus(supplier.legalDetails.tradeLicenseExpiryDate).text}
                    </span>
                  )}
                  {!supplier.legalDetails?.tradeLicenseExpiryDate && (
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${getLicenseStatus(null).color}`}>
                      NOT PROVIDED
                    </span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Import License</p>
                <p className="text-sm font-medium">{supplier.legalDetails?.importLicenseNo || '-'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Landmark size={18} /> Bank Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-y-4 gap-x-6">
              <div>
                <p className="text-xs text-muted-foreground">Bank Name</p>
                <p className="text-sm font-medium">{supplier.bankDetails?.bankName || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Account Holder</p>
                <p className="text-sm font-medium">{supplier.bankDetails?.accountHolderName || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Account No.</p>
                <p className="text-sm font-medium font-mono">
                  {supplier.bankDetails?.accountNo 
                    ? `****${supplier.bankDetails.accountNo.slice(-4)}` 
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">IFSC / Swift</p>
                <p className="text-sm font-medium">{supplier.bankDetails?.ifsc || '-'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText size={18} /> Compliance Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              {supplier.documents && supplier.documents.filter(d => d.fileUrl).length > 0 ? (
                <div className="space-y-3">
                  {supplier.documents.filter(d => d.fileUrl).map((doc, idx) => (
                    <div key={idx} className="flex flex-col p-3 border border-border rounded-lg bg-slate-50">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{doc.documentName}</p>
                          <p className="text-xs text-slate-500">{doc.documentType.replace('_', ' ')} • {(doc.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${doc.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : doc.status === 'EXPIRED' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-700'}`}>
                          {doc.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-slate-500">
                          {doc.expiryDate ? `Expires: ${new Date(doc.expiryDate).toLocaleDateString()}` : 'No Expiry'}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => window.open(`http://localhost:5000/api/v1/suppliers/${id}/documents/${doc._id}/view?token=${localStorage.getItem('token')}`, '_blank')}>
                            View
                          </Button>
                          {hasPermission('EDIT_SUPPLIERS') && (
                            <>
                              <label className="cursor-pointer">
                                <span className="inline-flex items-center justify-center rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-7 px-2">Replace</span>
                                <input type="file" className="hidden" accept=".pdf,image/jpeg,image/png,image/webp" onChange={(e) => handleDocumentReplace(e, doc._id)} />
                              </label>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDocumentDelete(doc._id)}>
                                <Trash2 size={14} />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No compliance documents uploaded.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText size={18} /> Legacy References
              </CardTitle>
            </CardHeader>
            <CardContent>
              {supplier.documents && supplier.documents.filter(d => !d.fileUrl).length > 0 ? (
                <div className="space-y-3">
                  {supplier.documents.filter(d => !d.fileUrl).map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/10">
                      <div>
                        <p className="text-sm font-semibold">{doc.documentName}</p>
                        <p className="text-xs text-muted-foreground">No: {doc.documentNumber || 'N/A'}</p>
                      </div>
                      {doc.documentUrl && (
                        <a href={doc.documentUrl} target="_blank" rel="noreferrer" className="text-blue-600 text-sm hover:underline">
                          View
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No legacy references.</p>
              )}
            </CardContent>
          </Card>

          {supplier.remarks && (
            <Card>
              <CardHeader>
                <CardTitle>Remarks</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{supplier.remarks}</p>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
