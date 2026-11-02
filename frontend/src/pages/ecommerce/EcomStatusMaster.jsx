import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Tag, Plus, Edit2, Trash2, Mail, MailX, CheckCircle, 
  AlertCircle, ShieldAlert, ArrowUpDown, Info
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/common/Modal';
import { FormField } from '../../components/common/FormField';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/common/EmptyState';

const COLOR_PRESETS = [
  { name: 'Blue', hex: '#2563eb' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Amber', hex: '#d97706' },
  { name: 'Purple', hex: '#7c3aed' },
  { name: 'Sky', hex: '#0284c7' },
  { name: 'Teal', hex: '#0d9488' },
  { name: 'Green', hex: '#16a34a' },
  { name: 'Red', hex: '#dc2626' },
  { name: 'Orange', hex: '#ea580c' },
  { name: 'Slate', hex: '#475569' }
];

const EcomStatusMaster = () => {
  const [statuses, setStatuses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    color: '#2563eb',
    order: 0,
    sendEmailToCustomer: false,
    emailSubject: 'Order #{{orderId}} status update',
    emailTemplate: 'Your order status has been updated to {{statusName}}.'
  });

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  useEffect(() => {
    fetchStatuses();
  }, []);

  const fetchStatuses = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get('/api/v1/ecommerce-admin/statuses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatuses(data || []);
    } catch (error) {
      console.error('Failed to fetch ecom statuses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      name: '',
      code: '',
      color: '#2563eb',
      order: statuses.length + 1,
      sendEmailToCustomer: false,
      emailSubject: 'Order #{{orderId}} status update',
      emailTemplate: 'Your order status has been updated to {{statusName}}.'
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (status) => {
    setEditingId(status._id);
    setFormData({
      name: status.name,
      code: status.code,
      color: status.color || '#2563eb',
      order: status.order || 0,
      sendEmailToCustomer: Boolean(status.sendEmailToCustomer),
      emailSubject: status.emailSubject || 'Order #{{orderId}} status update',
      emailTemplate: status.emailTemplate || 'Your order status has been updated.'
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      if (editingId) {
        await axios.put(`/api/v1/ecommerce-admin/statuses/${editingId}`, formData, { headers });
      } else {
        await axios.post('/api/v1/ecommerce-admin/statuses', formData, { headers });
      }

      setModalOpen(false);
      fetchStatuses();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save order status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this custom order status?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/v1/ecommerce-admin/statuses/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchStatuses();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete status');
    }
  };

  // Quick toggle email option directly from row
  const handleToggleEmail = async (status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/v1/ecommerce-admin/statuses/${status._id}`, {
        sendEmailToCustomer: !status.sendEmailToCustomer
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchStatuses();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to toggle email option');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader 
          title="E-Commerce Status Master"
          description="Manage order lifecycle stages. Enable or disable automated customer email notifications for each status."
          icon={<Tag className="text-blue-600 h-8 w-8" />}
        />

        <Button 
          variant="primary" 
          onClick={handleOpenCreate}
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold"
        >
          <Plus size={16} /> Add Order Status
        </Button>
      </div>

      {/* Explanatory Banner */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl flex items-start gap-3">
        <Info size={20} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 dark:text-blue-300 space-y-1">
          <strong className="font-bold text-sm block">Email Notification Logic:</strong>
          <p>
            When an order status has <strong>"Send Email" checked</strong>, the system automatically emails the customer whenever an order is moved into that status.
          </p>
          <p>
            For <strong>Internal Processing</strong> stages (e.g. inventory allocation, bin picking, quality check), <strong>de-select the email option</strong> so internal warehouse steps remain completely invisible to the customer.
          </p>
        </div>
      </div>

      {/* Statuses Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground font-medium animate-pulse">Loading statuses...</div>
        ) : statuses.length === 0 ? (
          <EmptyState 
            icon={<Tag className="h-10 w-10 text-muted-foreground" />}
            title="No statuses found"
            description="Initialize default statuses or create your first order status."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-muted-foreground uppercase font-bold text-[11px] tracking-wider">
                  <th className="p-4 w-16 text-center">Order</th>
                  <th className="p-4">Status Name & Code</th>
                  <th className="p-4">Badge Preview</th>
                  <th className="p-4 text-center">Customer Email</th>
                  <th className="p-4">Email Subject Line</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {statuses.map((status) => (
                  <tr key={status._id} className="hover:bg-muted/20 transition-colors">
                    {/* Order Sequence */}
                    <td className="p-4 text-center font-bold text-muted-foreground">
                      {status.order}
                    </td>

                    {/* Name & Code */}
                    <td className="p-4">
                      <div className="font-extrabold text-foreground text-sm">{status.name}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{status.code}</div>
                    </td>

                    {/* Badge Preview */}
                    <td className="p-4">
                      <span 
                        className="px-3 py-1 rounded-full text-xs font-black uppercase text-white shadow-sm inline-block"
                        style={{ backgroundColor: status.color || '#3b82f6' }}
                      >
                        {status.name}
                      </span>
                    </td>

                    {/* Send Email To Customer Toggle */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleToggleEmail(status)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer ${
                          status.sendEmailToCustomer
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-200 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 hover:bg-amber-200 border border-amber-300'
                        }`}
                        title="Click to toggle email notification"
                      >
                        {status.sendEmailToCustomer ? (
                          <>
                            <Mail size={12} />
                            <span>Yes (Emails Customer)</span>
                          </>
                        ) : (
                          <>
                            <MailX size={12} />
                            <span>No (Internal Only)</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Email Subject Template */}
                    <td className="p-4 max-w-xs truncate text-muted-foreground">
                      {status.sendEmailToCustomer ? (
                        <span className="font-medium text-foreground">{status.emailSubject || 'N/A'}</span>
                      ) : (
                        <span className="italic text-muted-foreground text-[11px]">Email suppressed</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleOpenEdit(status)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 size={14} className="text-blue-600" />
                      </Button>

                      {!status.isSystem && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDelete(status._id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* CREATE / EDIT MODAL */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Order Status' : 'Create New Order Status'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Status Name" required>
              <Input 
                placeholder="e.g. Processing, Picked, Dispatched"
                value={formData.name}
                onChange={e => {
                  const val = e.target.value;
                  setFormData({
                    ...formData,
                    name: val,
                    code: editingId ? formData.code : val.toUpperCase().replace(/\s+/g, '_')
                  });
                }}
                required
              />
            </FormField>

            <FormField label="Status Code" required>
              <Input 
                placeholder="e.g. PROCESSING_STAGE"
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Sequence Display Order">
              <Input 
                type="number"
                min="0"
                value={formData.order}
                onChange={e => setFormData({ ...formData, order: Number(e.target.value) })}
              />
            </FormField>

            <FormField label="Badge Color">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input 
                    type="color"
                    value={formData.color}
                    onChange={e => setFormData({ ...formData, color: e.target.value })}
                    className="h-9 w-12 rounded cursor-pointer border border-border"
                  />
                  <Input 
                    value={formData.color}
                    onChange={e => setFormData({ ...formData, color: e.target.value })}
                    className="font-mono"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {COLOR_PRESETS.map(preset => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: preset.hex })}
                      className="h-5 w-5 rounded-full border border-border transition-transform hover:scale-110"
                      style={{ backgroundColor: preset.hex }}
                      title={preset.name}
                    />
                  ))}
                </div>
              </div>
            </FormField>
          </div>

          {/* Key Requirement: Send Email to Customer toggle checkbox */}
          <div className="p-4 bg-muted/40 rounded-xl border border-border space-y-2">
            <div className="flex items-center gap-3">
              <input 
                type="checkbox"
                id="sendEmailCheckbox"
                checked={formData.sendEmailToCustomer}
                onChange={e => setFormData({ ...formData, sendEmailToCustomer: e.target.checked })}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="sendEmailCheckbox" className="font-bold text-sm cursor-pointer text-foreground">
                Send Email Notification to Customer
              </label>
            </div>
            <p className="text-xs text-muted-foreground pl-8">
              Check this option if the customer should receive an email when their order transitions to this status. 
              Leave unchecked for internal fulfillment stages (e.g. stock allocation, packing, picking) to prevent unnecessary customer emails.
            </p>
          </div>

          {/* Conditional Email Subject & Template */}
          {formData.sendEmailToCustomer && (
            <div className="space-y-4 pt-2 border-t border-border">
              <FormField label="Email Subject Template">
                <Input 
                  placeholder="e.g. Your Order #{{orderId}} is In Transit!"
                  value={formData.emailSubject}
                  onChange={e => setFormData({ ...formData, emailSubject: e.target.value })}
                />
              </FormField>

              <FormField label="Email Body Message">
                <Input 
                  placeholder="e.g. Your order has been packed and handed over to our carrier."
                  value={formData.emailTemplate}
                  onChange={e => setFormData({ ...formData, emailTemplate: e.target.value })}
                />
              </FormField>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
              {editingId ? 'Update Status' : 'Create Status'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default EcomStatusMaster;
