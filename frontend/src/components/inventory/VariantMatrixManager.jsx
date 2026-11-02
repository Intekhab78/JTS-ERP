import React, { useState, useEffect, useMemo } from 'react';
import { 
  Layers, Plus, Trash2, RefreshCw, Wand2, AlertCircle, 
  Tag, DollarSign, Sparkles, ChevronDown, ChevronUp
} from 'lucide-react';

/**
 * Utility to calculate cartesian product of attribute arrays
 */
function cartesianProduct(arrays) {
  return arrays.reduce((acc, curr) => {
    return acc.flatMap(c => curr.map(n => [...c, n]));
  }, [[]]);
}

export const VariantMatrixManager = ({
  hasVariants,
  onHasVariantsChange,
  attributeDefinitions = [],
  onAttributeDefinitionsChange,
  variants = [],
  onVariantsChange,
  parentSku = '',
  parentSalesPrice = 0,
  parentPurchasePrice = 0,
  masterColors = [],
  masterSizes = [],
  _isEditing = false
}) => {
  const [attributeList, setAttributeList] = useState(
    attributeDefinitions && attributeDefinitions.length > 0 
      ? attributeDefinitions 
      : [
          { name: 'Color', values: [] },
          { name: 'Size', values: [] }
        ]
  );

  const [newValueInputs, setNewValueInputs] = useState({});
  const [bulkPriceInput, setBulkPriceInput] = useState('');
  const [showBulkTools, setShowBulkTools] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Sync internal attributeList with parent when attributeDefinitions change from prop
  useEffect(() => {
    if (attributeDefinitions && attributeDefinitions.length > 0) {
      setAttributeList(attributeDefinitions);
    }
  }, [attributeDefinitions]);

  // Handle adding a new attribute category (e.g. 'Material', 'Fit')
  const handleAddAttribute = () => {
    const newName = `Attribute ${attributeList.length + 1}`;
    const updated = [...attributeList, { name: newName, values: [] }];
    setAttributeList(updated);
    onAttributeDefinitionsChange(updated);
  };

  // Handle changing attribute name
  const handleAttributeNameChange = (index, newName) => {
    const updated = [...attributeList];
    updated[index].name = newName;
    setAttributeList(updated);
    onAttributeDefinitionsChange(updated);
  };

  // Handle removing an attribute
  const handleRemoveAttribute = (index) => {
    const updated = attributeList.filter((_, i) => i !== index);
    setAttributeList(updated);
    onAttributeDefinitionsChange(updated);
  };

  // Handle adding an individual value tag to an attribute
  const handleAddValue = (attrIndex, rawVal) => {
    if (!rawVal || typeof rawVal !== 'string') return;
    const val = rawVal.trim();
    if (!val) return;

    const updated = [...attributeList];
    const existingVals = updated[attrIndex].values || [];
    const lowerVals = existingVals.map(v => v.toLowerCase());

    if (!lowerVals.includes(val.toLowerCase())) {
      updated[attrIndex].values = [...existingVals, val];
      setAttributeList(updated);
      onAttributeDefinitionsChange(updated);
    }

    setNewValueInputs(prev => ({ ...prev, [attrIndex]: '' }));
  };

  // Handle removing a value tag
  const handleRemoveValue = (attrIndex, valIndex) => {
    const updated = [...attributeList];
    updated[attrIndex].values = updated[attrIndex].values.filter((_, i) => i !== valIndex);
    setAttributeList(updated);
    onAttributeDefinitionsChange(updated);
  };

  // Calculate potential combinations count
  const potentialCombinationsCount = useMemo(() => {
    const validAttrs = attributeList.filter(a => a.name.trim() && a.values.length > 0);
    if (validAttrs.length === 0) return 0;
    return validAttrs.reduce((total, attr) => total * attr.values.length, 1);
  }, [attributeList]);

  // Generate Matrix Combinations from attribute definitions
  const handleGenerateMatrix = () => {
    setErrorMsg('');
    const validAttrs = attributeList.filter(a => a.name.trim() && a.values.length > 0);
    if (validAttrs.length === 0) {
      setErrorMsg('Please define at least one attribute with values before generating the matrix.');
      return;
    }

    // Build arrays for cartesian product: [[{key: 'Color', val: 'Red'}, ...], [{key: 'Size', val: 'S'}, ...]]
    const arrays = validAttrs.map(attr => 
      attr.values.map(v => ({ name: attr.name.trim(), value: v.trim() }))
    );

    const rawCombinations = cartesianProduct(arrays);

    // Existing variants lookup map by signature to preserve user edits
    const existingMap = new Map();
    variants.forEach(v => {
      // Build a normalized signature for matching
      const entries = v.attributes instanceof Map ? Array.from(v.attributes.entries()) : Object.entries(v.attributes || {});
      const sig = entries
        .map(([k, val]) => `${k.trim().toLowerCase()}:${String(val).trim().toLowerCase()}`)
        .sort()
        .join('|');
      existingMap.set(sig, v);
    });

    const newVariants = rawCombinations.map(combo => {
      const attributesObj = {};
      const sigParts = [];
      const codeParts = [];

      combo.forEach(pair => {
        attributesObj[pair.name] = pair.value;
        sigParts.push(`${pair.name.toLowerCase()}:${pair.value.toLowerCase()}`);
        codeParts.push(pair.value.toUpperCase().replace(/\s+/g, ''));
      });

      const signature = sigParts.sort().join('|');

      // Check if variant already existed
      const existing = existingMap.get(signature);
      if (existing) {
        return {
          ...existing,
          attributes: attributesObj,
          attributeSignature: signature
        };
      }

      // Generate clean default SKU
      const baseSku = parentSku ? parentSku.trim().toUpperCase() : 'ITEM';
      const autoSku = `${baseSku}-${codeParts.join('-')}`;

      return {
        sku: autoSku,
        barcode: '',
        attributes: attributesObj,
        attributeSignature: signature,
        salesPrice: parentSalesPrice ? Number(parentSalesPrice) : null,
        purchasePrice: parentPurchasePrice ? Number(parentPurchasePrice) : null,
        priceAdjustment: 0,
        weight: 0,
        isActive: true
      };
    });

    onVariantsChange(newVariants);
  };

  // Auto-generate SKUs for all variants in the table
  const handleAutoGenerateSkus = () => {
    const baseSku = parentSku ? parentSku.trim().toUpperCase() : 'ITEM';
    const updated = variants.map(v => {
      const entries = v.attributes instanceof Map ? Array.from(v.attributes.entries()) : Object.entries(v.attributes || {});
      const attrCodes = entries.map(([, val]) => String(val).toUpperCase().replace(/\s+/g, ''));
      return {
        ...v,
        sku: `${baseSku}-${attrCodes.join('-')}`
      };
    });
    onVariantsChange(updated);
  };

  // Bulk apply sales price across all variants
  const handleApplyBulkPrice = () => {
    if (!bulkPriceInput || isNaN(Number(bulkPriceInput))) return;
    const priceNum = Number(bulkPriceInput);
    const updated = variants.map(v => ({
      ...v,
      salesPrice: priceNum
    }));
    onVariantsChange(updated);
    setBulkPriceInput('');
  };

  // Inline variant row edit
  const handleVariantRowChange = (index, field, value) => {
    const updated = [...variants];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    onVariantsChange(updated);
  };

  // Remove individual variant combination
  const handleRemoveVariantRow = (index) => {
    const updated = variants.filter((_, i) => i !== index);
    onVariantsChange(updated);
  };

  return (
    <div className="bg-white border border-slate-200 shadow-xs rounded-lg overflow-hidden group hover:border-blue-400 transition-colors">
      {/* Header with Master Toggle */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-md bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <Layers size={15} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 tracking-wide uppercase text-xs flex items-center gap-2">
              Color & Size Matrix Master
              {hasVariants && (
                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
                  {variants.length} Matrix Items
                </span>
              )}
            </h3>
            <p className="text-slate-500 text-[11px] leading-tight">
              {hasVariants ? 'Manage dimensions, generate variant matrix, and assign independent SKUs & prices.' : 'Standard single item. Enable switch to configure Color / Size variations.'}
            </p>
          </div>
        </div>

        <label htmlFor="hasVariantsToggle" className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-slate-200 shadow-xs cursor-pointer hover:border-blue-400 transition-colors select-none">
          <input
            type="checkbox"
            id="hasVariantsToggle"
            checked={hasVariants}
            onChange={(e) => onHasVariantsChange(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
          />
          <span className="text-xs font-bold text-slate-700">
            Enable Variant Matrix
          </span>
        </label>
      </div>

      {!hasVariants ? null : (
        <div className="p-4 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Attribute & Value Definitions */}
          <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/70 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-700 flex items-center gap-2">
                  <Tag size={14} className="text-blue-500" /> 1. Define Attributes & Allowed Values
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Specify variant dimensions (e.g. Color, Size). Values can be selected from master libraries or typed directly.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddAttribute}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Plus size={14} /> Add Dimension
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {attributeList.map((attr, attrIdx) => {
                const isColor = attr.name.toLowerCase().includes('color');
                const isSize = attr.name.toLowerCase().includes('size');

                return (
                  <div key={attrIdx} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-3">
                    <div className="flex justify-between items-center gap-2">
                      <input
                        type="text"
                        value={attr.name}
                        onChange={(e) => handleAttributeNameChange(attrIdx, e.target.value)}
                        className="text-xs font-black uppercase tracking-wider text-slate-800 bg-slate-50 px-2 py-1 rounded border border-slate-200 focus:outline-none focus:border-blue-500"
                        placeholder="Attribute Name (e.g. Color)"
                      />
                      {attributeList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAttribute(attrIdx)}
                          className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors"
                          title="Remove Dimension"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {/* Quick Add Chips from Master Tables */}
                    {isColor && masterColors.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Pick from Master Colors:</span>
                        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                          {masterColors.slice(0, 12).map((c, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleAddValue(attrIdx, c.name)}
                              className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded border border-slate-200 transition-colors"
                            >
                              + {c.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {isSize && masterSizes.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Pick from Master Sizes:</span>
                        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                          {masterSizes.slice(0, 12).map((s, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleAddValue(attrIdx, s.name)}
                              className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded border border-slate-200 transition-colors"
                            >
                              + {s.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Active Values Tags */}
                    <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 bg-slate-50/50 border border-slate-100 rounded-lg items-center">
                      {attr.values.length === 0 ? (
                        <span className="text-[11px] text-slate-400 italic">No values entered yet</span>
                      ) : (
                        attr.values.map((val, valIdx) => (
                          <span
                            key={valIdx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-md shadow-xs"
                          >
                            {val}
                            <button
                              type="button"
                              onClick={() => handleRemoveValue(attrIdx, valIdx)}
                              className="text-slate-400 hover:text-red-500 font-bold ml-0.5"
                            >
                              &times;
                            </button>
                          </span>
                        ))
                      )}
                    </div>

                    {/* Add Custom Value Input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newValueInputs[attrIdx] || ''}
                        onChange={(e) => setNewValueInputs(prev => ({ ...prev, [attrIdx]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddValue(attrIdx, newValueInputs[attrIdx]);
                          }
                        }}
                        placeholder={`Type custom ${attr.name.toLowerCase()} & press enter...`}
                        className="flex-1 text-xs px-2.5 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddValue(attrIdx, newValueInputs[attrIdx])}
                        className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-md hover:bg-slate-700 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Matrix Generation Banner */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-xl shadow-md">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-300 block">
                  Matrix Calculator
                </span>
                <p className="text-sm font-black tracking-wide">
                  {potentialCombinationsCount} Combinations Calculated ({attributeList.map(a => `${a.values.length} ${a.name}`).join(' × ') || '0'})
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateMatrix}
                  disabled={potentialCombinationsCount === 0}
                  className="px-5 py-2.5 bg-blue-500 hover:bg-blue-400 disabled:opacity-40 text-white text-xs font-black uppercase tracking-widest rounded-lg flex items-center gap-2 shadow-lg transition-all"
                >
                  <Wand2 size={15} /> Generate Matrix Grid
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Interactive Matrix Grid */}
          {variants.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-3">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                    <DollarSign size={15} className="text-emerald-500" /> 2. Variant Inventory & Pricing Matrix ({variants.length})
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Review and adjust specific variant SKUs, barcodes, sales prices, and purchase costs.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBulkTools(!showBulkTools)}
                    className="text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    Bulk Tools {showBulkTools ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={handleAutoGenerateSkus}
                    className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw size={13} /> Auto-Regenerate SKUs
                  </button>
                </div>
              </div>

              {/* Collapsible Bulk Edit Drawer */}
              {showBulkTools && (
                <div className="p-4 bg-slate-100/80 border border-slate-200 rounded-xl flex flex-wrap items-center gap-4 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 uppercase">Set All Sales Prices:</span>
                    <input
                      type="number"
                      value={bulkPriceInput}
                      onChange={(e) => setBulkPriceInput(e.target.value)}
                      placeholder="e.g. 99.00"
                      className="w-28 text-xs px-2 py-1.5 border border-slate-300 rounded bg-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleApplyBulkPrice}
                      className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-500"
                    >
                      Apply
                    </button>
                  </div>
                  <span className="text-xs text-slate-400">|</span>
                  <div className="text-xs text-slate-500">
                    Parent Sales Price: <strong className="text-slate-700">${parentSalesPrice || 0}</strong> • Purchase: <strong className="text-slate-700">${parentPurchasePrice || 0}</strong>
                  </div>
                </div>
              )}

              {/* Data Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto max-h-[420px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-[#0a0f1c] text-slate-300 uppercase font-black tracking-wider text-[11px] sticky top-0 z-10">
                      <tr>
                        <th className="py-3 px-3 w-10 text-center">#</th>
                        <th className="py-3 px-3">Combination</th>
                        <th className="py-3 px-3">Variant SKU *</th>
                        <th className="py-3 px-3">Barcode</th>
                        <th className="py-3 px-3 w-28">Sales Price</th>
                        <th className="py-3 px-3 w-28">Purchase Price</th>
                        <th className="py-3 px-3 w-20 text-center">Status</th>
                        <th className="py-3 px-3 w-12 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {variants.map((v, idx) => {
                        const attrEntries = v.attributes instanceof Map 
                          ? Array.from(v.attributes.entries()) 
                          : Object.entries(v.attributes || {});

                        return (
                          <tr key={idx} className={`hover:bg-slate-50/80 transition-colors ${!v.isActive ? 'opacity-50 bg-slate-50' : ''}`}>
                            <td className="py-2.5 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                            
                            {/* Combination Badges */}
                            <td className="py-2.5 px-3">
                              <div className="flex flex-wrap gap-1">
                                {attrEntries.map(([k, val], i) => (
                                  <span key={i} className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px] font-bold border border-slate-200">
                                    <span className="text-slate-400 text-[9px] uppercase mr-1">{k}:</span> {val}
                                  </span>
                                ))}
                              </div>
                            </td>

                            {/* SKU Input */}
                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                required
                                value={v.sku}
                                onChange={(e) => handleVariantRowChange(idx, 'sku', e.target.value.toUpperCase())}
                                className="w-full font-mono text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:border-blue-500 focus:outline-none uppercase font-bold"
                                placeholder="SKU-REQUIRED"
                              />
                            </td>

                            {/* Barcode Input */}
                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                value={v.barcode || ''}
                                onChange={(e) => handleVariantRowChange(idx, 'barcode', e.target.value)}
                                className="w-full font-mono text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:border-blue-500 focus:outline-none"
                                placeholder="Barcode (Optional)"
                              />
                            </td>

                            {/* Sales Price */}
                            <td className="py-2.5 px-3">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={v.salesPrice !== null && v.salesPrice !== undefined ? v.salesPrice : ''}
                                onChange={(e) => handleVariantRowChange(idx, 'salesPrice', e.target.value === '' ? null : Number(e.target.value))}
                                className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:border-blue-500 focus:outline-none font-semibold text-slate-800"
                                placeholder={`$${parentSalesPrice || 0}`}
                              />
                            </td>

                            {/* Purchase Price */}
                            <td className="py-2.5 px-3">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={v.purchasePrice !== null && v.purchasePrice !== undefined ? v.purchasePrice : ''}
                                onChange={(e) => handleVariantRowChange(idx, 'purchasePrice', e.target.value === '' ? null : Number(e.target.value))}
                                className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:border-blue-500 focus:outline-none text-slate-600"
                                placeholder={`$${parentPurchasePrice || 0}`}
                              />
                            </td>

                            {/* Active Toggle */}
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={v.isActive !== false}
                                onChange={(e) => handleVariantRowChange(idx, 'isActive', e.target.checked)}
                                className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                                title={v.isActive ? 'Active Variant' : 'Inactive Variant'}
                              />
                            </td>

                            {/* Delete Row */}
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveVariantRow(idx)}
                                className="text-slate-300 hover:text-red-500 p-1 transition-colors"
                                title="Remove combination"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
