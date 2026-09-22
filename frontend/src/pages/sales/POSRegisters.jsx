import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Plus, Search, Filter, Edit, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const POSRegisters = () => {
  const [registers, setRegisters] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRegister, setEditingRegister] = useState(null);
  const [hasPermission, setHasPermission] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    branchId: '',
    status: 'ACTIVE'
  });
  
  const [formError, setFormError] = useState('');

  // Initial Data Fetch
  useEffect(() => {
    const checkPermissions = () => {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        const perms = user.permissions || [];
        const role = user.roleId?.name?.toLowerCase() || '';
        
        // Match backend authorization requirements: 'MANAGE_COMPANY', 'admin', 'sales_manager'
        if (perms.includes('*') || perms.includes('MANAGE_COMPANY') || role === 'admin' || role === 'sales_manager') {
          setHasPermission(true);
        }
      }
    };

    const fetchBranches = async () => {
      try {
        const res = await axios.get('/api/v1/branches', { 
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } 
        });
        if (res.data) {
          let branchesData = Array.isArray(res.data) ? res.data : (res.data.data || []);
          const authUser = JSON.parse(localStorage.getItem('user') || '{}');
          if (authUser.branches && authUser.branches.length > 0) {
            branchesData = branchesData.filter(b => authUser.branches.includes(b._id));
          } else if (!authUser.permissions?.includes('*')) {
            branchesData = [];
          }
          setBranches(branchesData);
        }
      } catch (e) {
        console.error('Error fetching branches:', e);
      }
    };

    checkPermissions();
    fetchBranches();
    fetchRegisters();
  }, []);

  const fetchRegisters = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/v1/pos/registers', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setRegisters(res.data);
    } catch (e) {
      console.error('Error fetching registers:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (register = null) => {
    setFormError('');
    if (register) {
      setEditingRegister(register);
      setFormData({
        name: register.name,
        code: register.code,
        description: register.description || '',
        branchId: register.branchId?._id || register.branchId,
        status: register.status
      });
    } else {
      setEditingRegister(null);
      setFormData({
        name: '',
        code: '',
        description: '',
        branchId: branches.length === 1 ? branches[0]._id : '',
        status: 'ACTIVE'
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');

    const { name, code, branchId, status } = formData;
    if (!name.trim() || !code.trim() || !branchId) {
      setFormError('Name, Code, and Branch are required fields.');
      return;
    }

    try {
      if (editingRegister) {
        await axios.put(`/api/v1/pos/registers/${editingRegister._id}`, formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      } else {
        await axios.post('/api/v1/pos/registers', formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      }
      setIsModalOpen(false);
      fetchRegisters();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save register. Please try again.');
    }
  };

  const toggleStatus = async (register) => {
    try {
      const newStatus = register.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await axios.put(`/api/v1/pos/registers/${register._id}`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchRegisters();
    } catch (e) {
      console.error('Error updating status:', e);
    }
  };

  const filteredRegisters = registers.filter(r => {
    if (filterBranch !== 'ALL' && r.branchId?._id !== filterBranch) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !r.name.toLowerCase().includes(q) && 
        !r.code.toLowerCase().includes(q) && 
        !(r.branchId?.name || '').toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Settings className="text-blue-600" size={24} />
            POS Registers
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage point of sale checkout counters and cash drawers</p>
        </div>
        {hasPermission && (
          <button 
            onClick={() => handleOpenModal()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
          >
            <Plus size={18} />
            Add Register
          </button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by Name or Code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={18} className="text-gray-500" />
          <select
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Branches</option>
            {branches.map(b => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 border-b border-gray-100 text-sm">
                <th className="p-4 font-semibold">Branch</th>
                <th className="p-4 font-semibold">Register Name</th>
                <th className="p-4 font-semibold">Code</th>
                <th className="p-4 font-semibold">Description</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-500">
                    <div className="flex justify-center items-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      Loading registers...
                    </div>
                  </td>
                </tr>
              ) : filteredRegisters.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <AlertTriangle size={32} className="text-amber-500 mb-2" />
                      <p>No registers found.</p>
                      {hasPermission && (
                        <button onClick={() => handleOpenModal()} className="text-blue-600 hover:underline mt-2">
                          Create your first register
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRegisters.map((reg) => (
                  <tr key={reg._id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-medium text-gray-700">{reg.branchId?.name || 'N/A'}</td>
                    <td className="p-4 text-gray-800">{reg.name}</td>
                    <td className="p-4 text-gray-500"><span className="bg-gray-100 px-2 py-1 rounded text-xs">{reg.code}</span></td>
                    <td className="p-4 text-gray-500 text-sm max-w-xs truncate">{reg.description || '-'}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        reg.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {reg.status === 'ACTIVE' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {reg.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {hasPermission ? (
                        <div className="flex items-center justify-end gap-3">
                          <button 
                            onClick={() => handleOpenModal(reg)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => toggleStatus(reg)}
                            className={`${reg.status === 'ACTIVE' ? 'text-amber-600 hover:text-amber-800' : 'text-green-600 hover:text-green-800'} transition-colors`}
                            title={reg.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          >
                            {reg.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">View Only</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800">
                {editingRegister ? 'Edit Register' : 'Add Register'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6">
              {formError && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm flex items-center gap-2">
                  <AlertTriangle size={16} />
                  {formError}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch <span className="text-red-500">*</span></label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({...formData, branchId: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="" disabled>Select Branch</option>
                    {branches.map(b => (
                      <option key={b._id} value={b._id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Register Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Counter 1, Main Register"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Register Code <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                    placeholder="e.g. REG-01"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Must be unique within the selected branch.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Optional description"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingRegister ? 'Update Register' : 'Create Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSRegisters;
