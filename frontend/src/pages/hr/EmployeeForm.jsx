import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { getFileUrl } from '../../config/api';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { FormField } from '../../components/common/FormField';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';
import { QuickAddModal } from '../../components/common/QuickAddModal';
import { UserCircle, Save, ArrowLeft, User, Briefcase, Phone, Users, AlertTriangle, FileText, DollarSign, Clock, Shield, X, Plus } from 'lucide-react';
import DocumentManager from '../../components/hr/DocumentManager'; // Assuming this is built next

const EmployeeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Lists
  const [departments, setDepartments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [locations, setLocations] = useState([]);
  const [teams, setTeams] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [jobLevels, setJobLevels] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);

  // UI States
  const [activeTab, setActiveTab] = useState('personal');
  const [sameAsCurrent, setSameAsCurrent] = useState(false);
  const [quickAddConfig, setQuickAddConfig] = useState({ isOpen: false, endpoint: '', title: '', targetField: '' });
  const [photoFile, setPhotoFile] = useState(null);
  const [pendingDocuments, setPendingDocuments] = useState([]); // Array of { file, documentTypeId, documentNumber, expiryDate }
  const [isAddingPendingDoc, setIsAddingPendingDoc] = useState(false);

  const [formData, setFormData] = useState({
    // Personal
    firstName: '', middleName: '', lastName: '', preferredName: '', dateOfBirth: '', gender: 'MALE', maritalStatus: 'SINGLE', nationality: '', bloodGroup: '',
    
    // Employment
    hireDate: new Date().toISOString().split('T')[0],
    lastWorkingDate: '',
    probationStartDate: '', probationEndDate: '', confirmationDate: '', noticePeriod: '',
    contractStartDate: '', contractEndDate: '',
    employmentType: 'FULL_TIME', status: 'ACTIVE',
    departmentId: '', branchId: '', locationId: '', teamId: '', managerId: '',
    jobTitle: '', designationId: '', jobLevelId: '',
    
    // Contact & Address
    personalEmail: '', email: '', personalMobile: '', phone: '', alternateMobile: '',
    currentAddress: { addressLine1: '', addressLine2: '', city: '', stateProvince: '', country: '', postalCode: '' },
    permanentAddress: { addressLine1: '', addressLine2: '', city: '', stateProvince: '', country: '', postalCode: '' },
    
    // Family
    familyMembers: [],
    
    // Emergency
    emergencyContacts: [],
    emergencyContactName: '', // Legacy
    emergencyContactRelation: '', // Legacy
    emergencyContactMobile: '', // Legacy
    
    // Payroll & Bank
    bankDetails: { bankName: '', branchName: '', branchCode: '', accountHolderName: '', accountNumber: '', iban: '', swiftBic: '', ifscCode: '', routingNumber: '' },
    
    // Attendance
    shiftId: '', biometricId: '', mobileAttendanceEnabled: false, overtimeEligible: false,
    
    // Legacy Identifiers
    baseSalary: '', pan: '', maskedAadhaar: '', emiratesId: ''
  });

  const tabs = [
    { id: 'personal', label: 'Personal', icon: User },
    { id: 'employment', label: 'Employment', icon: Briefcase },
    { id: 'contact', label: 'Contact & Address', icon: Phone },
    { id: 'family', label: 'Family', icon: Users },
    { id: 'emergency', label: 'Emergency', icon: AlertTriangle },
    { id: 'identity', label: 'Identity & Docs', icon: FileText },
    { id: 'payroll', label: 'Payroll & Bank', icon: DollarSign },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'erp', label: 'ERP Access', icon: Shield }
  ];

  useEffect(() => {
    fetchFormData();
    if (isEditing) fetchEmployee();
  }, [id]);

  const fetchFormData = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const [deptRes, branchRes, empRes, locRes, teamRes, desigRes, jobLevelRes, shiftRes, docTypeRes] = await Promise.all([
        axios.get('/api/v1/hr/departments', { headers }).catch(()=>({data:[]})),
        axios.get('/api/v1/branches', { headers }).catch(()=>({data:[]})),
        axios.get('/api/v1/hr/employees', { headers }).catch(()=>({data:[]})),
        axios.get('/api/v1/hr/locations', { headers }).catch(()=>({data:[]})),
        axios.get('/api/v1/hr/teams', { headers }).catch(()=>({data:[]})),
        axios.get('/api/v1/hr/designations', { headers }).catch(()=>({data:[]})),
        axios.get('/api/v1/hr/job-levels', { headers }).catch(()=>({data:[]})),
        axios.get('/api/v1/hr/shifts', { headers }).catch(()=>({data:[]})),
        axios.get('/api/v1/hr/document-types', { headers }).catch(()=>({data:[]}))
      ]);
      setDepartments(deptRes.data); setBranches(branchRes.data); setEmployees(empRes.data);
      setLocations(locRes.data); setTeams(teamRes.data); setDesignations(desigRes.data);
      setJobLevels(jobLevelRes.data); setShifts(shiftRes.data); setDocumentTypes(docTypeRes.data);
    } catch (error) { console.error(error); }
  };

  const fetchEmployee = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`/api/v1/hr/employees/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = res.data;
      const formatDate = (d) => d ? d.split('T')[0] : '';
      setFormData({
        ...data,
        dateOfBirth: formatDate(data.dateOfBirth), hireDate: formatDate(data.hireDate),
        lastWorkingDate: formatDate(data.lastWorkingDate),
        probationStartDate: formatDate(data.probationStartDate), probationEndDate: formatDate(data.probationEndDate),
        confirmationDate: formatDate(data.confirmationDate), contractStartDate: formatDate(data.contractStartDate), contractEndDate: formatDate(data.contractEndDate),
        departmentId: data.departmentId?._id || data.departmentId || '', branchId: data.branchId?._id || data.branchId || '',
        locationId: data.locationId?._id || data.locationId || '', teamId: data.teamId?._id || data.teamId || '',
        designationId: data.designationId?._id || data.designationId || '', jobLevelId: data.jobLevelId?._id || data.jobLevelId || '',
        managerId: data.managerId?._id || data.managerId || '', shiftId: data.shiftId?._id || data.shiftId || '',
        currentAddress: data.currentAddress || { addressLine1: '', addressLine2: '', city: '', stateProvince: '', country: '', postalCode: '' },
        permanentAddress: data.permanentAddress || { addressLine1: '', addressLine2: '', city: '', stateProvince: '', country: '', postalCode: '' },
        familyMembers: data.familyMembers || [],
        emergencyContacts: data.emergencyContacts || [],
        bankDetails: data.bankDetails || { bankName: '', branchName: '', branchCode: '', accountHolderName: '', accountNumber: '', iban: '', swiftBic: '', ifscCode: '', routingNumber: '' },
      });
    } catch (error) {
      alert('Failed to fetch employee details'); navigate('/employees');
    } finally { setIsLoading(false); }
  };

  const handleChange = (e, section) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    if (section) {
      setFormData(prev => ({ ...prev, [section]: { ...prev[section], [name]: val } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: val }));
    }
  };

  const handleSameAsCurrent = (e) => {
    const checked = e.target.checked;
    setSameAsCurrent(checked);
    if (checked) {
      setFormData(prev => ({ ...prev, permanentAddress: { ...prev.currentAddress } }));
    }
  };

  const addArrayItem = (field, emptyItem) => {
    setFormData(prev => ({ ...prev, [field]: [...prev[field], emptyItem] }));
  };

  const updateArrayItem = (field, index, subField, value) => {
    const updated = [...formData[field]];
    updated[index][subField] = value;
    setFormData(prev => ({ ...prev, [field]: updated }));
  };

  const removeArrayItem = (field, index) => {
    const updated = formData[field].filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, [field]: updated }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = isEditing ? `/api/v1/hr/employees/${id}` : '/api/v1/hr/employees';
      const method = isEditing ? 'put' : 'post';
      
      const payload = JSON.parse(JSON.stringify(formData));
      payload.baseSalary = Number(payload.baseSalary) || 0;
      
      // Clean up
      Object.keys(payload).forEach(key => {
        if (typeof payload[key] === 'string') payload[key] = payload[key].trim();
        if (payload[key] === '' || payload[key] === null) delete payload[key];
      });
      
      if (payload.familyMembers) {
        payload.familyMembers.forEach(member => {
          delete member.fileToUpload;
        });
      }

      const res = await axios[method](url, payload, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      const newEmployeeId = isEditing ? id : res.data._id;

      if (photoFile) {
        const photoData = new FormData();
        photoData.append('photo', photoFile);
        await axios.post(`/api/v1/hr/employees/${newEmployeeId}/photo`, photoData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'multipart/form-data' }
        });
      }
      
      if (!isEditing && pendingDocuments.length > 0) {
        for (const doc of pendingDocuments) {
          const docData = new FormData();
          docData.append('file', doc.file);
          docData.append('documentTypeId', doc.documentTypeId);
          if (doc.documentNumber) docData.append('documentNumber', doc.documentNumber);
          if (doc.expiryDate) docData.append('expiryDate', doc.expiryDate);
          
          await axios.post(`/api/v1/hr/employees/${newEmployeeId}/documents`, docData, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'multipart/form-data' }
          });
        }
      }

      // Upload family member documents sequentially
      for (let i = 0; i < formData.familyMembers.length; i++) {
        const member = formData.familyMembers[i];
        if (member.fileToUpload) {
          const familyDocData = new FormData();
          familyDocData.append('document', member.fileToUpload);
          await axios.post(`/api/v1/hr/employees/${newEmployeeId}/family/${i}/document`, familyDocData, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'multipart/form-data' }
          });
        }
      }

      navigate(`/employees/${newEmployeeId}`);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading...</div>;

  const LabelWithAdd = ({ text, endpoint, targetField, customFields }) => (
    <div className="flex justify-between items-center w-full">
      <span>{text}</span>
      <button 
        type="button" 
        onClick={() => setQuickAddConfig({ isOpen: true, endpoint, title: `Add New ${text}`, targetField, fields: customFields || [{ name: 'name', label: 'Name', required: true }] })}
        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold tracking-wide"
      >
        [+ ADD]
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 -m-6 p-6 font-sans">
      <div className="max-w-6xl mx-auto pb-20 animate-in fade-in duration-500">
        
        {/* Top Header - White Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/employees')} className="p-2 h-10 w-10 shrink-0 border border-slate-200"><ArrowLeft size={18} className="text-slate-500" /></Button>
            <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold text-lg shrink-0"><UserCircle size={24} /></div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                {isEditing ? 'Edit Employee' : 'New Employee'}
                {!isEditing && <span className="text-[10px] bg-orange-50 border border-orange-200 text-orange-600 px-2 py-0.5 rounded font-medium tracking-wide">Unsaved Record</span>}
              </h1>
              <p className="text-xs text-slate-500">Comprehensive employee master data repository and access provisioning</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={() => navigate('/employees')} className="text-sm h-9 border-slate-300 text-slate-700 font-medium">Cancel</Button>
            <Button type="button" variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50/50 text-sm h-9 px-4 font-medium hover:bg-indigo-50">Save as Draft</Button>
            <Button type="submit" form="employeeForm" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm h-9 px-6 shadow-sm font-medium">
              <Save size={16} className="mr-2" /> {isSubmitting ? 'Saving...' : 'Save Employee'}
            </Button>
          </div>
        </div>

        <form id="employeeForm" onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-6 items-start">
          
          {/* Sidebar Tabs - Master Data Sections */}
          <div className="w-full md:w-64 bg-white p-4 rounded-xl border border-slate-200 shadow-sm sticky top-4 shrink-0">
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 px-2">MASTER DATA SECTIONS</h4>
            <p className="text-[10px] text-slate-400 mb-4 px-2">9 Core Verification Sections</p>
            <div className="flex flex-col gap-1">
              {tabs.map((tab, idx) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    const el = document.getElementById("section-" + tab.id);
                    if (el) {
                      const y = el.getBoundingClientRect().top + window.scrollY - 100;
                      window.scrollTo({ top: y, behavior: 'smooth' });
                    }
                  }}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all font-medium ${
                    activeTab === tab.id 
                      ? 'bg-indigo-50 text-indigo-700' 
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <tab.icon size={16} className={activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400'} />
                    {tab.label}
                  </div>
                  {activeTab === tab.id && <span className="text-[10px] font-bold text-indigo-600 bg-white px-1.5 py-0.5 rounded shadow-sm">Active</span>}
                  {activeTab !== tab.id && tab.id === 'employment' && <span className="text-[10px] font-bold text-amber-600">Required</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Form Content - Continuous Scroll container */}
          <div className="flex-1 w-full max-w-4xl bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-12">
            
            <div id="section-personal" className="space-y-8 scroll-mt-24 pb-12 border-b border-slate-100 last:border-0">
                
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
      <div>
        <h3 className="text-lg font-bold text-slate-800">Personal Information</h3>
        <p className="text-xs text-slate-500 mt-1">Legal identification details, biometric photograph, and personal status.</p>
      </div>
      <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">Step 1 of 9</span>
    </div>
                <div className="mb-8">
                  <label className="block text-[11px] font-bold text-slate-500 mb-4 uppercase tracking-wide">Profile Photo</label>
                  <div className="flex items-center gap-6">
                    <div className="h-20 w-20 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200 overflow-hidden shrink-0">
                       {formData.profilePhoto?.url ? (
                         <img src={formData.profilePhoto.url.startsWith('http') ? formData.profilePhoto.url : getFileUrl(formData.profilePhoto.url)} alt="Profile" className="h-full w-full object-cover" />
                       ) : (
                         <User size={32} className="text-slate-300" />
                       )}
                    </div>
                    <div>
                      <label className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer w-fit">
                        <UserCircle size={16} /> Choose File
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={e => setPhotoFile(e.target.files[0])}
                          className="hidden" 
                        />
                      </label>
                      <p className="text-xs text-slate-500 mt-2">
                         {photoFile ? photoFile.name : 'No file chosen (Accepts JPG, PNG up to 5MB)'}
                      </p>
                      {formData.profilePhoto?.url && !photoFile && <p className="text-xs text-amber-600 mt-1">Selecting a new photo will replace the existing one.</p>}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField label="First Name" required><Input name="firstName" value={formData.firstName} onChange={handleChange} required placeholder="e.g. Alexander" /></FormField>
                  <FormField label="Middle Name"><Input name="middleName" value={formData.middleName || ''} onChange={handleChange} placeholder="e.g. Vance" /></FormField>
                  <FormField label="Last Name" required><Input name="lastName" value={formData.lastName} onChange={handleChange} required placeholder="e.g. Sterling" /></FormField>
                  <FormField label="Preferred Name"><Input name="preferredName" value={formData.preferredName || ''} onChange={handleChange} placeholder="e.g. Alex" /></FormField>
                  <FormField label="Date of Birth"><Input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} /></FormField>
                  <FormField label="Gender">
                    <Select name="gender" value={formData.gender} onChange={handleChange}>
                      <option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option>
                    </Select>
                  </FormField>
                  <FormField label="Marital Status">
                    <Select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange}>
                      <option value="SINGLE">Single</option><option value="MARRIED">Married</option><option value="DIVORCED">Divorced</option><option value="WIDOWED">Widowed</option>
                    </Select>
                  </FormField>
                  <FormField label="Nationality"><Input name="nationality" value={formData.nationality || ''} onChange={handleChange} placeholder="e.g. United Arab Emirates" /></FormField>
                  <FormField label="Blood Group"><Input name="bloodGroup" value={formData.bloodGroup || ''} onChange={handleChange} placeholder="e.g. O positive (O+)" /></FormField>
                </div>
              </div>

            <div id="section-employment" className="space-y-8 scroll-mt-24 pb-12 border-b border-slate-100 last:border-0">
                
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
      <div>
        <h3 className="text-lg font-bold text-slate-800">Employment Details</h3>
        <p className="text-xs text-slate-500 mt-1">Contractual terms, organizational hierarchy, department mapping, and probation cycle.</p>
      </div>
      <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">Step 2 of 9</span>
    </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField label="Joining Date" required><Input type="date" name="hireDate" value={formData.hireDate} onChange={handleChange} required /></FormField>
                  <FormField label="Employment Type">
                    <Select name="employmentType" value={formData.employmentType} onChange={handleChange}>
                      <option value="FULL_TIME">Full Time</option><option value="PART_TIME">Part Time</option><option value="CONTRACT">Contract</option><option value="PROBATION">Probation</option>
                    </Select>
                  </FormField>
                  <FormField label="Status">
                    <Select name="status" value={formData.status} onChange={handleChange}>
                      <option value="ACTIVE">Active</option><option value="ON_LEAVE">On Leave</option><option value="RESIGNED">Resigned</option><option value="TERMINATED">Terminated</option>
                    </Select>
                  </FormField>
                  <FormField label={<LabelWithAdd text="Department" endpoint="/api/v1/hr/departments" targetField="departmentId" />} required>
                    <Select name="departmentId" value={formData.departmentId} onChange={handleChange} required>
                      <option value="">Select</option>{departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                    </Select>
                  </FormField>
                  <FormField label={<LabelWithAdd text="Branch" endpoint="/api/v1/branches" targetField="branchId" />} required>
                    <Select name="branchId" value={formData.branchId} onChange={handleChange} required>
                      <option value="">Select</option>{branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                    </Select>
                  </FormField>
                  <FormField label={<LabelWithAdd text="Location" endpoint="/api/v1/hr/locations" targetField="locationId" />}>
                    <Select name="locationId" value={formData.locationId} onChange={handleChange}>
                      <option value="">Select</option>{locations.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
                    </Select>
                  </FormField>
                  <FormField label="Job Title" required><Input name="jobTitle" value={formData.jobTitle} onChange={handleChange} required /></FormField>
                  <FormField label={<LabelWithAdd text="Designation" endpoint="/api/v1/hr/designations" targetField="designationId" />}>
                    <Select name="designationId" value={formData.designationId} onChange={handleChange}>
                      <option value="">Select</option>{designations.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                    </Select>
                  </FormField>
                  <FormField label={<LabelWithAdd text="Job Level" endpoint="/api/v1/hr/job-levels" targetField="jobLevelId" />}>
                    <Select name="jobLevelId" value={formData.jobLevelId} onChange={handleChange}>
                      <option value="">Select</option>{jobLevels.map(j => <option key={j._id} value={j._id}>{j.name}</option>)}
                    </Select>
                  </FormField>
                  <FormField label="Reporting Manager">
                    <Select name="managerId" value={formData.managerId} onChange={handleChange}>
                      <option value="">None</option>{employees.map(e => <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>)}
                    </Select>
                  </FormField>
                  <FormField label="Probation Start"><Input type="date" name="probationStartDate" value={formData.probationStartDate} onChange={handleChange} /></FormField>
                  <FormField label="Probation End"><Input type="date" name="probationEndDate" value={formData.probationEndDate} onChange={handleChange} /></FormField>
                  <FormField label="Confirmation Date"><Input type="date" name="confirmationDate" value={formData.confirmationDate} onChange={handleChange} /></FormField>
                  <FormField label="Contract Start"><Input type="date" name="contractStartDate" value={formData.contractStartDate} onChange={handleChange} /></FormField>
                  <FormField label="Contract End"><Input type="date" name="contractEndDate" value={formData.contractEndDate} onChange={handleChange} /></FormField>
                  <FormField label="Last Working Date (Termination)"><Input type="date" name="lastWorkingDate" value={formData.lastWorkingDate} onChange={handleChange} /></FormField>
                </div>
              </div>

            <div id="section-contact" className="space-y-8 scroll-mt-24 pb-12 border-b border-slate-100 last:border-0">
                
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
      <div>
        <h3 className="text-lg font-bold text-slate-800">Contact & Address</h3>
        <p className="text-xs text-slate-500 mt-1">Communication channels and residential locations.</p>
      </div>
      <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">Step 3 of 9</span>
    </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Work Email"><Input type="email" name="email" value={formData.email} onChange={handleChange} /></FormField>
                  <FormField label="Personal Email"><Input type="email" name="personalEmail" value={formData.personalEmail || ''} onChange={handleChange} /></FormField>
                  <FormField label="Work Mobile"><Input name="phone" value={formData.phone} onChange={handleChange} /></FormField>
                  <FormField label="Personal Mobile"><Input name="personalMobile" value={formData.personalMobile || ''} onChange={handleChange} /></FormField>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-medium text-slate-700 mb-3">Current Address</h4>
                    <div className="space-y-3">
                      <Input placeholder="Address Line 1" name="addressLine1" value={formData.currentAddress.addressLine1} onChange={(e) => handleChange(e, 'currentAddress')} />
                      <Input placeholder="Address Line 2" name="addressLine2" value={formData.currentAddress.addressLine2} onChange={(e) => handleChange(e, 'currentAddress')} />
                      <div className="grid grid-cols-2 gap-3">
                        <Input placeholder="City" name="city" value={formData.currentAddress.city} onChange={(e) => handleChange(e, 'currentAddress')} />
                        <Input placeholder="State/Province" name="stateProvince" value={formData.currentAddress.stateProvince} onChange={(e) => handleChange(e, 'currentAddress')} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input placeholder="Country" name="country" value={formData.currentAddress.country} onChange={(e) => handleChange(e, 'currentAddress')} />
                        <Input placeholder="Postal Code" name="postalCode" value={formData.currentAddress.postalCode} onChange={(e) => handleChange(e, 'currentAddress')} />
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium text-slate-700">Permanent Address</h4>
                      <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input type="checkbox" checked={sameAsCurrent} onChange={handleSameAsCurrent} className="rounded border-slate-300" />
                        Same as Current
                      </label>
                    </div>
                    <div className={`space-y-3 ${sameAsCurrent ? 'opacity-50 pointer-events-none' : ''}`}>
                      <Input placeholder="Address Line 1" name="addressLine1" value={formData.permanentAddress.addressLine1} onChange={(e) => handleChange(e, 'permanentAddress')} />
                      <Input placeholder="Address Line 2" name="addressLine2" value={formData.permanentAddress.addressLine2} onChange={(e) => handleChange(e, 'permanentAddress')} />
                      <div className="grid grid-cols-2 gap-3">
                        <Input placeholder="City" name="city" value={formData.permanentAddress.city} onChange={(e) => handleChange(e, 'permanentAddress')} />
                        <Input placeholder="State/Province" name="stateProvince" value={formData.permanentAddress.stateProvince} onChange={(e) => handleChange(e, 'permanentAddress')} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input placeholder="Country" name="country" value={formData.permanentAddress.country} onChange={(e) => handleChange(e, 'permanentAddress')} />
                        <Input placeholder="Postal Code" name="postalCode" value={formData.permanentAddress.postalCode} onChange={(e) => handleChange(e, 'permanentAddress')} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            <div id="section-family" className="space-y-8 scroll-mt-24 pb-12 border-b border-slate-100 last:border-0">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-light text-slate-900 tracking-tight">Family Members</h3>
                    <p className="text-sm text-slate-500 mt-1">Dependents and family details.</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem('familyMembers', { name: '', relationship: '', gender: 'MALE' })}>
                    + Add Member
                  </Button>
                </div>
                {formData.familyMembers.length === 0 ? (
                  <p className="text-slate-500 italic text-sm">No family members added.</p>
                ) : (
                  formData.familyMembers.map((member, idx) => (
                    <div key={idx} className="bg-slate-50 p-4 rounded-md border border-slate-200 relative mb-4">
                      <button type="button" onClick={() => removeArrayItem('familyMembers', idx)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-sm">Remove</button>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
                        <FormField label="Name"><Input value={member.name} onChange={e => updateArrayItem('familyMembers', idx, 'name', e.target.value)} /></FormField>
                        <FormField label="Relationship"><Input value={member.relationship} onChange={e => updateArrayItem('familyMembers', idx, 'relationship', e.target.value)} /></FormField>
                        <FormField label="Gender">
                           <Select value={member.gender} onChange={e => updateArrayItem('familyMembers', idx, 'gender', e.target.value)}>
                              <option value="MALE">Male</option><option value="FEMALE">Female</option>
                           </Select>
                        </FormField>
                        <FormField label="Mobile"><Input value={member.mobile || ''} onChange={e => updateArrayItem('familyMembers', idx, 'mobile', e.target.value)} /></FormField>
                        <div className="col-span-1 md:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 pt-3 mt-1">
                          <FormField label={
                            <div className="flex justify-between items-center w-full">
                              <span>Document Type (Optional)</span>
                              <button type="button" onClick={() => setQuickAddConfig({
                                isOpen: true,
                                endpoint: '/api/v1/hr/document-types',
                                title: 'Add Document Type',
                                targetField: `familyMemberDocType-${idx}`,
                                fields: [
                                  { name: 'name', label: 'Name', required: true },
                                  { name: 'code', label: 'Short Code (e.g. ID, PASS)', required: true }
                                ]
                              })} className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold tracking-wide" title="Add New Document Type">
                                [+ ADD]
                              </button>
                            </div>
                          }>
                            <Select value={member.documentType || ''} onChange={e => updateArrayItem('familyMembers', idx, 'documentType', e.target.value)} className="w-full">
                               <option value="">Select Type...</option>
                               {documentTypes.map(t => <option key={t._id} value={t.name}>{t.name}</option>)}
                            </Select>
                          </FormField>
                          <FormField label="Upload Document">
                             <div className="flex flex-col gap-1">
                               <input 
                                 type="file" 
                                 onChange={e => updateArrayItem('familyMembers', idx, 'fileToUpload', e.target.files[0])}
                                 className="w-full text-sm text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 border border-slate-300 rounded bg-white"
                               />
                               {member.documentName && <span className="text-xs text-slate-500 truncate">Current: {member.documentName}</span>}
                             </div>
                          </FormField>
                        </div>
                        <div className="col-span-1 md:col-span-4 flex gap-4 mt-2">
                          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={member.isDependent || false} onChange={e => updateArrayItem('familyMembers', idx, 'isDependent', e.target.checked)} /> Is Dependent</label>
                          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={member.isEmergencyContact || false} onChange={e => updateArrayItem('familyMembers', idx, 'isEmergencyContact', e.target.checked)} /> Mark as Emergency Contact</label>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

            <div id="section-emergency" className="space-y-8 scroll-mt-24 pb-12 border-b border-slate-100 last:border-0">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-light text-slate-900 tracking-tight">Emergency Contacts</h3>
                    <p className="text-sm text-slate-500 mt-1">Who to reach out to in case of an emergency.</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem('emergencyContacts', { name: '', relationship: '', mobile: '' })}>
                    + Add Contact
                  </Button>
                </div>
                {/* Legacy Emergency flat fields compatibility */}
                {(formData.emergencyContactName && formData.emergencyContacts.length === 0) && (
                   <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                     Legacy Emergency Contact detected: {formData.emergencyContactName} ({formData.emergencyContactRelation}) - {formData.emergencyContactMobile}. Please add them via the button above for full compatibility.
                   </div>
                )}

                {formData.emergencyContacts.length === 0 ? (
                  <p className="text-slate-500 italic text-sm">No emergency contacts added.</p>
                ) : (
                  formData.emergencyContacts.map((contact, idx) => (
                    <div key={idx} className="bg-slate-50 p-4 rounded-md border border-slate-200 relative mb-4">
                      <button type="button" onClick={() => removeArrayItem('emergencyContacts', idx)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-sm">Remove</button>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                        <FormField label="Contact Name"><Input value={contact.name} onChange={e => updateArrayItem('emergencyContacts', idx, 'name', e.target.value)} /></FormField>
                        <FormField label="Relationship"><Input value={contact.relationship} onChange={e => updateArrayItem('emergencyContacts', idx, 'relationship', e.target.value)} /></FormField>
                        <FormField label="Mobile Number"><Input value={contact.mobile} onChange={e => updateArrayItem('emergencyContacts', idx, 'mobile', e.target.value)} /></FormField>
                        <FormField label="Alternate Mobile"><Input value={contact.alternateMobile || ''} onChange={e => updateArrayItem('emergencyContacts', idx, 'alternateMobile', e.target.value)} /></FormField>
                        <FormField label="Email Address"><Input type="email" value={contact.email || ''} onChange={e => updateArrayItem('emergencyContacts', idx, 'email', e.target.value)} /></FormField>
                        <FormField label="Full Address"><Input value={contact.address || ''} onChange={e => updateArrayItem('emergencyContacts', idx, 'address', e.target.value)} /></FormField>
                      </div>
                    </div>
                  ))
                )}
              </div>

            <div id="section-identity" className="space-y-8 scroll-mt-24 pb-12 border-b border-slate-100 last:border-0">
                
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
      <div>
        <h3 className="text-lg font-bold text-slate-800">Family Members</h3>
        <p className="text-xs text-slate-500 mt-1">Dependents and family details.</p>
      </div>
      <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">Step 4 of 9</span>
    </div>

                {isEditing ? (
                  <div className="mt-8 border-t pt-4">
                    {DocumentManager ? <DocumentManager employeeId={id} /> : <div className="text-sm">Document Manager component not loaded.</div>}
                  </div>
                ) : (
                  <div className="mt-8 border-t pt-4">
                    <h4 className="font-medium text-slate-700 mb-3">Add Initial Documents</h4>
                    <div className="bg-white border rounded-lg overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-100 text-slate-600 font-medium border-b border-slate-200">
                          <tr>
                            <th className="py-3 px-4">
                              <div className="flex justify-between items-center">
                                <span>Document Type</span>
                                {isAddingPendingDoc && (
                                  <button type="button" onClick={() => setQuickAddConfig({
                                    isOpen: true,
                                    endpoint: '/api/v1/hr/document-types',
                                    title: 'Add Document Type',
                                    targetField: 'pendingDocType',
                                    fields: [
                                      { name: 'name', label: 'Name', required: true },
                                      { name: 'code', label: 'Short Code (e.g. ID, PASS)', required: true }
                                    ]
                                  })} className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold tracking-wide" title="Add New Document Type">
                                    [+ ADD]
                                  </button>
                                )}
                              </div>
                            </th>
                            <th className="py-3 px-4">Document Number</th>
                            <th className="py-3 px-4">Expiry</th>
                            <th className="py-3 px-4">File</th>
                            <th className="py-3 px-4 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {pendingDocuments.map((doc, i) => {
                            const typeName = documentTypes.find(t => t._id === doc.documentTypeId)?.name || 'Unknown';
                            return (
                              <tr key={doc.id} className="hover:bg-slate-50/50">
                                <td className="py-3 px-4 font-medium text-slate-900">{typeName}</td>
                                <td className="py-3 px-4 text-slate-600">{doc.documentNumber || '-'}</td>
                                <td className="py-3 px-4 text-slate-600">{doc.expiryDate || '-'}</td>
                                <td className="py-3 px-4 text-slate-600">{doc.file.name}</td>
                                <td className="py-3 px-4 text-center">
                                  <button type="button" onClick={() => setPendingDocuments(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-700 text-xs">Remove</button>
                                </td>
                              </tr>
                            );
                          })}
                          
                          {isAddingPendingDoc && (
                            <tr className="bg-indigo-50/30">
                              <td className="py-2 px-2">
                                <Select id="pendingDocType" className="w-full text-sm py-1.5" required>
                                  <option value="">Select...</option>
                                  {documentTypes.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                                </Select>
                              </td>
                              <td className="py-2 px-2">
                                <Input id="pendingDocNumber" className="w-full text-sm py-1.5" placeholder="Number" />
                              </td>
                              <td className="py-2 px-2">
                                <Input type="date" id="pendingDocExpiry" className="w-full text-sm py-1.5" />
                              </td>
                              <td className="py-2 px-2">
                                <input type="file" id="pendingDocFile" className="w-full text-xs text-slate-500 border bg-white rounded p-1" required />
                              </td>
                              <td className="py-2 px-2 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1">
                                  <Button type="button" size="sm" className="h-8 px-2 bg-green-600 hover:bg-green-700" onClick={() => {
                                    const typeId = document.getElementById('pendingDocType').value;
                                    const number = document.getElementById('pendingDocNumber').value;
                                    const expiry = document.getElementById('pendingDocExpiry').value;
                                    const fileInput = document.getElementById('pendingDocFile');
                                    if (!typeId || !fileInput.files[0]) return alert('Type and file are required');
                                    setPendingDocuments(prev => [...prev, {
                                      id: Date.now(),
                                      documentTypeId: typeId,
                                      documentNumber: number,
                                      expiryDate: expiry,
                                      file: fileInput.files[0]
                                    }]);
                                    setIsAddingPendingDoc(false);
                                  }}>
                                    <Save size={16} />
                                  </Button>
                                  <Button type="button" variant="outline" size="sm" onClick={() => setIsAddingPendingDoc(false)} className="h-8 px-2 border-slate-300 text-slate-600">
                                    <X size={16} />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          )}

                          {!isAddingPendingDoc && (
                            <tr>
                              <td colSpan="5" className="py-3 px-4">
                                <button 
                                  type="button" 
                                  onClick={() => setIsAddingPendingDoc(true)}
                                  className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                                >
                                  + Add a document
                                </button>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

            <div id="section-payroll" className="space-y-8 scroll-mt-24 pb-12 border-b border-slate-100 last:border-0">
                
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
      <div>
        <h3 className="text-lg font-bold text-slate-800">Emergency Contacts</h3>
        <p className="text-xs text-slate-500 mt-1">Who to reach out to in case of an emergency.</p>
      </div>
      <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">Step 5 of 9</span>
    </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <FormField label="Base Salary (Legacy/Fallback)" required><Input type="number" name="baseSalary" value={formData.baseSalary} onChange={handleChange} min="0" /></FormField>
                </div>
                <h4 className="font-medium text-slate-700 mt-6 mb-2">Bank Account Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <FormField label="Bank Name"><Input name="bankName" value={formData.bankDetails.bankName} onChange={(e) => handleChange(e, 'bankDetails')} /></FormField>
                   <FormField label="Branch Name"><Input name="branchName" value={formData.bankDetails.branchName} onChange={(e) => handleChange(e, 'bankDetails')} /></FormField>
                   <FormField label="Account Holder Name"><Input name="accountHolderName" value={formData.bankDetails.accountHolderName} onChange={(e) => handleChange(e, 'bankDetails')} /></FormField>
                   <FormField label="Account Number"><Input name="accountNumber" value={formData.bankDetails.accountNumber} onChange={(e) => handleChange(e, 'bankDetails')} /></FormField>
                   <FormField label="IBAN"><Input name="iban" value={formData.bankDetails.iban} onChange={(e) => handleChange(e, 'bankDetails')} /></FormField>
                   <FormField label="SWIFT/BIC"><Input name="swiftBic" value={formData.bankDetails.swiftBic} onChange={(e) => handleChange(e, 'bankDetails')} /></FormField>
                   <FormField label="IFSC Code (India)"><Input name="ifscCode" value={formData.bankDetails.ifscCode} onChange={(e) => handleChange(e, 'bankDetails')} /></FormField>
                   <FormField label="Routing Number (US)"><Input name="routingNumber" value={formData.bankDetails.routingNumber} onChange={(e) => handleChange(e, 'bankDetails')} /></FormField>
                   <FormField label="Branch Code"><Input name="branchCode" value={formData.bankDetails.branchCode} onChange={(e) => handleChange(e, 'bankDetails')} /></FormField>
                </div>
              </div>

            <div id="section-attendance" className="space-y-8 scroll-mt-24 pb-12 border-b border-slate-100 last:border-0">
                
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
      <div>
        <h3 className="text-lg font-bold text-slate-800">Identity & Documents</h3>
        <p className="text-xs text-slate-500 mt-1">Legal identification and compliance documents.</p>
      </div>
      <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">Step 6 of 9</span>
    </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <FormField label="Default Shift">
                     <Select name="shiftId" value={formData.shiftId} onChange={handleChange}>
                       <option value="">Select Shift</option>
                       {shifts.map(s => <option key={s._id} value={s._id}>{s.name} ({s.startTime} - {s.endTime})</option>)}
                     </Select>
                   </FormField>
                   <FormField label="Biometric ID"><Input name="biometricId" value={formData.biometricId || ''} onChange={handleChange} /></FormField>
                </div>
                <div className="flex gap-8 mt-4">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input type="checkbox" name="mobileAttendanceEnabled" checked={formData.mobileAttendanceEnabled} onChange={handleChange} className="w-4 h-4 rounded border-slate-300" />
                    Enable Mobile Attendance
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input type="checkbox" name="overtimeEligible" checked={formData.overtimeEligible} onChange={handleChange} className="w-4 h-4 rounded border-slate-300" />
                    Eligible for Overtime
                  </label>
                </div>
              </div>

            <div id="section-erp" className="space-y-8 scroll-mt-24 pb-12 border-b border-slate-100 last:border-0">
                
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
      <div>
        <h3 className="text-lg font-bold text-slate-800">Payroll & Bank</h3>
        <p className="text-xs text-slate-500 mt-1">Compensation package and financial routing details.</p>
      </div>
      <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">Step 7 of 9</span>
    </div>
                {isEditing ? (
                   <div className="p-4 bg-slate-50 border rounded flex items-center justify-between">
                     <div>
                       <p className="font-medium text-slate-800">User Account Linked</p>
                       <p className="text-sm text-slate-500">Manage ERP login access, roles, and branch restrictions from the Users module.</p>
                     </div>
                     <Button type="button" variant="outline" onClick={() => navigate('/settings/users')}>Go to Users</Button>
                   </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">User linking will be available after the employee profile is created.</p>
                )}
              </div>
            </div>
        </form>
      </div>

      {quickAddConfig.isOpen && (
        <QuickAddModal 
          isOpen={quickAddConfig.isOpen}
          onClose={() => setQuickAddConfig({ ...quickAddConfig, isOpen: false })}
          title={quickAddConfig.title}
          endpoint={quickAddConfig.endpoint}
          onSuccess={(newData) => {
            fetchFormData();
            if (quickAddConfig.targetField === 'pendingDocType') {
              // DOM manipulation for the pending document row since it's not in formData
              const select = document.getElementById('pendingDocType');
              if (select) select.value = newData._id;
            } else if (quickAddConfig.targetField.startsWith('familyMemberDocType-')) {
              const idx = parseInt(quickAddConfig.targetField.split('-')[1], 10);
              updateArrayItem('familyMembers', idx, 'documentType', newData.name);
            } else {
              setFormData(prev => ({ ...prev, [quickAddConfig.targetField]: newData._id }));
            }
          }}
          fields={quickAddConfig.fields}
        />
      )}
    </div>
  );
};

export default EmployeeForm;
