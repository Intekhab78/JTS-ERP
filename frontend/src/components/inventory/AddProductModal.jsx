import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FormField } from '../common/FormField';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { Trash2, Save, X, Box, ArrowLeft, Info, Layers, Settings, DollarSign, Image as ImageIcon } from 'lucide-react';
import { MasterSelect } from '../common/MasterSelect';

const AddProductModal = ({ onClose, categories, refresh, productToEdit }) => {
  const isEditing = !!productToEdit;
  const [formData, setFormData] = useState(productToEdit ? {
    name: productToEdit.name || '',
    sku: productToEdit.sku || '',
    barcode: productToEdit.barcode || '',
    categoryId: productToEdit.categoryId?._id || productToEdit.categoryId || '',
    type: productToEdit.type || 'STANDARD',
    brand: productToEdit.brand || '',
    uom: productToEdit.uom || 'PCS',
    uomDetails: {
      baseUnit: productToEdit.uomDetails?.baseUnit || productToEdit.uom || 'PCS',
      purchaseUnit: productToEdit.uomDetails?.purchaseUnit || productToEdit.uom || 'PCS',
      purchaseConversionFactor: productToEdit.uomDetails?.purchaseConversionFactor || 1,
      salesUnit: productToEdit.uomDetails?.salesUnit || productToEdit.uom || 'PCS',
      salesConversionFactor: productToEdit.uomDetails?.salesConversionFactor || 1
    },
    company: productToEdit.company || '',
    location: productToEdit.location || '',
    department: productToEdit.department || '',
    family: productToEdit.family || '',
    subFamily: productToEdit.subFamily || '',
    longDescription: productToEdit.longDescription || '',
    description3: productToEdit.description3 || '',
    description4: productToEdit.description4 || '',
    upc: productToEdit.upc || '',
    itemReference: productToEdit.itemReference || '',
    styleCode: productToEdit.styleCode || '',
    color: productToEdit.color || '',
    size: productToEdit.size || '',
    hsnCode: productToEdit.hsnCode || '',
    purchasePrice: productToEdit.purchasePrice || '',
    landedCost: productToEdit.landedCost || '',
    salesPrice: productToEdit.salesPrice || '',
    taxRate: productToEdit.taxRate || '',
    tax1: productToEdit.tax1?._id || productToEdit.tax1 || '',
    minStockLevel: productToEdit.minStockLevel || 0,
    maxStockLevel: productToEdit.maxStockLevel || 0,
    stockManagement: productToEdit.stockManagement || 'MANAGED',
    weight: productToEdit.weight || 0,
    weightUom: productToEdit.weightUom || 'Kilogram',
    costingMethod: productToEdit.costingMethod || 'AVCO',
    supplierName: productToEdit.supplierName || '',
    expiry: productToEdit.expiry ? productToEdit.expiry.split('T')[0] : '',
    expiryType: productToEdit.expiryType || '',
    expiryDays: productToEdit.expiryDays || 0,
    note1: productToEdit.note1 || '',
    note2: productToEdit.note2 || '',
    note3: productToEdit.note3 || '',
    date1: productToEdit.date1 ? productToEdit.date1.split('T')[0] : '',
    date2: productToEdit.date2 ? productToEdit.date2.split('T')[0] : '',
    itemDescriptionDetails: productToEdit.itemDescriptionDetails || '',
    isActive: productToEdit.isActive !== false
  } : {
    name: '',
    sku: '',
    barcode: '',
    categoryId: '',
    type: 'STANDARD',
    brand: '',
    uom: 'PCS',
    uomDetails: {
      baseUnit: 'PCS',
      purchaseUnit: 'PCS',
      purchaseConversionFactor: 1,
      salesUnit: 'PCS',
      salesConversionFactor: 1
    },
    company: '', location: '', department: '', family: '', subFamily: '',
    longDescription: '', description3: '', description4: '',
    upc: '', itemReference: '', styleCode: '', color: '', size: '', hsnCode: '',
    purchasePrice: '', landedCost: '', salesPrice: '', taxRate: '', tax1: '',
    minStockLevel: 0, maxStockLevel: 0, stockManagement: 'MANAGED', weight: 0, weightUom: 'Kilogram',
    costingMethod: 'AVCO', supplierName: '', expiry: '', expiryType: '', expiryDays: 0,
    note1: '', note2: '', note3: '', date1: '', date2: '', itemDescriptionDetails: '',
    isActive: true
  });
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(categories.length === 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [taxes, setTaxes] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [conversions, setConversions] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [families, setFamilies] = useState([]);
  const [subFamilies, setSubFamilies] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [colors, setColors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [itemTypes, setItemTypes] = useState([
    { name: 'STANDARD', _id: 'STANDARD' },
    { name: 'SERVICE', _id: 'SERVICE' },
    { name: 'RAW_MATERIAL', _id: 'RAW_MATERIAL' },
    { name: 'PACKING_MATERIAL', _id: 'PACKING_MATERIAL' },
    { name: 'SEMI_FINISHED_GOODS', _id: 'SEMI_FINISHED_GOODS' },
    { name: 'CONSUMABLE', _id: 'CONSUMABLE' },
    { name: 'PHANTOM', _id: 'PHANTOM' }
  ]);

  // Image Upload State
  const [existingImages, setExistingImages] = useState(productToEdit ? (productToEdit.images || []) : []);
  const [imagesToDelete, setImagesToDelete] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  const handleFileChange = (e) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles([...selectedFiles, ...filesArray]);
      
      const newPreviews = filesArray.map(file => URL.createObjectURL(file));
      setImagePreviews([...imagePreviews, ...newPreviews]);
    }
  };

  const handleRemoveExistingImage = (imgUrl) => {
    setExistingImages(existingImages.filter(img => img !== imgUrl));
    setImagesToDelete([...imagesToDelete, imgUrl]);
  };

  const handleRemoveSelectedFile = (index) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);
    
    const newPreviews = [...imagePreviews];
    URL.revokeObjectURL(newPreviews[index]);
    newPreviews.splice(index, 1);
    setImagePreviews(newPreviews);
  };

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        const [taxRes, uomRes, convRes, supplierRes, famRes, subFamRes, sizeRes, colorRes, deptRes, itemTypesRes] = await Promise.all([
          axios.get('/api/v1/taxes', { headers }).catch(() => ({ data: [] })),
          axios.get('/api/v1/inventory/uoms', { headers }).catch(() => ({ data: [] })),
          axios.get('/api/v1/inventory/uom-conversions', { headers }).catch(() => ({ data: [] })),
          axios.get('/api/v1/suppliers', { headers }).catch(() => ({ data: [] })),
          axios.get('/api/v1/hierarchy/families', { headers }).catch(() => ({ data: [] })),
          axios.get('/api/v1/hierarchy/subfamilies', { headers }).catch(() => ({ data: [] })),
          axios.get('/api/v1/hierarchy/sizes', { headers }).catch(() => ({ data: [] })),
          axios.get('/api/v1/hierarchy/colors', { headers }).catch(() => ({ data: [] })),
          axios.get('/api/v1/hierarchy/departments', { headers }).catch(() => ({ data: [] })),
          axios.get('/api/v1/hierarchy/itemtypes', { headers }).catch(() => ({ data: [] }))
        ]);
        setTaxes(taxRes.data.filter(t => t.isActive !== false));
        setUoms(uomRes.data.filter(u => u.isActive !== false));
        setConversions(convRes.data.filter(c => c.isActive !== false));
        setSuppliers(supplierRes.data);
        setFamilies(famRes.data.filter(f => f.isActive !== false));
        setSubFamilies(subFamRes.data.filter(sf => sf.isActive !== false));
        setSizes(sizeRes.data.filter(s => s.isActive !== false));
        setColors(colorRes.data.filter(c => c.isActive !== false));
        setDepartments(deptRes.data.filter(d => d.isActive !== false));
        if (itemTypesRes && itemTypesRes.data && itemTypesRes.data.length > 0) {
          setItemTypes(itemTypesRes.data.filter(it => it.isActive !== false));
        }
      } catch (err) {
        console.error('Failed to fetch master data', err);
      }
    };
    fetchMasterData();
  }, []);

  const getFilteredConversions = (fromUom, toUom) => {
    if (!fromUom || !toUom) return [];
    if (fromUom === toUom) return [{ _id: 'same', conversionFactor: 1, text: `1 ${fromUom} = 1 ${toUom}` }];
    return conversions
      .filter(c => c.fromUom === fromUom && c.toUom === toUom)
      .map(c => ({ ...c, text: `1 ${c.fromUom} = ${c.conversionFactor} ${c.toUom}` }));
  };

  const handleUomChange = (field, value) => {
    const newUomDetails = { ...formData.uomDetails, [field]: value };
    
    if (field === 'baseUnit' || field === 'purchaseUnit' || field === 'salesUnit') {
      const base = field === 'baseUnit' ? value : newUomDetails.baseUnit;
      const purch = field === 'purchaseUnit' ? value : newUomDetails.purchaseUnit;
      const sales = field === 'salesUnit' ? value : newUomDetails.salesUnit;

      if (base === purch && base !== '') {
        newUomDetails.purchaseConversionFactor = 1;
      } else if (base && purch) {
        const conv = conversions.find(c => c.fromUom === purch && c.toUom === base);
        newUomDetails.purchaseConversionFactor = conv ? conv.conversionFactor : '';
      }

      if (base === sales && base !== '') {
        newUomDetails.salesConversionFactor = 1;
      } else if (base && sales) {
        const conv = conversions.find(c => c.fromUom === sales && c.toUom === base);
        newUomDetails.salesConversionFactor = conv ? conv.conversionFactor : '';
      }
    }

    setFormData({ ...formData, uomDetails: newUomDetails });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      let finalCategoryId = formData.categoryId;

      if (isAddingCategory && newCategoryName.trim()) {
        const catRes = await axios.post('/api/v1/inventory/categories', 
          { name: newCategoryName }, 
          { headers }
        );
        finalCategoryId = catRes.data._id;
      }

      if (!finalCategoryId) {
        setError('Please select or create a category');
        setLoading(false);
        return;
      }

      // Conversion Validation
      if (formData.uomDetails.baseUnit !== formData.uomDetails.purchaseUnit && !formData.uomDetails.purchaseConversionFactor) {
        setError(`No conversion defined for ${formData.uomDetails.purchaseUnit} → ${formData.uomDetails.baseUnit}. Please create this conversion in UOM Conversion Master.`);
        setLoading(false);
        return;
      }
      if (formData.uomDetails.baseUnit !== formData.uomDetails.salesUnit && !formData.uomDetails.salesConversionFactor) {
        setError(`No conversion defined for ${formData.uomDetails.salesUnit} → ${formData.uomDetails.baseUnit}. Please create this conversion in UOM Conversion Master.`);
        setLoading(false);
        return;
      }

      // Sync legacy uom
      const payload = { ...formData, categoryId: finalCategoryId, uom: formData.uomDetails.baseUnit };
      
      // Clean up empty ObjectIds to prevent Mongoose cast errors
      if (payload.tax1 === '') {
        payload.tax1 = null;
      }

      let productId = null;

      if (isEditing) {
        const res = await axios.put(`/api/v1/inventory/products/${productToEdit._id}`, 
          payload, 
          { headers }
        );
        productId = productToEdit._id;
      } else {
        const res = await axios.post('/api/v1/inventory/products', 
          payload, 
          { headers }
        );
        productId = res.data._id || res.data.id;
      }

      // Handle Image Deletions
      for (const imgUrl of imagesToDelete) {
        const imageName = imgUrl.split('/').pop();
        try {
          await axios.delete(`/api/v1/inventory/products/${productId}/images/${imageName}`, { headers });
        } catch(e) { console.error("Failed to delete image", e); }
      }

      // Handle New Image Uploads
      if (selectedFiles.length > 0) {
        const imgData = new FormData();
        selectedFiles.forEach(f => imgData.append('images', f));
        await axios.post(`/api/v1/inventory/products/${productId}/images`, imgData, {
          headers: { ...headers, 'Content-Type': 'multipart/form-data' }
        });
      }
      
      refresh();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} product`);
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="bg-[#f8fafc] flex flex-col min-h-[80vh] animate-in fade-in zoom-in-95 duration-300">
      {/* Aggressive Tech Header */}
      <div className="bg-[#0a0f1c] text-white p-6 shadow-xl relative shrink-0 border-l-4 border-blue-500 rounded-xl mb-6">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay rounded-xl"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent pointer-events-none rounded-xl"></div>
        
        <div className="relative z-10 flex justify-between items-center w-full gap-4">
          <div className="flex items-center gap-6">
            <button type="button" onClick={onClose} className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors flex items-center justify-center border border-slate-700 shadow-inner">
               <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-8 bg-blue-600 flex items-center justify-center rounded">
                  <Box size={18} className="text-white" />
                </div>
                <h1 className="text-3xl font-black uppercase tracking-widest">{isEditing ? `Edit Product: ${formData.name}` : "Initialize Product"}</h1>
              </div>
              <p className="text-slate-400 text-sm font-bold tracking-widest uppercase">
                MASTER DATA MANAGEMENT • SKU PROTOCOLS
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-[#111827] border border-slate-800 p-3 rounded-lg shadow-inner">
             <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
             <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">{isEditing ? 'UPDATE PROTOCOL' : 'CREATION PROTOCOL'}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-full">
          {error && <Alert variant="destructive" className="mb-4">{error}</Alert>}

          {/* Primary Identification Card */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden group hover:border-blue-300 transition-colors">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <Info size={18} className="text-blue-500" />
              <h3 className="font-black text-slate-700 tracking-widest uppercase text-xs">Primary Identification</h3>
            </div>
            <div className="p-6">
              <div className="flex gap-6 items-start">
                <div className="flex-1">
                  <FormField label="Product Name" required>
                    <Input 
                      className="text-lg font-medium"
                      required
                      placeholder="e.g. Widget Pro"
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </FormField>
                </div>
                <div className="flex items-center gap-2 mt-8">
                  <input 
                    type="checkbox" 
                    id="isActive" 
                    checked={formData.isActive}
                    onChange={e => setFormData({...formData, isActive: e.target.checked})}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="isActive" className="text-sm font-bold uppercase tracking-widest text-slate-700">Active Product</label>
                </div>
              </div>
            </div>
          </div>

          {/* Hierarchy & Classification Card */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden group hover:border-indigo-300 transition-colors">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <Layers size={18} className="text-indigo-500" />
              <h3 className="font-black text-slate-700 tracking-widest uppercase text-xs">Hierarchy & Classification</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">


            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium">Item Type</label>
              </div>
              <MasterSelect 
                options={itemTypes.map(it => ({ value: it.name, label: it.name, original: it }))}
                value={formData.type}
                onChange={val => setFormData({...formData, type: val})}
                endpoint="/api/v1/hierarchy/itemtypes"
                title="Item Type"
                onRefresh={async () => {
                  try {
                    const token = localStorage.getItem('token');
                    const headers = { Authorization: `Bearer ${token}` };
                    const itemTypesRes = await axios.get('/api/v1/hierarchy/itemtypes', { headers });
                    setItemTypes(itemTypesRes.data.filter(it => it.isActive !== false));
                  } catch(e) { console.error('Failed to refresh item types', e); }
                }}
                fields={[{ name: 'name', label: 'Type Name' }, { name: 'code', label: 'Type Code' }]}
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium">Department</label>
              </div>
              <MasterSelect 
                options={departments.map(d => ({ value: d.name, label: d.name, original: d }))}
                value={formData.department}
                onChange={val => {
                  setFormData({
                    ...formData, 
                    department: val,
                    categoryId: '',
                    family: '',
                    subFamily: ''
                  });
                }}
                endpoint="/api/v1/hierarchy/departments"
                title="Department"
                onRefresh={async () => {
                  try {
                    const token = localStorage.getItem('token');
                    const headers = { Authorization: `Bearer ${token}` };
                    const deptRes = await axios.get('/api/v1/hierarchy/departments', { headers });
                    setDepartments(deptRes.data.filter(d => d.isActive !== false));
                  } catch(e) { console.error('Failed to refresh depts', e); }
                }}
                fields={[{ name: 'name', label: 'Department Name' }, { name: 'code', label: 'Department Code' }]}
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium">Category <span className="text-error">*</span></label>
              </div>
              <MasterSelect 
                options={categories
                  .filter(cat => {
                    const selDept = departments.find(d => d.name === formData.department);
                    return selDept && (cat.itemDepartmentId === selDept._id || cat.itemDepartmentId?._id === selDept._id);
                  })
                  .map(cat => ({ value: cat._id, label: cat.name, original: cat }))}
                value={formData.categoryId}
                onChange={val => {
                  setFormData({
                    ...formData, 
                    categoryId: val,
                    family: '',
                    subFamily: ''
                  });
                }}
                endpoint="/api/v1/inventory/categories"
                title="Category"
                isDisabled={!formData.department}
                extraPayload={{ itemDepartmentId: departments.find(d => d.name === formData.department)?._id }}
                onRefresh={async () => {
                  // Trigger parent refresh or local refresh
                  // To be safe, we call the parent's refresh passed as a prop, but wait, categories are passed as prop!
                  // I should call refresh() which fetches everything in Inventory.jsx, but categories is a prop!
                  // Since categories is a prop, we need to call `refresh()` which updates `categories` in `Inventory.jsx` and re-renders.
                  if (refresh) refresh();
                }}
                fields={[{ name: 'name', label: 'Category Name' }]}
              />
            </div>

            <FormField label="SKU" required>
              <Input required value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
            </FormField>
            
            <FormField label="Barcode (EAN-13)">
              <Input value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} />
            </FormField>
            <FormField label="Brand">
              <Input value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} />
            </FormField>
            
            <FormField label="Company"><Input value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} /></FormField>
            <FormField label="Location"><Input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} /></FormField>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium">Family</label>
              </div>
              <MasterSelect 
                options={families
                  .filter(f => f.categoryId === formData.categoryId || f.categoryId?._id === formData.categoryId)
                  .map(f => ({ value: f.name, label: f.name, original: f }))}
                value={formData.family}
                onChange={val => setFormData({...formData, family: val, subFamily: ''})}
                endpoint="/api/v1/hierarchy/families"
                title="Family"
                isDisabled={!formData.categoryId}
                extraPayload={{ categoryId: formData.categoryId }}
                onRefresh={async () => {
                  try {
                    const token = localStorage.getItem('token');
                    const headers = { Authorization: `Bearer ${token}` };
                    const famRes = await axios.get('/api/v1/hierarchy/families', { headers });
                    // Usually we would update families here, but families is a state inside the component!
                    // Wait, we need to add setFamilies to the scope or rely on the parent refresh?
                    // families is a state in AddProductModal.jsx! So we can use setFamilies.
                    setFamilies(famRes.data.filter(f => f.isActive !== false));
                  } catch(e) { console.error('Failed to refresh families', e); }
                }}
                fields={[{ name: 'name', label: 'Family Name' }, { name: 'code', label: 'Code' }]}
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium">Sub Family</label>
              </div>
              <MasterSelect 
                options={subFamilies
                  .filter(sf => sf.familyId?.name === formData.family)
                  .map(sf => ({ value: sf.name, label: sf.name, original: sf }))}
                value={formData.subFamily}
                onChange={val => setFormData({...formData, subFamily: val})}
                endpoint="/api/v1/hierarchy/subfamilies"
                title="Sub Family"
                isDisabled={!formData.family}
                extraPayload={{ familyId: families.find(f => f.name === formData.family)?._id }}
                onRefresh={async () => {
                  try {
                    const token = localStorage.getItem('token');
                    const headers = { Authorization: `Bearer ${token}` };
                    const subFamRes = await axios.get('/api/v1/hierarchy/subfamilies', { headers });
                    setSubFamilies(subFamRes.data.filter(sf => sf.isActive !== false));
                  } catch(e) { console.error('Failed to refresh sub families', e); }
                }}
                fields={[{ name: 'name', label: 'Sub Family Name' }, { name: 'code', label: 'Code' }]}
              />
            </div>
          </div>
          </div>

          {/* Attributes & Characteristics */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden group hover:border-emerald-300 transition-colors">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <Settings size={18} className="text-emerald-500" />
              <h3 className="font-black text-slate-700 tracking-widest uppercase text-xs">Attributes & Characteristics</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField label="Long Description">
              <Input value={formData.longDescription} onChange={e => setFormData({...formData, longDescription: e.target.value})} />
            </FormField>
            <FormField label="Description 3"><Input value={formData.description3} onChange={e => setFormData({...formData, description3: e.target.value})} /></FormField>
            
            <FormField label="Description 4"><Input value={formData.description4} onChange={e => setFormData({...formData, description4: e.target.value})} /></FormField>
            <FormField label="Style Code"><Input value={formData.styleCode} onChange={e => setFormData({...formData, styleCode: e.target.value})} /></FormField>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium">Color</label>
              </div>
              <MasterSelect 
                options={colors.map(c => ({ value: c.name, label: c.name, original: c }))}
                value={formData.color}
                onChange={val => setFormData({...formData, color: val})}
                endpoint="/api/v1/hierarchy/colors"
                title="Color"
                onRefresh={async () => {
                  try {
                    const token = localStorage.getItem('token');
                    const headers = { Authorization: `Bearer ${token}` };
                    const colorRes = await axios.get('/api/v1/hierarchy/colors', { headers });
                    setColors(colorRes.data.filter(c => c.isActive !== false));
                  } catch(e) { console.error('Failed to refresh colors', e); }
                }}
                fields={[{ name: 'name', label: 'Color Name' }, { name: 'code', label: 'Code' }]}
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium">Size</label>
              </div>
              <MasterSelect 
                options={sizes.map(s => ({ value: s.name, label: s.name, original: s }))}
                value={formData.size}
                onChange={val => setFormData({...formData, size: val})}
                endpoint="/api/v1/hierarchy/sizes"
                title="Size"
                onRefresh={async () => {
                  try {
                    const token = localStorage.getItem('token');
                    const headers = { Authorization: `Bearer ${token}` };
                    const sizeRes = await axios.get('/api/v1/hierarchy/sizes', { headers });
                    setSizes(sizeRes.data.filter(s => s.isActive !== false));
                  } catch(e) { console.error('Failed to refresh sizes', e); }
                }}
                fields={[{ name: 'name', label: 'Size Name' }, { name: 'code', label: 'Code' }]}
              />
            </div>
            <FormField label="UPC"><Input value={formData.upc} onChange={e => setFormData({...formData, upc: e.target.value})} /></FormField>
            <FormField label="Item Reference"><Input value={formData.itemReference} onChange={e => setFormData({...formData, itemReference: e.target.value})} /></FormField>
            <FormField label="HSN Code"><Input value={formData.hsnCode} onChange={e => setFormData({...formData, hsnCode: e.target.value})} /></FormField>
          </div>
          </div>

          {/* Stock Metrics & UOM */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden group hover:border-amber-300 transition-colors">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <Box size={18} className="text-amber-500" />
              <h3 className="font-black text-slate-700 tracking-widest uppercase text-xs">Stock Metrics & UOM Protocols</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">

            <FormField label="Base Unit (Stock UOM)" required>
              <Select required value={formData.uomDetails.baseUnit} onChange={e => handleUomChange('baseUnit', e.target.value)}>
                <option value="">Select Base UOM</option>
                {uoms.map(u => <option key={u.code} value={u.name}>{u.name}</option>)}
              </Select>
            </FormField>
            
            <FormField label="Purchase Unit">
              <Select value={formData.uomDetails.purchaseUnit} onChange={e => handleUomChange('purchaseUnit', e.target.value)}>
                <option value="">Select Purchase UOM</option>
                {uoms.map(u => <option key={u.code} value={u.name}>{u.name}</option>)}
              </Select>
            </FormField>
            
            <FormField label="Sales Unit">
              <Select value={formData.uomDetails.salesUnit} onChange={e => handleUomChange('salesUnit', e.target.value)}>
                <option value="">Select Sales UOM</option>
                {uoms.map(u => <option key={u.code} value={u.name}>{u.name}</option>)}
              </Select>
            </FormField>


            
            <FormField label="Stock Management">
              <Select value={formData.stockManagement} onChange={e => setFormData({...formData, stockManagement: e.target.value})}>
                <option value="NONE">None</option>
                <option value="MANUAL">Manual</option>
                <option value="AUTOMATIC">Automatic</option>
                <option value="REORDER_LEVEL">Reorder Level</option>
                <option value="MANAGED">Managed (Legacy)</option>
                <option value="UNMANAGED">Unmanaged (Legacy)</option>
              </Select>
            </FormField>

            <FormField label="Min Stock Level">
              <Input type="number" min="0" value={formData.minStockLevel} onChange={e => setFormData({...formData, minStockLevel: e.target.value})} />
            </FormField>
            
            <FormField label="Max Stock Level">
              <Input type="number" min="0" value={formData.maxStockLevel} onChange={e => setFormData({...formData, maxStockLevel: e.target.value})} />
            </FormField>
            
            <FormField label="Weight">
              <Input type="number" min="0" step="any" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} />
            </FormField>

            <FormField label="Weight UOM">
              <Select value={formData.weightUom} onChange={e => setFormData({...formData, weightUom: e.target.value})}>
                <option value="Gram">Gram</option>
                <option value="Kilogram">Kilogram</option>
                <option value="Ton">Ton</option>
                <option value="Pound">Pound</option>
              </Select>
            </FormField>
            
          </div>
          </div>

          {/* Financials & Trade */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden group hover:border-emerald-300 transition-colors">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <DollarSign size={18} className="text-emerald-600" />
              <h3 className="font-black text-slate-700 tracking-widest uppercase text-xs">Financial & Trade Data</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">

            <FormField label="Sales Price ($)" required>
              <Input type="number" required min="0" step="0.01" value={formData.salesPrice} onChange={e => setFormData({...formData, salesPrice: e.target.value})} />
            </FormField>
            
            <FormField label="Purchase Price ($)">
              <Input type="number" min="0" step="0.01" value={formData.purchasePrice} onChange={e => setFormData({...formData, purchasePrice: e.target.value})} />
            </FormField>
            
            <FormField label="Landed Cost ($)">
              <Input type="number" min="0" step="0.01" value={formData.landedCost} onChange={e => setFormData({...formData, landedCost: e.target.value})} />
            </FormField>
            
            <FormField label="Costing Method">
              <Select value={formData.costingMethod} onChange={e => setFormData({...formData, costingMethod: e.target.value})}>
                <option value="AVCO">AVCO</option>
                <option value="FIFO">FIFO</option>
                <option value="LIFO">LIFO</option>
                <option value="AVERAGE">Average</option>
                <option value="STANDARD">Standard</option>
              </Select>
            </FormField>
            
            <FormField label="Tax 1 (Tax Master)">
              <Select value={formData.tax1} onChange={e => setFormData({...formData, tax1: e.target.value})}>
                <option value="">None</option>
                {taxes.map(tax => <option key={tax._id} value={tax._id}>{tax.name}</option>)}
              </Select>
            </FormField>

            <FormField label="Supplier Name">
              <Select value={formData.supplierName} onChange={e => setFormData({...formData, supplierName: e.target.value})}>
                <option value="">Select Supplier</option>
                {suppliers.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
              </Select>
            </FormField>
            
            <FormField label="Expiry Date">
              <Input type="date" value={formData.expiry} onChange={e => setFormData({...formData, expiry: e.target.value})} />
            </FormField>
            
            <FormField label="Expiry Days/Type">
              <Input placeholder="e.g. 30 Days" value={formData.expiryType} onChange={e => setFormData({...formData, expiryType: e.target.value})} />
            </FormField>
          </div>
          </div>

          {/* Details & Images */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden group hover:border-blue-300 transition-colors">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <ImageIcon size={18} className="text-blue-500" />
              <h3 className="font-black text-slate-700 tracking-widest uppercase text-xs">Dates, Notes & Imagery</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">

            <FormField label="Note 1"><Input value={formData.note1} onChange={e => setFormData({...formData, note1: e.target.value})} /></FormField>
            <FormField label="Note 2"><Input value={formData.note2} onChange={e => setFormData({...formData, note2: e.target.value})} /></FormField>
            <FormField label="Note 3"><Input value={formData.note3} onChange={e => setFormData({...formData, note3: e.target.value})} /></FormField>

            <FormField label="Date 1"><Input type="date" value={formData.date1} onChange={e => setFormData({...formData, date1: e.target.value})} /></FormField>
            <FormField label="Date 2"><Input type="date" value={formData.date2} onChange={e => setFormData({...formData, date2: e.target.value})} /></FormField>

            <div className="col-span-1 md:col-span-3 border-t border-gray-200 mt-4 pt-4">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-4">Product Images</h3>
              
              <div className="mb-4">
                <input 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  onChange={handleFileChange} 
                  className="block w-full text-sm text-slate-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-indigo-50 file:text-indigo-700
                    hover:file:bg-indigo-100"
                />
              </div>

              {(existingImages.length > 0 || imagePreviews.length > 0) && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 mb-4">
                  {existingImages.map((img, idx) => (
                    <div key={`exist-${idx}`} className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-square bg-gray-100">
                      <img src={img} alt={`Existing ${idx}`} className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => handleRemoveExistingImage(img)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {imagePreviews.map((img, idx) => (
                    <div key={`new-${idx}`} className="relative group rounded-lg overflow-hidden border-2 border-indigo-200 border-dashed aspect-square bg-indigo-50">
                      <img src={img} alt={`New ${idx}`} className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => handleRemoveSelectedFile(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="col-span-3">
              <FormField label="Item Description Details (Arabic / Additional)">
                <textarea className="w-full flex min-h-[60px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" value={formData.itemDescriptionDetails} onChange={e => setFormData({...formData, itemDescriptionDetails: e.target.value})} />
              </FormField>
            </div>
            
            {isEditing && (
              <>
                <FormField label="Created Date">
                  <Input readOnly disabled value={productToEdit.createdAt ? new Date(productToEdit.createdAt).toLocaleString() : ''} className="bg-gray-100" />
                </FormField>
                <FormField label="Last Updated">
                  <Input readOnly disabled value={productToEdit.updatedAt ? new Date(productToEdit.updatedAt).toLocaleString() : ''} className="bg-gray-100" />
                </FormField>
              </>
            )}
            </div>
          </div>
          
          {isEditing && (
            <Alert className="bg-yellow-50 text-yellow-800 border-yellow-200">
              <strong>Warning:</strong> Modifying Base Unit or conversion factors for an item with existing stock history will cause validation errors to prevent data corruption.
            </Alert>
          )}

        {/* Footer */}
        <div className="mt-4 flex justify-end gap-3 shrink-0">
          <button 
            type="button" 
            onClick={onClose}
            className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest rounded hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={loading}
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-blue-500 shadow-md transition-colors disabled:opacity-50"
          >
            {loading ? 'Committing...' : <><Save size={16} /> Commit Changes</>}
          </button>
        </div>
      </form>
      </div>
    </div>
  );
};

export default AddProductModal;

