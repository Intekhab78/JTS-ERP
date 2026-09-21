import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal } from '../common/Modal';
import { FormField } from '../common/FormField';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { Trash2 } from 'lucide-react';

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
        const [taxRes, uomRes, convRes, supplierRes, famRes, subFamRes, sizeRes, colorRes, deptRes] = await Promise.all([
          axios.get('http://localhost:5000/api/v1/taxes', { headers }).catch(() => ({ data: [] })),
          axios.get('http://localhost:5000/api/v1/inventory/uoms', { headers }).catch(() => ({ data: [] })),
          axios.get('http://localhost:5000/api/v1/inventory/uom-conversions', { headers }).catch(() => ({ data: [] })),
          axios.get('http://localhost:5000/api/v1/suppliers', { headers }).catch(() => ({ data: [] })),
          axios.get('http://localhost:5000/api/v1/hierarchy/families', { headers }).catch(() => ({ data: [] })),
          axios.get('http://localhost:5000/api/v1/hierarchy/subfamilies', { headers }).catch(() => ({ data: [] })),
          axios.get('http://localhost:5000/api/v1/hierarchy/sizes', { headers }).catch(() => ({ data: [] })),
          axios.get('http://localhost:5000/api/v1/hierarchy/colors', { headers }).catch(() => ({ data: [] })),
          axios.get('http://localhost:5000/api/v1/hierarchy/departments', { headers }).catch(() => ({ data: [] }))
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
        const catRes = await axios.post('http://localhost:5000/api/v1/inventory/categories', 
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
        const res = await axios.put(`http://localhost:5000/api/v1/inventory/products/${productToEdit._id}`, 
          payload, 
          { headers }
        );
        productId = productToEdit._id;
      } else {
        const res = await axios.post('http://localhost:5000/api/v1/inventory/products', 
          payload, 
          { headers }
        );
        productId = res.data._id || res.data.id;
      }

      // Handle Image Deletions
      for (const imgUrl of imagesToDelete) {
        const imageName = imgUrl.split('/').pop();
        try {
          await axios.delete(`http://localhost:5000/api/v1/inventory/products/${productId}/images/${imageName}`, { headers });
        } catch(e) { console.error("Failed to delete image", e); }
      }

      // Handle New Image Uploads
      if (selectedFiles.length > 0) {
        const imgData = new FormData();
        selectedFiles.forEach(f => imgData.append('images', f));
        await axios.post(`http://localhost:5000/api/v1/inventory/products/${productId}/images`, imgData, {
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
    <Modal 
      isOpen={true} 
      onClose={onClose} 
      title={isEditing ? `Edit Product: ${formData.name}` : "New Product"}
      size="custom"
      className="max-w-[85vw] w-[85vw]"
    >
      <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[80vh]">
        {error && <Alert variant="destructive" className="mb-4">{error}</Alert>}

        {/* Header fields always visible */}
        <div className="flex gap-4 items-start mb-6 pb-6 border-b border-gray-200">
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
            <label htmlFor="isActive" className="text-sm font-medium">Active Product</label>
          </div>
        </div>

        <div className="mb-4"></div>

        {/* Form Fields Grid */}
        <div className="flex-1 overflow-y-auto pr-2 pb-4">
          <div className="grid grid-cols-3 gap-6">
            
            <FormField label="Item Type">
              <Select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                <option value="STANDARD">Product</option>
                <option value="SERVICE">Service</option>
                <option value="RAW_MATERIAL">Raw Material</option>
                <option value="PACKING_MATERIAL">Packing Material</option>
                <option value="SEMI_FINISHED_GOODS">Semi Finished Goods</option>
                <option value="CONSUMABLE">Consumable</option>
                <option value="PHANTOM">Phantom Items</option>
              </Select>
            </FormField>
            
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium">Department</label>
              </div>
              <Select value={formData.department} onChange={e => {
                setFormData({
                  ...formData, 
                  department: e.target.value,
                  categoryId: '',
                  family: '',
                  subFamily: ''
                });
              }}>
                <option value="">Select Department</option>
                {departments.map(d => <option key={d._id} value={d.name}>{d.name}</option>)}
              </Select>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium">Category <span className="text-error">*</span></label>
              </div>
              <Select required value={formData.categoryId} onChange={e => {
                setFormData({
                  ...formData, 
                  categoryId: e.target.value,
                  family: '',
                  subFamily: ''
                });
              }} disabled={!formData.department}>
                <option value="">Select a category</option>
                {categories
                  .filter(cat => {
                    const selDept = departments.find(d => d.name === formData.department);
                    return selDept && (cat.itemDepartmentId === selDept._id || cat.itemDepartmentId?._id === selDept._id);
                  })
                  .map(cat => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
              </Select>
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
            <FormField label="Family">
              <Select value={formData.family} onChange={e => {
                const familyName = e.target.value;
                setFormData({...formData, family: familyName, subFamily: ''}); // Clear subFamily when family changes
              }} disabled={!formData.categoryId}>
                <option value="">Select Family</option>
                {families
                  .filter(f => f.categoryId === formData.categoryId || f.categoryId?._id === formData.categoryId)
                  .map(f => <option key={f._id} value={f.name}>{f.name}</option>)}
              </Select>
            </FormField>
            
            <FormField label="Sub Family">
              <Select value={formData.subFamily} onChange={e => setFormData({...formData, subFamily: e.target.value})} disabled={!formData.family}>
                <option value="">Select Sub Family</option>
                {subFamilies
                  .filter(sf => sf.familyId?.name === formData.family)
                  .map(sf => <option key={sf._id} value={sf.name}>{sf.name}</option>)}
              </Select>
            </FormField>
            <FormField label="Long Description">
              <Input value={formData.longDescription} onChange={e => setFormData({...formData, longDescription: e.target.value})} />
            </FormField>
            <FormField label="Description 3"><Input value={formData.description3} onChange={e => setFormData({...formData, description3: e.target.value})} /></FormField>
            
            <FormField label="Description 4"><Input value={formData.description4} onChange={e => setFormData({...formData, description4: e.target.value})} /></FormField>
            <FormField label="Style Code"><Input value={formData.styleCode} onChange={e => setFormData({...formData, styleCode: e.target.value})} /></FormField>
            <FormField label="Color">
              <Select value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})}>
                <option value="">Select Color</option>
                {colors.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
              </Select>
            </FormField>
            
            <FormField label="Size">
              <Select value={formData.size} onChange={e => setFormData({...formData, size: e.target.value})}>
                <option value="">Select Size</option>
                {sizes.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
              </Select>
            </FormField>
            <FormField label="UPC"><Input value={formData.upc} onChange={e => setFormData({...formData, upc: e.target.value})} /></FormField>
            <FormField label="Item Reference"><Input value={formData.itemReference} onChange={e => setFormData({...formData, itemReference: e.target.value})} /></FormField>
            
            <FormField label="HSN Code"><Input value={formData.hsnCode} onChange={e => setFormData({...formData, hsnCode: e.target.value})} /></FormField>

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

            <FormField label="Note 1"><Input value={formData.note1} onChange={e => setFormData({...formData, note1: e.target.value})} /></FormField>
            <FormField label="Note 2"><Input value={formData.note2} onChange={e => setFormData({...formData, note2: e.target.value})} /></FormField>
            <FormField label="Note 3"><Input value={formData.note3} onChange={e => setFormData({...formData, note3: e.target.value})} /></FormField>

            <FormField label="Date 1"><Input type="date" value={formData.date1} onChange={e => setFormData({...formData, date1: e.target.value})} /></FormField>
            <FormField label="Date 2"><Input type="date" value={formData.date2} onChange={e => setFormData({...formData, date2: e.target.value})} /></FormField>

            <div className="col-span-3 border-t border-gray-200 mt-4 pt-4">
              <h3 className="text-lg font-medium mb-4">Product Images</h3>
              
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
          
          {isEditing && (
            <Alert className="bg-yellow-50 text-yellow-800 border-yellow-200 mt-6">
              <strong>Warning:</strong> Modifying Base Unit or conversion factors for an item with existing stock history will cause validation errors to prevent data corruption.
            </Alert>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end gap-3 shrink-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading} isLoading={loading}>
            {isEditing ? 'Save Changes' : 'Save Product'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddProductModal;

