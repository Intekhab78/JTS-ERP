import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { FormField } from '../common/FormField';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { Trash2, Save, X, Box, ArrowLeft, Info, Layers, Settings, DollarSign, Image as ImageIcon, Building, MapPin, ChevronDown, Check, CheckCircle2, Search } from 'lucide-react';
import { MasterSelect } from '../common/MasterSelect';
import { VariantMatrixManager } from './VariantMatrixManager';

const AddProductModal = ({ onClose, categories: propCategories = [], refresh, productToEdit, onSuccess }) => {
  const [categories, setCategories] = useState(propCategories || []);

  useEffect(() => {
    if (propCategories) {
      setCategories(propCategories);
    }
  }, [propCategories]);

  const isEditing = !!productToEdit;

  const defaultEmptyForm = {
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
    isActive: true,
    hasVariants: false,
    variantAttributeDefinitions: []
  };

  const [formData, setFormData] = useState(() => {
    if (productToEdit) {
      return {
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
        expiry: productToEdit.expiry ? (typeof productToEdit.expiry === 'string' ? productToEdit.expiry.split('T')[0] : new Date(productToEdit.expiry).toISOString().split('T')[0]) : '',
        expiryType: productToEdit.expiryType || '',
        expiryDays: productToEdit.expiryDays || 0,
        note1: productToEdit.note1 || '',
        note2: productToEdit.note2 || '',
        note3: productToEdit.note3 || '',
        date1: productToEdit.date1 ? (typeof productToEdit.date1 === 'string' ? productToEdit.date1.split('T')[0] : new Date(productToEdit.date1).toISOString().split('T')[0]) : '',
        date2: productToEdit.date2 ? (typeof productToEdit.date2 === 'string' ? productToEdit.date2.split('T')[0] : new Date(productToEdit.date2).toISOString().split('T')[0]) : '',
        itemDescriptionDetails: productToEdit.itemDescriptionDetails || '',
        isActive: productToEdit.isActive !== false,
        hasVariants: Boolean(productToEdit.hasVariants),
        variantAttributeDefinitions: productToEdit.variantAttributeDefinitions || []
      };
    }
    try {
      const savedDraft = localStorage.getItem('jts_product_create_draft');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.formData && typeof parsed.formData === 'object') {
          return { ...defaultEmptyForm, ...parsed.formData };
        }
      }
    } catch (e) {
      console.warn('Failed to parse product draft from localStorage', e);
    }
    return defaultEmptyForm;
  });
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(categories.length === 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [variants, setVariants] = useState(() => {
    if (productToEdit) return [];
    try {
      const savedDraft = localStorage.getItem('jts_product_create_draft');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (Array.isArray(parsed.variants)) return parsed.variants;
      }
    } catch (e) {}
    return [];
  });
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

  // Multi-Company & Multi-Branch States
  const [legalCompanies, setLegalCompanies] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState(() => {
    if (productToEdit?.companyIds && Array.isArray(productToEdit.companyIds)) {
      return productToEdit.companyIds.map(id => (id._id || id).toString());
    }
    if (productToEdit) return [];
    try {
      const savedDraft = localStorage.getItem('jts_product_create_draft');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (Array.isArray(parsed.selectedCompanyIds)) return parsed.selectedCompanyIds;
      }
    } catch (e) {}
    return [];
  });
  const [selectedBranchIds, setSelectedBranchIds] = useState(() => {
    if (productToEdit?.branchIds && Array.isArray(productToEdit.branchIds)) {
      return productToEdit.branchIds.map(id => (id._id || id).toString());
    }
    if (productToEdit) return [];
    try {
      const savedDraft = localStorage.getItem('jts_product_create_draft');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (Array.isArray(parsed.selectedBranchIds)) return parsed.selectedBranchIds;
      }
    } catch (e) {}
    return [];
  });

  // Auto-save form draft to localStorage whenever user edits fields
  useEffect(() => {
    if (!isEditing) {
      try {
        localStorage.setItem('jts_product_create_draft', JSON.stringify({
          formData,
          variants,
          selectedCompanyIds,
          selectedBranchIds
        }));
      } catch (e) {}
    }
  }, [formData, variants, selectedCompanyIds, selectedBranchIds, isEditing]);
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  const [branchSearch, setBranchSearch] = useState('');
  const companyDropdownRef = useRef(null);
  const branchDropdownRef = useRef(null);

  // Close company/branch popovers when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(e.target)) {
        setIsCompanyDropdownOpen(false);
      }
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(e.target)) {
        setIsBranchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        const [taxRes, uomRes, convRes, supplierRes, famRes, subFamRes, sizeRes, colorRes, deptRes, itemTypesRes, legalCompRes, branchRes] = await Promise.all([
          axios.get('/api/v1/taxes', { headers }).catch(() => ({ data: [] })),
          axios.get('/api/v1/inventory/uoms', { headers }).catch(() => ({ data: [] })),
          axios.get('/api/v1/inventory/uom-conversions', { headers }).catch(() => ({ data: [] })),
          axios.get('/api/v1/suppliers', { headers }).catch(() => ({ data: [] })),
          axios.get('/api/v1/hierarchy/families', { headers }).catch(() => ({ data: [] })),
          axios.get('/api/v1/hierarchy/subfamilies', { headers }).catch(() => ({ data: [] })),
          axios.get('/api/v1/hierarchy/sizes', { headers }).catch(() => ({ data: [] })),
          axios.get('/api/v1/hierarchy/colors', { headers }).catch(() => ({ data: [] })),
          axios.get('/api/v1/hierarchy/departments', { headers }).catch(() => ({ data: [] })),
          axios.get('/api/v1/hierarchy/itemtypes', { headers }).catch(() => ({ data: [] })),
          axios.get('/api/v1/legal-company?all=true', { headers: { ...headers, 'x-company-id': 'ALL' } })
            .catch(() => axios.get('/api/v1/legal-company/my-companies', { headers: { ...headers, 'x-company-id': 'ALL' } }))
            .catch(() => ({ data: [] })),
          axios.get('/api/v1/branches?all=true', { headers: { ...headers, 'x-company-id': 'ALL' } }).catch(() => ({ data: [] }))
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

        const standardItemTypes = [
          { name: 'STANDARD', _id: 'STANDARD' },
          { name: 'SERVICE', _id: 'SERVICE' },
          { name: 'RAW_MATERIAL', _id: 'RAW_MATERIAL' },
          { name: 'PACKING_MATERIAL', _id: 'PACKING_MATERIAL' },
          { name: 'SEMI_FINISHED_GOODS', _id: 'SEMI_FINISHED_GOODS' },
          { name: 'CONSUMABLE', _id: 'CONSUMABLE' },
          { name: 'PHANTOM', _id: 'PHANTOM' }
        ];

        if (itemTypesRes && Array.isArray(itemTypesRes.data) && itemTypesRes.data.length > 0) {
          const apiTypes = itemTypesRes.data.filter(it => it.isActive !== false);
          const apiNames = new Set(apiTypes.map(it => it.name?.toUpperCase()));
          const merged = [
            ...apiTypes,
            ...standardItemTypes.filter(st => !apiNames.has(st.name.toUpperCase()))
          ];
          setItemTypes(merged);
        } else {
          setItemTypes(standardItemTypes);
        }
        const comps = Array.isArray(legalCompRes.data) ? legalCompRes.data.filter(c => c.isActive !== false) : [];
        const brs = Array.isArray(branchRes.data) ? branchRes.data.filter(b => b.isActive !== false) : [];
        setLegalCompanies(comps);
        setBranches(brs);

        // If editing a product with legacy string company/location, match by name
        if (productToEdit) {
          if ((!productToEdit.companyIds || productToEdit.companyIds.length === 0) && productToEdit.company) {
            const compNames = productToEdit.company.split(',').map(s => s.trim().toLowerCase());
            const matchedCompIds = comps.filter(c => compNames.includes(c.name?.toLowerCase())).map(c => c._id.toString());
            if (matchedCompIds.length > 0) setSelectedCompanyIds(matchedCompIds);
          }
          if ((!productToEdit.branchIds || productToEdit.branchIds.length === 0) && productToEdit.location) {
            const brNames = productToEdit.location.split(',').map(s => s.trim().toLowerCase());
            const matchedBrIds = brs.filter(b => brNames.includes(b.name?.toLowerCase())).map(b => b._id.toString());
            if (matchedBrIds.length > 0) setSelectedBranchIds(matchedBrIds);
          }
        }
      } catch (err) {
        console.error('Failed to fetch master data', err);
      }
    };
    fetchMasterData();
  }, []);

  // Fetch existing variants if editing a product with variants enabled
  useEffect(() => {
    if (isEditing && productToEdit?._id && productToEdit.hasVariants) {
      const fetchVariants = async () => {
        try {
          const token = localStorage.getItem('token');
          const headers = { Authorization: `Bearer ${token}` };
          const res = await axios.get(`/api/v1/inventory/products/${productToEdit._id}/variants?includeInactive=true`, { headers });
          if (res.data && res.data.variants) {
            setVariants(res.data.variants);
          }
        } catch (e) {
          console.error('Failed to fetch existing variants', e);
        }
      };
      fetchVariants();
    }
  }, [isEditing, productToEdit]);

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

  // Filter branches based on selected companies (Cascading Filter)
  const availableBranches = useMemo(() => {
    if (selectedCompanyIds.length === 0) {
      return branches;
    }
    return branches.filter(b => {
      const compId = (b.legalCompanyId?._id || b.legalCompanyId)?.toString();
      return !compId || selectedCompanyIds.includes(compId);
    });
  }, [branches, selectedCompanyIds]);

  const handleToggleCompany = (companyId) => {
    const isSelected = selectedCompanyIds.includes(companyId);
    let nextCompanyIds = [];
    if (isSelected) {
      nextCompanyIds = selectedCompanyIds.filter(id => id !== companyId);
    } else {
      nextCompanyIds = [...selectedCompanyIds, companyId];
    }
    setSelectedCompanyIds(nextCompanyIds);

    // If company was deselected, clean up selected branches that no longer belong to selected companies
    if (isSelected && nextCompanyIds.length > 0) {
      const validBranchIds = branches
        .filter(b => {
          const cId = (b.legalCompanyId?._id || b.legalCompanyId)?.toString();
          return cId && nextCompanyIds.includes(cId);
        })
        .map(b => b._id.toString());
      setSelectedBranchIds(prev => prev.filter(id => validBranchIds.includes(id)));
    }
  };

  const handleToggleBranch = (branchId) => {
    setSelectedBranchIds(prev =>
      prev.includes(branchId) ? prev.filter(id => id !== branchId) : [...prev, branchId]
    );
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

      // Sync company & location strings and IDs
      const selectedCompanyNames = legalCompanies
        .filter(c => selectedCompanyIds.includes(c._id.toString()))
        .map(c => c.name);
      const selectedBranchNames = branches
        .filter(b => selectedBranchIds.includes(b._id.toString()))
        .map(b => b.name);

      // Sanitize variant attribute definitions (filter out dimensions with 0 values like Size on a color-only product)
      const cleanVariantAttributeDefs = (formData.hasVariants && Array.isArray(formData.variantAttributeDefinitions))
        ? formData.variantAttributeDefinitions.filter(
            def => def && def.name && Array.isArray(def.values) && def.values.some(v => typeof v === 'string' && v.trim() !== '')
          )
        : [];

      if (formData.hasVariants && cleanVariantAttributeDefs.length === 0) {
        setError('Please define at least one variant dimension with values (e.g. Color or Size), or uncheck "Enable Variant Matrix".');
        setLoading(false);
        return;
      }

      const payload = { 
        ...formData, 
        categoryId: finalCategoryId, 
        uom: formData.uomDetails.baseUnit,
        companyIds: selectedCompanyIds,
        branchIds: selectedBranchIds,
        company: selectedCompanyNames.join(', '),
        location: selectedBranchNames.join(', '),
        hasVariants: formData.hasVariants && cleanVariantAttributeDefs.length > 0,
        variantAttributeDefinitions: cleanVariantAttributeDefs,
        images: existingImages,
        uploadImage: existingImages.length > 0 ? existingImages[0] : null
      };
      
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

      // Handle Variant Synchronization if hasVariants is enabled
      if (formData.hasVariants && cleanVariantAttributeDefs.length > 0) {
        let finalVariantsToSync = Array.isArray(variants) ? [...variants] : [];

        // If user defined attributes (e.g. Color: WHITE, BLUE) but has not clicked "GENERATE MATRIX GRID" yet,
        // auto-generate the variant combinations so their configuration is saved properly!
        if (finalVariantsToSync.length === 0) {
          const arrays = cleanVariantAttributeDefs.map(attr => 
            attr.values.map(v => ({ name: attr.name.trim(), value: v.trim() }))
          );
          const combos = arrays.reduce((acc, curr) => acc.flatMap(c => curr.map(n => [...c, n])), [[]]);
          const baseSku = formData.sku ? formData.sku.trim().toUpperCase() : 'ITEM';

          finalVariantsToSync = combos.map(combo => {
            const attributesObj = {};
            const sigParts = [];
            const codeParts = [];
            combo.forEach(pair => {
              attributesObj[pair.name] = pair.value;
              sigParts.push(`${pair.name.toLowerCase()}:${pair.value.toLowerCase()}`);
              codeParts.push(pair.value.toUpperCase().replace(/\s+/g, ''));
            });
            return {
              sku: `${baseSku}-${codeParts.join('-')}`,
              barcode: '',
              attributes: attributesObj,
              attributeSignature: sigParts.sort().join('|'),
              salesPrice: formData.salesPrice ? Number(formData.salesPrice) : null,
              purchasePrice: formData.purchasePrice ? Number(formData.purchasePrice) : null,
              priceAdjustment: 0,
              weight: 0,
              isActive: true
            };
          });
        }

        if (finalVariantsToSync.length > 0) {
          await axios.post(
            `/api/v1/inventory/products/${productId}/variants/bulk`,
            {
              variantAttributeDefinitions: cleanVariantAttributeDefs,
              variants: finalVariantsToSync
            },
            { headers }
          );
        }
      }
      
      if (!isEditing) {
        localStorage.removeItem('jts_product_create_draft');
      }

      const successMsg = isEditing 
        ? `Product "${formData.name || 'item'}" saved successfully!` 
        : `Product "${formData.name || 'item'}" created successfully!`;

      setSuccessMessage(successMsg);
      if (typeof onSuccess === 'function') {
        onSuccess(successMsg);
      }
      alert(successMsg);

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
      {/* Tech Header */}
      <div className="bg-[#0a0f1c] text-white px-5 py-3 shadow-md relative shrink-0 border-l-4 border-blue-500 rounded-lg mb-3">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/15 to-transparent pointer-events-none rounded-lg"></div>
        
        <div className="relative z-10 flex justify-between items-center w-full gap-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-md transition-colors flex items-center justify-center border border-slate-700 shadow-inner">
               <ArrowLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <div className="h-6 w-6 bg-blue-600 flex items-center justify-center rounded">
                  <Box size={14} className="text-white" />
                </div>
                <h1 className="text-lg font-bold uppercase tracking-wider">{isEditing ? `Edit Product: ${formData.name}` : "Create New Product"}</h1>
              </div>
              <p className="text-slate-400 text-[11px] font-semibold tracking-wider uppercase">
                MASTER DATA MANAGEMENT • SKU PROTOCOLS
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear all filled fields and reset the draft?')) {
                    localStorage.removeItem('jts_product_create_draft');
                    setFormData(defaultEmptyForm);
                    setVariants([]);
                    setSelectedCompanyIds([]);
                    setSelectedBranchIds([]);
                  }
                }}
                className="text-[10px] font-bold text-slate-300 hover:text-rose-300 bg-slate-800 hover:bg-rose-950/40 border border-slate-700 hover:border-rose-500/50 px-2.5 py-1.5 rounded uppercase tracking-wider transition-colors cursor-pointer"
                title="Clear all fields"
              >
                Reset Draft
              </button>
            )}
            <div className="flex items-center gap-2 bg-[#111827] border border-slate-800 px-3 py-1.5 rounded-md shadow-inner">
               <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
               <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">{isEditing ? 'UPDATE PROTOCOL' : 'CREATION PROTOCOL'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-full">
          {error && <Alert variant="destructive" className="mb-2">{error}</Alert>}
          {successMessage && (
            <div className="mb-2 p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-md flex items-center gap-2 font-bold text-xs animate-in fade-in">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Primary Identification Card */}
          <div className="bg-white border border-slate-200 shadow-xs rounded-lg transition-colors">
            <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/75 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info size={15} className="text-blue-500" />
                <h3 className="font-bold text-slate-700 tracking-wider uppercase text-xs">Primary Identification</h3>
              </div>
              <label htmlFor="isActive" className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  id="isActive" 
                  checked={formData.isActive}
                  onChange={e => setFormData({...formData, isActive: e.target.checked})}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Active Product</span>
              </label>
            </div>
            <div className="p-3.5">
              <FormField label="Product Name" required className="!mb-0">
                <Input 
                  required
                  placeholder="e.g. Apple iPhone 18 Pro"
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="h-9 text-sm font-medium"
                />
              </FormField>
            </div>
          </div>

          {/* Color & Size Variant Matrix Manager */}
          <VariantMatrixManager
            hasVariants={formData.hasVariants}
            onHasVariantsChange={(val) => setFormData(prev => ({ ...prev, hasVariants: val }))}
            attributeDefinitions={formData.variantAttributeDefinitions}
            onAttributeDefinitionsChange={(defs) => setFormData(prev => ({ ...prev, variantAttributeDefinitions: defs }))}
            variants={variants}
            onVariantsChange={setVariants}
            parentSku={formData.sku}
            parentSalesPrice={formData.salesPrice}
            parentPurchasePrice={formData.purchasePrice}
            masterColors={colors}
            masterSizes={sizes}
            isEditing={isEditing}
          />

          {/* Hierarchy & Classification Card */}
          <div className="bg-white border border-slate-200 shadow-xs rounded-lg transition-colors relative z-20">
            <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/75 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers size={15} className="text-indigo-500" />
                <h3 className="font-bold text-slate-700 tracking-wider uppercase text-xs">Hierarchy & Classification</h3>
              </div>
              <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                Sequence: Department ➔ Category ➔ Family ➔ Sub Family
              </span>
            </div>
            
            <div className="p-3.5 space-y-3">
              {/* Row 1: Strict Hierarchy Sequence (Department -> Category -> Family -> Sub Family) */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 mb-1.5 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                  Product Classification Tree
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {/* 1. Department */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">1. Department</label>
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
                      onCreated={(newDept) => {
                        setFormData(prev => ({
                          ...prev,
                          department: newDept.name,
                          categoryId: '',
                          family: '',
                          subFamily: ''
                        }));
                      }}
                      fields={[{ name: 'name', label: 'Department Name' }, { name: 'code', label: 'Department Code' }]}
                    />
                  </div>

                  {/* 2. Category */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">2. Category <span className="text-error">*</span></label>
                    <MasterSelect 
                      options={categories
                        .filter(cat => {
                          if (!formData.department) return true;
                          const selDept = departments.find(d => d.name === formData.department);
                          if (!selDept) return true;
                          const deptId = cat.itemDepartmentId?._id || cat.itemDepartmentId;
                          return !deptId || deptId === selDept._id;
                        })
                        .map(cat => ({ value: cat._id, label: cat.name, original: cat }))}
                      value={formData.categoryId}
                      onChange={val => {
                        const selCat = categories.find(c => c._id === val);
                        let autoDept = formData.department;
                        if (selCat && selCat.itemDepartmentId) {
                          const catDeptId = selCat.itemDepartmentId?._id || selCat.itemDepartmentId;
                          const foundDept = departments.find(d => d._id === catDeptId);
                          if (foundDept) autoDept = foundDept.name;
                        }
                        setFormData({
                          ...formData, 
                          categoryId: val,
                          department: autoDept,
                          family: '',
                          subFamily: ''
                        });
                      }}
                      endpoint="/api/v1/inventory/categories"
                      title="Category"
                      parent={{
                        label: 'Department',
                        name: 'itemDepartmentId',
                        value: departments.find(d => d.name === formData.department)?._id,
                        displayValue: formData.department,
                        options: departments.map(d => ({ value: d._id, label: d.name }))
                      }}
                      extraPayload={{ itemDepartmentId: departments.find(d => d.name === formData.department)?._id }}
                      onRefresh={async () => {
                        try {
                          const token = localStorage.getItem('token');
                          const headers = { Authorization: `Bearer ${token}` };
                          const catRes = await axios.get('/api/v1/inventory/categories', { headers });
                          setCategories(catRes.data);
                        } catch(e) { console.error('Failed to refresh categories', e); }
                        if (refresh) refresh();
                      }}
                      onCreated={(newCat) => {
                        const catDeptId = newCat.itemDepartmentId?._id || newCat.itemDepartmentId;
                        const foundDept = departments.find(d => d._id === catDeptId);
                        setFormData(prev => ({
                          ...prev,
                          categoryId: newCat._id,
                          department: foundDept ? foundDept.name : prev.department,
                          family: '',
                          subFamily: ''
                        }));
                      }}
                      fields={[{ name: 'name', label: 'Category Name' }, { name: 'code', label: 'Category Code' }]}
                    />
                  </div>

                  {/* 3. Family */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">3. Family</label>
                    <MasterSelect 
                      options={families
                        .filter(f => {
                          if (!formData.categoryId) return true;
                          const catId = f.categoryId?._id || f.categoryId;
                          return !catId || catId === formData.categoryId;
                        })
                        .map(f => ({ value: f.name, label: f.name, original: f }))}
                      value={formData.family}
                      onChange={val => setFormData({...formData, family: val, subFamily: ''})}
                      endpoint="/api/v1/hierarchy/families"
                      title="Family"
                      isDisabled={!formData.categoryId}
                      parent={{
                        label: 'Category',
                        name: 'categoryId',
                        value: formData.categoryId,
                        displayValue: categories.find(c => c._id === formData.categoryId)?.name,
                        options: categories
                          .filter(c => {
                            if (!formData.department) return true;
                            const selDept = departments.find(d => d.name === formData.department);
                            if (!selDept) return true;
                            const dId = c.itemDepartmentId?._id || c.itemDepartmentId;
                            return !dId || dId === selDept._id;
                          })
                          .map(c => ({ value: c._id, label: c.name }))
                      }}
                      extraPayload={{ categoryId: formData.categoryId }}
                      onRefresh={async () => {
                        try {
                          const token = localStorage.getItem('token');
                          const headers = { Authorization: `Bearer ${token}` };
                          const famRes = await axios.get('/api/v1/hierarchy/families', { headers });
                          setFamilies(famRes.data.filter(f => f.isActive !== false));
                        } catch(e) { console.error('Failed to refresh families', e); }
                      }}
                      onCreated={(newFam) => {
                        setFormData(prev => ({
                          ...prev,
                          family: newFam.name,
                          subFamily: ''
                        }));
                      }}
                      fields={[{ name: 'name', label: 'Family Name' }, { name: 'code', label: 'Code' }]}
                    />
                  </div>

                  {/* 4. Sub Family */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">4. Sub Family</label>
                    <MasterSelect 
                      options={subFamilies
                        .filter(sf => {
                          if (!formData.family) return true;
                          const famObj = families.find(f => f.name === formData.family);
                          const famId = famObj?._id;
                          const sfFamId = sf.familyId?._id || sf.familyId;
                          return sf.familyId?.name === formData.family || (famId && sfFamId === famId);
                        })
                        .map(sf => ({ value: sf.name, label: sf.name, original: sf }))}
                      value={formData.subFamily}
                      onChange={val => setFormData({...formData, subFamily: val})}
                      endpoint="/api/v1/hierarchy/subfamilies"
                      title="Sub Family"
                      isDisabled={!formData.family}
                      parent={{
                        label: 'Parent Family',
                        name: 'familyId',
                        value: families.find(f => f.name === formData.family)?._id,
                        displayValue: formData.family,
                        options: families
                          .filter(f => {
                            if (!formData.categoryId) return true;
                            const cId = f.categoryId?._id || f.categoryId;
                            return !cId || cId === formData.categoryId;
                          })
                          .map(f => ({ value: f._id, label: f.name }))
                      }}
                      extraPayload={{ familyId: families.find(f => f.name === formData.family)?._id }}
                      onRefresh={async () => {
                        try {
                          const token = localStorage.getItem('token');
                          const headers = { Authorization: `Bearer ${token}` };
                          const subFamRes = await axios.get('/api/v1/hierarchy/subfamilies', { headers });
                          setSubFamilies(subFamRes.data.filter(sf => sf.isActive !== false));
                        } catch(e) { console.error('Failed to refresh sub families', e); }
                      }}
                      onCreated={(newSubFam) => {
                        setFormData(prev => ({
                          ...prev,
                          subFamily: newSubFam.name
                        }));
                      }}
                      fields={[{ name: 'name', label: 'Sub Family Name' }, { name: 'code', label: 'Code' }]}
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Product Specifications: Item Type, Brand, SKU, Barcode */}
              <div className="pt-2 border-t border-slate-100">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                  Item Identification & Codes
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">Item Type</label>
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
                          if (itemTypesRes.data && Array.isArray(itemTypesRes.data)) {
                            setItemTypes(itemTypesRes.data.filter(it => it.isActive !== false));
                          }
                        } catch(e) { console.error('Failed to refresh item types', e); }
                      }}
                      onCreated={(newType) => {
                        setFormData(prev => ({ ...prev, type: newType.name }));
                      }}
                      fields={[{ name: 'name', label: 'Type Name' }, { name: 'code', label: 'Type Code' }]}
                    />
                  </div>

                  <FormField label="Brand" className="!mb-0">
                    <Input placeholder="e.g. Apple" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className="h-8.5 text-xs" />
                  </FormField>

                  <FormField label="SKU" required className="!mb-0">
                    <Input required placeholder="e.g. IPHONE-18-PRO" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="h-8.5 text-xs font-mono" />
                  </FormField>
                  
                  <FormField label="Barcode (EAN-13)" className="!mb-0">
                    <Input placeholder="e.g. 195949000123" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} className="h-8.5 text-xs font-mono" />
                  </FormField>
                </div>
              </div>

              {/* Row 3: Store & Scope Allocation: Company, Branch */}
              <div className="pt-2 border-t border-slate-100">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                  Company & Branch Store Allocation
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Company Multi-Select Dropdown */}
                  <div className="relative" ref={companyDropdownRef}>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                        <Building size={13} className="text-indigo-600" />
                        Company {selectedCompanyIds.length > 0 && <span className="text-[11px] text-indigo-600 font-bold">({selectedCompanyIds.length})</span>}
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCompanyDropdownOpen(!isCompanyDropdownOpen);
                        setIsBranchDropdownOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 bg-white border border-slate-300 rounded-md shadow-2xs flex items-center justify-between hover:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs transition-colors h-8.5"
                    >
                      <div className="truncate flex-1 pr-2">
                        {selectedCompanyIds.length === 0 ? (
                          <span className="text-slate-400">All Companies (or pick specific)</span>
                        ) : (
                          <span className="text-slate-800 font-medium">
                            {legalCompanies
                              .filter(c => selectedCompanyIds.includes(c._id.toString()))
                              .map(c => c.name)
                              .join(', ')}
                          </span>
                        )}
                      </div>
                      <ChevronDown size={14} className={`text-slate-400 transition-transform ${isCompanyDropdownOpen ? 'transform rotate-180' : ''}`} />
                    </button>

                    {isCompanyDropdownOpen && (
                      <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-2xl p-2 max-h-56 flex flex-col min-w-[240px]">
                        <div className="relative mb-1.5">
                          <Search size={13} className="absolute left-2.5 top-2 text-slate-400" />
                          <input
                            type="text"
                            value={companySearch}
                            onChange={e => setCompanySearch(e.target.value)}
                            placeholder="Search company..."
                            className="w-full pl-7 pr-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-100 px-1 text-[11px] text-slate-500">
                          <button
                            type="button"
                            onClick={() => {
                              const allIds = legalCompanies.map(c => c._id.toString());
                              setSelectedCompanyIds(allIds);
                            }}
                            className="hover:text-indigo-600 font-semibold"
                          >
                            Select All ({legalCompanies.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCompanyIds([]);
                              setSelectedBranchIds([]);
                            }}
                            className="hover:text-rose-600 font-semibold"
                          >
                            Clear
                          </button>
                        </div>
                        <div className="overflow-y-auto space-y-0.5 flex-1 max-h-40">
                          {legalCompanies
                            .filter(c => !companySearch || c.name?.toLowerCase().includes(companySearch.toLowerCase()))
                            .map(comp => {
                              const compId = comp._id.toString();
                              const checked = selectedCompanyIds.includes(compId);
                              return (
                                <div
                                  key={compId}
                                  onClick={() => handleToggleCompany(compId)}
                                  className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs select-none transition-colors ${
                                    checked ? 'bg-indigo-50 text-indigo-900 font-medium' : 'hover:bg-slate-50 text-slate-700'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {}}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 pointer-events-none"
                                  />
                                  <span className="truncate flex-1">{comp.name}</span>
                                  {comp.code && <span className="text-[10px] text-slate-400 uppercase font-mono">{comp.code}</span>}
                                </div>
                              );
                            })}
                          {legalCompanies.length === 0 && (
                            <div className="text-center py-2.5 text-xs text-slate-400">No companies found</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Branch Multi-Select Dropdown */}
                  <div className="relative" ref={branchDropdownRef}>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                        <MapPin size={13} className="text-emerald-600" />
                        Branch {selectedBranchIds.length > 0 && <span className="text-[11px] text-emerald-600 font-bold">({selectedBranchIds.length})</span>}
                      </label>
                      {selectedCompanyIds.length > 0 && (
                        <span className="text-[10px] text-indigo-600 font-semibold">Filtered by company</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsBranchDropdownOpen(!isBranchDropdownOpen);
                        setIsCompanyDropdownOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 bg-white border border-slate-300 rounded-md shadow-2xs flex items-center justify-between hover:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs transition-colors h-8.5"
                    >
                      <div className="truncate flex-1 pr-2">
                        {selectedBranchIds.length === 0 ? (
                          <span className="text-slate-400">All Branches (or pick specific)</span>
                        ) : (
                          <span className="text-slate-800 font-medium">
                            {branches
                              .filter(b => selectedBranchIds.includes(b._id.toString()))
                              .map(b => b.name)
                              .join(', ')}
                          </span>
                        )}
                      </div>
                      <ChevronDown size={14} className={`text-slate-400 transition-transform ${isBranchDropdownOpen ? 'transform rotate-180' : ''}`} />
                    </button>

                    {isBranchDropdownOpen && (
                      <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-2xl p-2 max-h-56 flex flex-col min-w-[240px]">
                        <div className="relative mb-1.5">
                          <Search size={13} className="absolute left-2.5 top-2 text-slate-400" />
                          <input
                            type="text"
                            value={branchSearch}
                            onChange={e => setBranchSearch(e.target.value)}
                            placeholder="Search branch..."
                            className="w-full pl-7 pr-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-100 px-1 text-[11px] text-slate-500">
                          <button
                            type="button"
                            onClick={() => {
                              const allAvailIds = availableBranches.map(b => b._id.toString());
                              setSelectedBranchIds(allAvailIds);
                            }}
                            className="hover:text-emerald-600 font-semibold"
                          >
                            Select All ({availableBranches.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedBranchIds([])}
                            className="hover:text-rose-600 font-semibold"
                          >
                            Clear
                          </button>
                        </div>
                        <div className="overflow-y-auto space-y-0.5 flex-1 max-h-40">
                          {availableBranches
                            .filter(b => !branchSearch || b.name?.toLowerCase().includes(branchSearch.toLowerCase()))
                            .map(br => {
                              const brId = br._id.toString();
                              const checked = selectedBranchIds.includes(brId);
                              const compName = br.legalCompanyId?.name || (legalCompanies.find(c => c._id.toString() === (br.legalCompanyId?._id || br.legalCompanyId)?.toString())?.name);
                              return (
                                <div
                                  key={brId}
                                  onClick={() => handleToggleBranch(brId)}
                                  className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs select-none transition-colors ${
                                    checked ? 'bg-emerald-50 text-emerald-900 font-medium' : 'hover:bg-slate-50 text-slate-700'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {}}
                                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 pointer-events-none"
                                  />
                                  <div className="truncate flex-1">
                                    <div>{br.name}</div>
                                    {compName && <div className="text-[10px] text-slate-400 truncate">{compName}</div>}
                                  </div>
                                  {br.code && <span className="text-[10px] text-slate-400 uppercase font-mono">{br.code}</span>}
                                </div>
                              );
                            })}
                          {availableBranches.length === 0 && (
                            <div className="text-center py-2.5 text-xs text-slate-400">
                              {selectedCompanyIds.length > 0 ? 'No branches found for selected company' : 'No branches found'}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Attributes & Characteristics */}
          <div className="bg-white border border-slate-200 shadow-xs rounded-lg transition-colors">
            <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/75 flex items-center gap-2">
              <Settings size={15} className="text-emerald-500" />
              <h3 className="font-bold text-slate-700 tracking-wider uppercase text-xs">Attributes & Characteristics</h3>
            </div>
            <div className="p-3.5 grid grid-cols-1 md:grid-cols-3 gap-3">
              <FormField label="Long Description" className="!mb-0">
                <Input value={formData.longDescription} onChange={e => setFormData({...formData, longDescription: e.target.value})} className="h-8.5 text-xs" />
              </FormField>
              <FormField label="Description 3" className="!mb-0"><Input value={formData.description3} onChange={e => setFormData({...formData, description3: e.target.value})} className="h-8.5 text-xs" /></FormField>
              
              <FormField label="Description 4" className="!mb-0"><Input value={formData.description4} onChange={e => setFormData({...formData, description4: e.target.value})} className="h-8.5 text-xs" /></FormField>
              <FormField label="Style Code" className="!mb-0"><Input value={formData.styleCode} onChange={e => setFormData({...formData, styleCode: e.target.value})} className="h-8.5 text-xs" /></FormField>
              {!formData.hasVariants ? (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">Color</label>
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
                      onCreated={(newColor) => {
                        setFormData(prev => ({ ...prev, color: newColor.name }));
                      }}
                      fields={[{ name: 'name', label: 'Color Name' }, { name: 'code', label: 'Code' }]}
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">Size</label>
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
                      onCreated={(newSize) => {
                        setFormData(prev => ({ ...prev, size: newSize.name }));
                      }}
                      fields={[{ name: 'name', label: 'Size Name' }, { name: 'code', label: 'Code' }]}
                    />
                  </div>
                </>
              ) : (
                <div className="col-span-1 md:col-span-2 px-3 py-1.5 bg-indigo-50/70 border border-indigo-100 rounded-md flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-indigo-900 block">Color & Size Variations</span>
                    <span className="text-[11px] text-indigo-700">Managed in the Product Variant Matrix above</span>
                  </div>
                  <span className="text-[10px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-full">Matrix Active</span>
                </div>
              )}
              <FormField label="UPC" className="!mb-0"><Input value={formData.upc} onChange={e => setFormData({...formData, upc: e.target.value})} className="h-8.5 text-xs" /></FormField>
              <FormField label="Item Reference" className="!mb-0"><Input value={formData.itemReference} onChange={e => setFormData({...formData, itemReference: e.target.value})} className="h-8.5 text-xs" /></FormField>
              <FormField label="HSN Code" className="!mb-0"><Input value={formData.hsnCode} onChange={e => setFormData({...formData, hsnCode: e.target.value})} className="h-8.5 text-xs" /></FormField>
            </div>
          </div>

          {/* Stock Metrics & UOM */}
          <div className="bg-white border border-slate-200 shadow-xs rounded-lg transition-colors">
            <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/75 flex items-center gap-2">
              <Box size={15} className="text-amber-500" />
              <h3 className="font-bold text-slate-700 tracking-wider uppercase text-xs">Stock Metrics & UOM Protocols</h3>
            </div>
            <div className="p-3.5 grid grid-cols-1 md:grid-cols-3 gap-3">
              <FormField label="Base Unit (Stock UOM)" required className="!mb-0">
                <Select required value={formData.uomDetails.baseUnit} onChange={e => handleUomChange('baseUnit', e.target.value)} className="h-8.5 text-xs">
                  <option value="">Select Base UOM</option>
                  {uoms.map(u => <option key={u.code} value={u.name}>{u.name}</option>)}
                </Select>
              </FormField>
              
              <FormField label="Purchase Unit" className="!mb-0">
                <Select value={formData.uomDetails.purchaseUnit} onChange={e => handleUomChange('purchaseUnit', e.target.value)} className="h-8.5 text-xs">
                  <option value="">Select Purchase UOM</option>
                  {uoms.map(u => <option key={u.code} value={u.name}>{u.name}</option>)}
                </Select>
              </FormField>
              
              <FormField label="Sales Unit" className="!mb-0">
                <Select value={formData.uomDetails.salesUnit} onChange={e => handleUomChange('salesUnit', e.target.value)} className="h-8.5 text-xs">
                  <option value="">Select Sales UOM</option>
                  {uoms.map(u => <option key={u.code} value={u.name}>{u.name}</option>)}
                </Select>
              </FormField>
              
              <FormField label="Stock Management" className="!mb-0">
                <Select value={formData.stockManagement} onChange={e => setFormData({...formData, stockManagement: e.target.value})} className="h-8.5 text-xs">
                  <option value="NONE">None</option>
                  <option value="MANUAL">Manual</option>
                  <option value="AUTOMATIC">Automatic</option>
                  <option value="REORDER_LEVEL">Reorder Level</option>
                  <option value="MANAGED">Managed (Legacy)</option>
                  <option value="UNMANAGED">Unmanaged (Legacy)</option>
                </Select>
              </FormField>

              <FormField label="Min Stock Level" className="!mb-0">
                <Input type="number" min="0" value={formData.minStockLevel} onChange={e => setFormData({...formData, minStockLevel: e.target.value})} className="h-8.5 text-xs" />
              </FormField>
              
              <FormField label="Max Stock Level" className="!mb-0">
                <Input type="number" min="0" value={formData.maxStockLevel} onChange={e => setFormData({...formData, maxStockLevel: e.target.value})} className="h-8.5 text-xs" />
              </FormField>
              
              <FormField label="Weight" className="!mb-0">
                <Input type="number" min="0" step="any" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} className="h-8.5 text-xs" />
              </FormField>

              <FormField label="Weight UOM" className="!mb-0">
                <Select value={formData.weightUom} onChange={e => setFormData({...formData, weightUom: e.target.value})} className="h-8.5 text-xs">
                  <option value="Gram">Gram</option>
                  <option value="Kilogram">Kilogram</option>
                  <option value="Ton">Ton</option>
                  <option value="Pound">Pound</option>
                </Select>
              </FormField>
            </div>
          </div>

          {/* Financials & Trade */}
          <div className="bg-white border border-slate-200 shadow-xs rounded-lg transition-colors">
            <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/75 flex items-center gap-2">
              <DollarSign size={15} className="text-emerald-600" />
              <h3 className="font-bold text-slate-700 tracking-wider uppercase text-xs">Financial & Trade Data</h3>
            </div>
            <div className="p-3.5 grid grid-cols-1 md:grid-cols-3 gap-3">
              <FormField label="Sales Price ($)" required className="!mb-0">
                <Input type="number" required min="0" step="0.01" value={formData.salesPrice} onChange={e => setFormData({...formData, salesPrice: e.target.value})} className="h-8.5 text-xs font-medium" />
              </FormField>
              
              <FormField label="Purchase Price ($)" className="!mb-0">
                <Input type="number" min="0" step="0.01" value={formData.purchasePrice} onChange={e => setFormData({...formData, purchasePrice: e.target.value})} className="h-8.5 text-xs" />
              </FormField>
              
              <FormField label="Landed Cost ($)" className="!mb-0">
                <Input type="number" min="0" step="0.01" value={formData.landedCost} onChange={e => setFormData({...formData, landedCost: e.target.value})} className="h-8.5 text-xs" />
              </FormField>
              
              <FormField label="Costing Method" className="!mb-0">
                <Select value={formData.costingMethod} onChange={e => setFormData({...formData, costingMethod: e.target.value})} className="h-8.5 text-xs">
                  <option value="AVCO">AVCO</option>
                  <option value="FIFO">FIFO</option>
                  <option value="LIFO">LIFO</option>
                  <option value="AVERAGE">Average</option>
                  <option value="STANDARD">Standard</option>
                </Select>
              </FormField>
              
              <FormField label="Tax 1 (Tax Master)" className="!mb-0">
                <Select value={formData.tax1} onChange={e => setFormData({...formData, tax1: e.target.value})} className="h-8.5 text-xs">
                  <option value="">None</option>
                  {taxes.map(tax => <option key={tax._id} value={tax._id}>{tax.name}</option>)}
                </Select>
              </FormField>

              <FormField label="Supplier Name" className="!mb-0">
                <Select value={formData.supplierName} onChange={e => setFormData({...formData, supplierName: e.target.value})} className="h-8.5 text-xs">
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
                </Select>
              </FormField>
              
              <FormField label="Expiry Date" className="!mb-0">
                <Input type="date" value={formData.expiry} onChange={e => setFormData({...formData, expiry: e.target.value})} className="h-8.5 text-xs" />
              </FormField>
              
              <FormField label="Expiry Days/Type" className="!mb-0">
                <Input placeholder="e.g. 30 Days" value={formData.expiryType} onChange={e => setFormData({...formData, expiryType: e.target.value})} className="h-8.5 text-xs" />
              </FormField>
            </div>
          </div>

          {/* Details & Images */}
          <div className="bg-white border border-slate-200 shadow-xs rounded-lg transition-colors">
            <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/75 flex items-center gap-2">
              <ImageIcon size={15} className="text-blue-500" />
              <h3 className="font-bold text-slate-700 tracking-wider uppercase text-xs">Dates, Notes & Imagery</h3>
            </div>
            <div className="p-3.5 grid grid-cols-1 md:grid-cols-3 gap-3">
              <FormField label="Note 1" className="!mb-0"><Input value={formData.note1} onChange={e => setFormData({...formData, note1: e.target.value})} className="h-8.5 text-xs" /></FormField>
              <FormField label="Note 2" className="!mb-0"><Input value={formData.note2} onChange={e => setFormData({...formData, note2: e.target.value})} className="h-8.5 text-xs" /></FormField>
              <FormField label="Note 3" className="!mb-0"><Input value={formData.note3} onChange={e => setFormData({...formData, note3: e.target.value})} className="h-8.5 text-xs" /></FormField>

              <FormField label="Date 1" className="!mb-0"><Input type="date" value={formData.date1} onChange={e => setFormData({...formData, date1: e.target.value})} className="h-8.5 text-xs" /></FormField>
              <FormField label="Date 2" className="!mb-0"><Input type="date" value={formData.date2} onChange={e => setFormData({...formData, date2: e.target.value})} className="h-8.5 text-xs" /></FormField>

              <div className="col-span-1 md:col-span-3 border-t border-slate-100 mt-2 pt-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Product Images</h4>
                
                <div className="mb-3">
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    className="block w-full text-xs text-slate-500
                      file:mr-3 file:py-1.5 file:px-3
                      file:rounded file:border-0
                      file:text-xs file:font-semibold
                      file:bg-indigo-50 file:text-indigo-700
                      hover:file:bg-indigo-100"
                  />
                </div>

                {(existingImages.length > 0 || imagePreviews.length > 0) && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 mb-2">
                    {existingImages.map((img, idx) => (
                      <div key={`exist-${idx}`} className="relative group rounded-md overflow-hidden border border-gray-200 aspect-square bg-gray-100">
                        <img src={img} alt={`Existing ${idx}`} className="w-full h-full object-cover" />
                        <button 
                          type="button" 
                          onClick={() => handleRemoveExistingImage(img)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    {imagePreviews.map((img, idx) => (
                      <div key={`new-${idx}`} className="relative group rounded-md overflow-hidden border-2 border-indigo-200 border-dashed aspect-square bg-indigo-50">
                        <img src={img} alt={`New ${idx}`} className="w-full h-full object-cover" />
                        <button 
                          type="button" 
                          onClick={() => handleRemoveSelectedFile(idx)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="col-span-1 md:col-span-3">
                <FormField label="Item Description Details (Arabic / Additional)" className="!mb-0">
                  <textarea className="w-full flex min-h-[50px] rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500" value={formData.itemDescriptionDetails} onChange={e => setFormData({...formData, itemDescriptionDetails: e.target.value})} />
                </FormField>
              </div>
              
              {isEditing && (
                <>
                  <FormField label="Created Date" className="!mb-0">
                    <Input readOnly disabled value={productToEdit.createdAt ? new Date(productToEdit.createdAt).toLocaleString() : ''} className="bg-gray-100 h-8.5 text-xs" />
                  </FormField>
                  <FormField label="Last Updated" className="!mb-0">
                    <Input readOnly disabled value={productToEdit.updatedAt ? new Date(productToEdit.updatedAt).toLocaleString() : ''} className="bg-gray-100 h-8.5 text-xs" />
                  </FormField>
                </>
              )}
            </div>
          </div>
          
          {isEditing && (
            <Alert className="bg-yellow-50 text-yellow-800 border-yellow-200 text-xs py-2 px-3">
              <strong>Warning:</strong> Modifying Base Unit or conversion factors for an item with existing stock history will cause validation errors to prevent data corruption.
            </Alert>
          )}

          {/* Sticky Floating Footer */}
          <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 py-2.5 px-4 shadow-lg z-30 flex justify-end gap-2.5 mt-2 rounded-b-lg">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex items-center gap-1.5 px-6 py-2 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-500 shadow-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : <><Save size={15} /> Save Product</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProductModal;

