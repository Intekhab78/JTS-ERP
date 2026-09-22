import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getFileUrl } from '../../config/api';
import { UserCircle, Briefcase, Mail, Phone, MapPin, Building2, Calendar, FileText, ArrowLeft, Edit, Shield, CheckCircle, XCircle, Target, FileCheck, Banknote, Users, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/common/Modal';
import { FormField } from '../../components/common/FormField';
import { Select } from '../../components/ui/Select';
import DocumentManager from '../../components/hr/DocumentManager';
import EmployeeIdentificationTab from './components/EmployeeIdentificationTab';
import EmployeeShiftTab from './components/EmployeeShiftTab';
import EmployeeAttendanceTab from './components/EmployeeAttendanceTab';
import EmployeeLeaveBalanceTab from './components/EmployeeLeaveBalanceTab';
import EmployeeLeaveRequestsTab from './components/EmployeeLeaveRequestsTab';
import EmployeeSalaryTab from './components/EmployeeSalaryTab';

const EmployeeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [activeTab, setActiveTab] = useState('Overview');
  const [isLoading, setIsLoading] = useState(true);

  // Link User Modal state
  const [isLinkUserModalOpen, setIsLinkUserModalOpen] = useState(false);
  const [unlinkedUsers, setUnlinkedUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  useEffect(() => {
    fetchEmployee();
  }, [id]);

  const fetchEmployee = async () => {
    try {
      const res = await axios.get(`/api/v1/hr/employees/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setEmployee(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUnlinkedUsers = async () => {
    try {
      const res = await axios.get(`/api/v1/users`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      // Filter out users who already have an employee linked
      const available = res.data.filter(u => !u.employeeId);
      setUnlinkedUsers(available);
    } catch (error) {
      console.error(error);
    }
  };

  const handleLinkUser = async (e) => {
    e.preventDefault();
    if (!selectedUserId) return;
    setIsLinking(true);
    try {
      await axios.post(`/api/v1/hr/employees/${id}/link-user`, 
        { userId: selectedUserId },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setIsLinkUserModalOpen(false);
      fetchEmployee();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to link user');
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkUser = async () => {
    if (!window.confirm('Are you sure you want to unlink the user from this employee?')) return;
    try {
      await axios.post(`/api/v1/hr/employees/${id}/unlink-user`, 
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      fetchEmployee();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to unlink user');
    }
  };

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading...</div>;
  if (!employee) return <div className="p-8 text-center text-slate-500">Employee not found</div>;

  const tabs = [
    { id: 'Overview', label: 'Overview', icon: FileText },
    { id: 'Personal', label: 'Personal Info', icon: UserCircle },
    { id: 'Contact', label: 'Contact', icon: Mail },
    { id: 'Family', label: 'Family', icon: Users },
    { id: 'Emergency', label: 'Emergency', icon: AlertTriangle },
    { id: 'Employment', label: 'Employment', icon: Briefcase },
    { id: 'Attendance', label: 'Attendance', icon: FileText },
    { id: 'Shift', label: 'Shift', icon: Briefcase },
    { id: 'LeaveBalance', label: 'Leave Balance', icon: Target },
    { id: 'LeaveRequests', label: 'Leave Requests', icon: FileCheck },
    { id: 'Salary', label: 'Payroll / Salary', icon: Banknote },
    { id: 'Documents', label: 'Documents', icon: FileText },
    { id: 'Identification', label: 'Identification', icon: Shield },
    { id: 'SystemAccess', label: 'System Access', icon: Shield }
  ];

  const statusVariants = {
    ACTIVE: 'success',
    ON_LEAVE: 'warning',
    TERMINATED: 'danger',
    SUSPENDED: 'danger',
    RESIGNED: 'neutral'
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/employees')} className="p-2">
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              {employee.firstName} {employee.lastName}
              <Badge variant={statusVariants[employee.status] || 'neutral'}>{employee.status}</Badge>
            </h1>
            <p className="text-slate-500">{employee.jobTitle} • {employee.employeeCode}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {hasPermission('EDIT_HR') && (
            <Button variant="outline" onClick={() => navigate(`/employees/edit/${employee._id}`)} className="gap-2">
              <Edit size={16} /> Edit Employee
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left Sidebar Profile */}
        <div className="w-1/3">
          <Card className="p-6 text-center">
            <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full mx-auto flex items-center justify-center text-3xl font-bold mb-4">
              {employee.profilePhoto?.url ? (
                <img src={employee.profilePhoto.url.startsWith('http') ? employee.profilePhoto.url : getFileUrl(employee.profilePhoto.url)} alt="Profile" className="w-full h-full rounded-full object-cover" />
              ) : (
                `${employee.firstName[0]}${employee.lastName[0]}`
              )}
            </div>
            <h2 className="text-xl font-bold text-slate-900">{employee.firstName} {employee.lastName}</h2>
            <p className="text-slate-500 font-medium">{employee.designation || employee.jobTitle}</p>
            <p className="text-sm text-slate-400 mt-1">{employee.departmentId?.name}</p>

            <div className="mt-6 space-y-3 text-left">
              <div className="flex items-center gap-3 text-sm text-slate-700">
                <Mail size={16} className="text-slate-400" />
                {employee.email || employee.personalEmail || 'No email provided'}
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-700">
                <Phone size={16} className="text-slate-400" />
                {employee.phone || employee.personalMobile || 'No phone provided'}
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-700">
                <Building2 size={16} className="text-slate-400" />
                {employee.branchId?.name}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Content */}
        <div className="w-2/3 space-y-4">
          <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="pt-4">
            {activeTab === 'Overview' && (
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4" title="Employment Summary">
                  <div className="space-y-3">
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500 text-sm">Employee Code</span>
                      <span className="font-medium text-sm">{employee.employeeCode}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500 text-sm">Joining Date</span>
                      <span className="font-medium text-sm">{new Date(employee.hireDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500 text-sm">Employment Type</span>
                      <span className="font-medium text-sm">{employee.employmentType}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500 text-sm">Manager</span>
                      <span className="font-medium text-sm">{employee.managerId ? `${employee.managerId.firstName} ${employee.managerId.lastName}` : 'None'}</span>
                    </div>
                  </div>
                </Card>
                <Card className="p-4" title="Contact Summary">
                  <div className="space-y-3">
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500 text-sm">Work Email</span>
                      <span className="font-medium text-sm">{employee.email || '—'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500 text-sm">Work Mobile</span>
                      <span className="font-medium text-sm">{employee.phone || '—'}</span>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'Personal' && (
              <Card className="p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Personal Details</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div><span className="text-slate-500 text-sm block">Gender</span><span className="font-medium">{employee.gender || '—'}</span></div>
                  <div><span className="text-slate-500 text-sm block">Date of Birth</span><span className="font-medium">{employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString() : '—'}</span></div>
                  <div><span className="text-slate-500 text-sm block">Marital Status</span><span className="font-medium">{employee.maritalStatus || '—'}</span></div>
                  <div><span className="text-slate-500 text-sm block">Nationality</span><span className="font-medium">{employee.nationality || '—'}</span></div>
                  <div><span className="text-slate-500 text-sm block">Blood Group</span><span className="font-medium">{employee.bloodGroup || '—'}</span></div>
                </div>
              </Card>
            )}

            {activeTab === 'Family' && (
              <Card className="p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Family Members</h3>
                {employee.familyMembers && employee.familyMembers.length > 0 ? (
                  <div className="space-y-4">
                    {employee.familyMembers.map((member, idx) => (
                      <div key={idx} className="bg-slate-50 p-4 rounded border">
                        <div className="grid grid-cols-2 gap-4">
                          <div><span className="text-slate-500 text-sm block">Name</span><span className="font-medium">{member.name}</span></div>
                          <div><span className="text-slate-500 text-sm block">Relationship</span><span className="font-medium">{member.relationship}</span></div>
                          <div><span className="text-slate-500 text-sm block">Gender</span><span className="font-medium">{member.gender}</span></div>
                          <div><span className="text-slate-500 text-sm block">Mobile</span><span className="font-medium">{member.mobile || '—'}</span></div>
                          <div><span className="text-slate-500 text-sm block">Dependent?</span><span className="font-medium">{member.isDependent ? 'Yes' : 'No'}</span></div>
                          <div><span className="text-slate-500 text-sm block">Emergency Contact?</span><span className="font-medium">{member.isEmergencyContact ? 'Yes' : 'No'}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic">No family members registered.</p>
                )}
              </Card>
            )}

            {activeTab === 'Emergency' && (
              <Card className="p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Emergency Contacts</h3>
                {employee.emergencyContacts && employee.emergencyContacts.length > 0 ? (
                  <div className="space-y-4">
                    {employee.emergencyContacts.map((contact, idx) => (
                      <div key={idx} className="bg-slate-50 p-4 rounded border">
                        <div className="grid grid-cols-2 gap-4">
                          <div><span className="text-slate-500 text-sm block">Name</span><span className="font-medium">{contact.name}</span></div>
                          <div><span className="text-slate-500 text-sm block">Relationship</span><span className="font-medium">{contact.relationship}</span></div>
                          <div><span className="text-slate-500 text-sm block">Mobile</span><span className="font-medium">{contact.mobile}</span></div>
                          <div><span className="text-slate-500 text-sm block">Alternate Mobile</span><span className="font-medium">{contact.alternateMobile || '—'}</span></div>
                          <div><span className="text-slate-500 text-sm block">Email</span><span className="font-medium">{contact.email || '—'}</span></div>
                          <div><span className="text-slate-500 text-sm block">Address</span><span className="font-medium">{contact.address || '—'}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {employee.emergencyContactName ? (
                      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded text-yellow-800">
                        <div className="grid grid-cols-2 gap-4">
                          <div><span className="text-yellow-700 text-sm block">Legacy Contact Name</span><span className="font-medium">{employee.emergencyContactName}</span></div>
                          <div><span className="text-yellow-700 text-sm block">Relationship</span><span className="font-medium">{employee.emergencyContactRelation}</span></div>
                          <div><span className="text-yellow-700 text-sm block">Mobile</span><span className="font-medium">{employee.emergencyContactMobile}</span></div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-500 italic">No emergency contacts registered.</p>
                    )}
                  </div>
                )}
              </Card>
            )}

            {activeTab === 'Documents' && (
              <DocumentManager employeeId={id} />
            )}

            {activeTab === 'Identification' && (
              <EmployeeIdentificationTab employeeId={id} hasPermission={hasPermission} />
            )}

            {activeTab === 'Attendance' && (
              <EmployeeAttendanceTab employeeId={id} hasPermission={hasPermission} />
            )}

            { activeTab === 'Shift' && (
              <EmployeeShiftTab employeeId={id} hasPermission={hasPermission} />
            )}

            { activeTab === 'LeaveBalance' && (
              <EmployeeLeaveBalanceTab employeeId={id} hasPermission={hasPermission} />
            )}

            { activeTab === 'LeaveRequests' && (
              <EmployeeLeaveRequestsTab employeeId={id} hasPermission={hasPermission} />
            )}

            { activeTab === 'Salary' && (
              <EmployeeSalaryTab employeeId={id} hasPermission={hasPermission} />
            )}

            {activeTab === 'SystemAccess' && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-800">User Account</h3>
                  {employee.userId ? (
                    <Button variant="outline" className="text-red-600 hover:text-red-700" onClick={handleUnlinkUser}>
                      Unlink User
                    </Button>
                  ) : (
                    <Button onClick={() => { fetchUnlinkedUsers(); setIsLinkUserModalOpen(true); }}>
                      Link Existing User
                    </Button>
                  )}
                </div>

                {employee.userId ? (
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="flex items-center gap-3 mb-4">
                      <CheckCircle className="text-green-500" size={24} />
                      <div>
                        <div className="font-bold text-slate-900">Linked User Account Active</div>
                        <div className="text-sm text-slate-500">This employee has portal access configured.</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                      <div><span className="text-slate-500 text-sm block">Email / Username</span><span className="font-medium">{employee.userId.email}</span></div>
                      <div><span className="text-slate-500 text-sm block">Portal Access</span><span className="font-medium"><Badge variant="neutral">{employee.userId.portalAccess}</Badge></span></div>
                      <div><span className="text-slate-500 text-sm block">Account Status</span><span className="font-medium">{employee.userId.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="danger">Disabled</Badge>}</span></div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 text-center">
                    <XCircle className="text-slate-400 mx-auto mb-2" size={32} />
                    <div className="font-medium text-slate-900">No User Account Linked</div>
                    <p className="text-sm text-slate-500 mt-1">This employee exists in HR but cannot login to the system.</p>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={isLinkUserModalOpen} onClose={() => setIsLinkUserModalOpen(false)} title="Link User Account">
        <form onSubmit={handleLinkUser} className="space-y-4">
          <FormField label="Select User Account" required>
            <Select 
              value={selectedUserId} 
              onChange={e => setSelectedUserId(e.target.value)} 
              required
              options={[
                { value: '', label: 'Select a user...' },
                ...unlinkedUsers.map(u => ({ value: u._id, label: `${u.firstName} ${u.lastName} (${u.email})` }))
              ]}
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsLinkUserModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isLinking}>{isLinking ? 'Linking...' : 'Link User'}</Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default EmployeeDetail;
