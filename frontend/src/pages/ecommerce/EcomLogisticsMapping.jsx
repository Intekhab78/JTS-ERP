import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Truck, Plus, Edit2, Trash2, ExternalLink, Globe, Phone, 
  Mail, CheckCircle2, AlertCircle, Copy, Check
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/common/Modal';
import { FormField } from '../../components/common/FormField';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/common/EmptyState';

const POPULAR_CARRIER_PRESETS = [
  {
    name: 'Blue Dart Express',
    code: 'BLUEDART',
    url: 'https://www.bluedart.com/tracking?pin={{trackingNumber}}',
    phone: '1860 233 1234',
    website: 'https://www.bluedart.com'
  },
  {
    name: 'Delhivery',
    code: 'DELHIVERY',
    url: 'https://www.delhivery.com/track/package/{{trackingNumber}}',
    phone: '0124 671 9500',
    website: 'https://www.delhivery.com'
  },
  {
    name: 'DTDC Express',
    code: 'DTDC',
    url: 'https://www.dtdc.in/tracking/shipment-tracking.asp?strTrackingNo={{trackingNumber}}',
    phone: '080 2536 5032',
    website: 'https://www.dtdc.in'
  },
  {
    name: 'FedEx Express',
    code: 'FEDEX',
    url: 'https://www.fedex.com/fedextrack/?trknbr={{trackingNumber}}',
    phone: '1800 209 6161',
    website: 'https://www.fedex.com'
  },
  {
    name: 'DHL Express',
    code: 'DHL',
    url: 'https://www.dhl.com/en/express/tracking.html?AWB={{trackingNumber}}',
    phone: '1800 111 345',
    website: 'https://www.dhl.com'
  }
];

const EcomLogisticsMapping = () => {
  const [carriers, setCarriers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [testAwb, setTestAwb] = useState('1234567890');
  const [copiedId, setCopiedId] = useState(null);

  const [formData, setFormData] = useState({
    carrierName: '',
    carrierCode: '',
    trackingUrlTemplate: '',
    contactPhone: '',
    contactEmail: '',
    websiteUrl: '',
    notes: '',
    isDefault: false,
    isActive: true
  });

  useEffect(() => {
    fetchCarriers();
  }, []);

  const fetchCarriers = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get('/api/v1/ecommerce-admin/logistics', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCarriers(data || []);
    } catch (error) {
      console.error('Failed to fetch logistics partners:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      carrierName: '',
      carrierCode: '',
      trackingUrlTemplate: '',
      contactPhone: '',
      contactEmail: '',
      websiteUrl: '',
      notes: '',
      isDefault: carriers.length === 0,
      isActive: true
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (carrier) => {
    setEditingId(carrier._id);
    setFormData({
      carrierName: carrier.carrierName,
      carrierCode: carrier.carrierCode,
      trackingUrlTemplate: carrier.trackingUrlTemplate,
      contactPhone: carrier.contactPhone || '',
      contactEmail: carrier.contactEmail || '',
      websiteUrl: carrier.websiteUrl || '',
      notes: carrier.notes || '',
      isDefault: Boolean(carrier.isDefault),
      isActive: carrier.isActive !== false
    });
    setModalOpen(true);
  };

  const applyPreset = (preset) => {
    setFormData({
      ...formData,
      carrierName: preset.name,
      carrierCode: preset.code,
      trackingUrlTemplate: preset.url,
      contactPhone: preset.phone,
      websiteUrl: preset.website
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.trackingUrlTemplate.includes('{{trackingNumber}}')) {
      alert('The tracking URL template must contain the placeholder {{trackingNumber}}');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      if (editingId) {
        await axios.put(`/api/v1/ecommerce-admin/logistics/${editingId}`, formData, { headers });
      } else {
        await axios.post('/api/v1/ecommerce-admin/logistics', formData, { headers });
      }

      setModalOpen(false);
      fetchCarriers();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save carrier');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this logistics carrier?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/v1/ecommerce-admin/logistics/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchCarriers();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete carrier');
    }
  };

  const copyTemplate = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader 
          title="Logistics & Courier Mapping"
          description="Map third-party courier services and define dynamic tracking URL templates for customer orders."
          icon={<Truck className="text-blue-600 h-8 w-8" />}
        />

        <Button 
          variant="primary" 
          onClick={handleOpenCreate}
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold"
        >
          <Plus size={16} /> Add Carrier Partner
        </Button>
      </div>

      {/* URL Tester Card */}
      <Card className="p-4 bg-muted/20 border-dashed border-2">
        <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Interactive Tracking Link Tester</span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enter any sample tracking number to verify how tracking URLs will be generated in customer notification emails.
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-72">
            <Input 
              placeholder="Sample AWB / Waybill..."
              value={testAwb}
              onChange={e => setTestAwb(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>
      </Card>

      {/* Carriers Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground font-medium animate-pulse">Loading logistics carriers...</div>
        ) : carriers.length === 0 ? (
          <EmptyState 
            icon={<Truck className="h-10 w-10 text-muted-foreground" />}
            title="No courier carriers configured"
            description="Add your first logistics carrier partner to enable order tracking."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-muted-foreground uppercase font-bold text-[11px] tracking-wider">
                  <th className="p-4">Carrier Name & Code</th>
                  <th className="p-4">Tracking URL Template</th>
                  <th className="p-4">Sample Test Link</th>
                  <th className="p-4">Contact Info</th>
                  <th className="p-4 text-center">Default</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {carriers.map(c => {
                  const sampleUrl = c.trackingUrlTemplate.replace(/\{\{trackingNumber\}\}/g, testAwb || '1234567890');

                  return (
                    <tr key={c._id} className="hover:bg-muted/20 transition-colors">
                      {/* Name & Code */}
                      <td className="p-4">
                        <div className="font-extrabold text-foreground text-sm flex items-center gap-1.5">
                          <Truck size={15} className="text-blue-600" />
                          {c.carrierName}
                        </div>
                        <div className="font-mono text-[11px] text-muted-foreground">{c.carrierCode}</div>
                      </td>

                      {/* URL Template */}
                      <td className="p-4 max-w-xs">
                        <div className="font-mono text-[11px] text-muted-foreground truncate bg-muted/60 px-2 py-1 rounded border border-border">
                          {c.trackingUrlTemplate}
                        </div>
                      </td>

                      {/* Live Generated Test Link */}
                      <td className="p-4 max-w-xs">
                        <a 
                          href={sampleUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-bold hover:underline truncate"
                        >
                          <ExternalLink size={12} className="shrink-0" />
                          <span className="truncate">{sampleUrl}</span>
                        </a>
                      </td>

                      {/* Contact */}
                      <td className="p-4 text-muted-foreground">
                        {c.contactPhone && (
                          <div className="flex items-center gap-1">
                            <Phone size={11} className="text-blue-500" /> {c.contactPhone}
                          </div>
                        )}
                        {c.websiteUrl && (
                          <div className="flex items-center gap-1">
                            <Globe size={11} className="text-blue-500" /> 
                            <a href={c.websiteUrl} target="_blank" rel="noreferrer" className="hover:underline">{c.websiteUrl}</a>
                          </div>
                        )}
                      </td>

                      {/* Default Badge */}
                      <td className="p-4 text-center">
                        {c.isDefault ? (
                          <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold px-2 py-0.5 rounded text-[10px]">
                            Default
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleOpenEdit(c)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 size={14} className="text-blue-600" />
                        </Button>

                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDelete(c._id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* CREATE / EDIT CARRIER MODAL */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Logistics Carrier' : 'Add Logistics Carrier'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick Preset Selector */}
          {!editingId && (
            <div className="p-3 bg-muted/40 rounded-lg border border-border">
              <span className="text-xs font-bold text-muted-foreground block mb-2">Quickly Load Carrier Preset:</span>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_CARRIER_PRESETS.map(preset => (
                  <button
                    key={preset.code}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="px-2.5 py-1 text-xs bg-card hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 border border-border rounded font-semibold transition-all"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Carrier Name" required>
              <Input 
                placeholder="e.g. Blue Dart Express"
                value={formData.carrierName}
                onChange={e => setFormData({ ...formData, carrierName: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Carrier Code" required>
              <Input 
                placeholder="e.g. BLUEDART"
                value={formData.carrierCode}
                onChange={e => setFormData({ ...formData, carrierCode: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                required
              />
            </FormField>
          </div>

          <FormField 
            label="Tracking URL Template" 
            required
            helper="Use {{trackingNumber}} where the actual AWB / tracking code should be injected."
          >
            <Input 
              placeholder="e.g. https://www.delhivery.com/track/package/{{trackingNumber}}"
              value={formData.trackingUrlTemplate}
              onChange={e => setFormData({ ...formData, trackingUrlTemplate: e.target.value })}
              required
              className="font-mono text-xs"
            />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Customer Support Phone">
              <Input 
                placeholder="e.g. 1800 233 1234"
                value={formData.contactPhone}
                onChange={e => setFormData({ ...formData, contactPhone: e.target.value })}
              />
            </FormField>

            <FormField label="Official Website URL">
              <Input 
                placeholder="e.g. https://www.carrier.com"
                value={formData.websiteUrl}
                onChange={e => setFormData({ ...formData, websiteUrl: e.target.value })}
              />
            </FormField>
          </div>

          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded border border-border">
            <input 
              type="checkbox"
              id="isDefaultCarrier"
              checked={formData.isDefault}
              onChange={e => setFormData({ ...formData, isDefault: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isDefaultCarrier" className="text-xs font-semibold cursor-pointer">
              Set as default carrier partner for web order fulfillment
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
              {editingId ? 'Update Carrier' : 'Save Carrier'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default EcomLogisticsMapping;
