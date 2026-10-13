import React, { useState } from 'react';
import Select, { components } from 'react-select';
import { Edit2, Trash2, Plus, X, Save } from 'lucide-react';
import axios from 'axios';

export const MasterSelect = ({ 
  options, 
  value, 
  onChange, 
  endpoint, 
  title, 
  onRefresh, 
  fields = [{ name: 'name', label: 'Name' }, { name: 'code', label: 'Code' }],
  isDisabled = false,
  placeholder = 'Select...',
  extraPayload = {}
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);

  const customStyles = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: '#f8fafc',
      border: '2px solid',
      borderColor: state.isFocused ? '#2563eb' : '#e2e8f0',
      boxShadow: 'none',
      minHeight: '40px',
      borderRadius: '0.375rem',
      fontSize: '0.875rem',
      fontWeight: '700',
      color: '#0f172a',
      cursor: state.isDisabled ? 'not-allowed' : 'pointer',
      '&:hover': {
        borderColor: state.isFocused ? '#2563eb' : '#94a3b8'
      }
    }),
    option: (provided, state) => ({
      ...provided,
      fontSize: '0.875rem',
      fontWeight: '700',
      backgroundColor: state.isSelected ? '#2563eb' : state.isFocused ? '#eff6ff' : 'white',
      color: state.isSelected ? 'white' : '#0f172a',
      cursor: 'pointer',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }),
    menu: (provided) => ({
      ...provided,
      borderRadius: '0.375rem',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      zIndex: 9999,
      border: '2px solid #e2e8f0'
    }),
    menuPortal: base => ({ ...base, zIndex: 9999 }),
  };

  const openAddModal = () => {
    setFormData({});
    setIsEditing(false);
    setEditId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (e, opt) => {
    e.stopPropagation();
    setFormData(opt.original);
    setIsEditing(true);
    setEditId(opt.value);
    setIsModalOpen(true);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete this ${title}?`)) {
      try {
        await axios.delete(`${endpoint}/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (value === id) onChange(''); // Clear selection if deleted
        if (onRefresh) onRefresh();
      } catch (err) {
        alert(`Failed to delete ${title}: ` + (err.response?.data?.message || err.message));
      }
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const payload = { ...formData, ...extraPayload };
      if (isEditing) {
        await axios.put(`${endpoint}/${editId}`, payload, { headers });
      } else {
        await axios.post(endpoint, payload, { headers });
      }
      setIsModalOpen(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Failed to save ${title}: ` + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Custom Option Component with Edit/Delete buttons
  const CustomOption = (props) => {
    return (
      <components.Option {...props}>
        <span>{props.data.label}</span>
        <div className="flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity">
          <button type="button" onClick={(e) => openEditModal(e, props.data)} className="p-1 hover:text-blue-600 rounded">
            <Edit2 size={14} />
          </button>
          <button type="button" onClick={(e) => handleDelete(e, props.data.value)} className="p-1 hover:text-rose-600 rounded">
            <Trash2 size={14} />
          </button>
        </div>
      </components.Option>
    );
  };

  // Custom MenuList to append an "Add New" button at the bottom
  const CustomMenuList = (props) => {
    return (
      <components.MenuList {...props}>
        {props.children}
        <div 
          onClick={openAddModal}
          className="px-3 py-2 bg-slate-50 border-t border-slate-200 text-blue-600 font-bold text-sm cursor-pointer flex items-center gap-2 hover:bg-blue-50 transition-colors"
        >
          <Plus size={16} /> Add New {title}
        </div>
      </components.MenuList>
    );
  };

  const selectedOpt = options.find(o => o.value === value) || null;

  return (
    <>
      <Select
        value={selectedOpt}
        onChange={opt => onChange(opt ? opt.value : '')}
        options={options}
        styles={customStyles}
        components={{ Option: CustomOption, MenuList: CustomMenuList }}
        placeholder={placeholder}
        isDisabled={isDisabled}
        isClearable
        menuPortalTarget={document.body}
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border-2 border-slate-200">
            <div className="bg-slate-900 px-5 py-4 flex justify-between items-center border-b border-slate-800">
              <h3 className="text-white font-black uppercase tracking-widest text-sm">
                {isEditing ? `Edit ${title}` : `New ${title}`}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {fields.map(field => (
                <div key={field.name}>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                    {field.label}
                  </label>
                  <input
                    type="text"
                    value={formData[field.name] || ''}
                    onChange={e => setFormData({ ...formData, [field.name]: e.target.value })}
                    className="w-full h-10 px-3 bg-slate-50 border-2 border-slate-200 rounded-md focus:border-blue-600 focus:ring-0 text-sm font-bold text-slate-900 outline-none uppercase"
                  />
                </div>
              ))}
            </div>
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-white border-2 border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest rounded hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-blue-500 shadow-md transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : <><Save size={14} /> Commit</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
