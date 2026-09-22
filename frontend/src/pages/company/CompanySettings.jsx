import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Building2, MapPin, ShieldAlert } from 'lucide-react';
import BranchManagement from '../../components/company/BranchManagement';
import { COUNTRIES } from '../../config/countries';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { FormField } from '../../components/common/FormField';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import TenantManagement from './TenantManagement';

const CompanySettings = () => {
  const [company, setCompany] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  useEffect(() => {
    fetchCompanyProfile();
  }, []);

  const fetchCompanyProfile = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/v1/company', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCompany(res.data);
    } catch (error) {
      console.error('Failed to fetch company', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put('http://localhost:5000/api/v1/company', company, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Trigger a global currency update so CurrencyContext fetches the new setting
      window.dispatchEvent(new Event('currencyUpdated'));
      alert('Company profile updated successfully!');
    } catch (error) {
      console.error('Failed to update company', error);
      alert('Failed to update company profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <PageSkeleton />;

  if (company?.isPlatform) {
    return <TenantManagement />;
  }

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6 max-w-5xl">
      <PageHeader 
        title="Company Settings"
        description="Manage your enterprise's core profile, tax details, and headquarters address."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 size={20} className="text-primary" /> Core Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FormField label="Company Name" required>
                <Input 
                  required
                  value={company?.name || ''} 
                  onChange={e => setCompany({...company, name: e.target.value})}
                />
              </FormField>
              
              <FormField label="Tax ID / EIN">
                <Input 
                  value={company?.taxId || ''} 
                  onChange={e => setCompany({...company, taxId: e.target.value})}
                />
              </FormField>
              
              <FormField label="Default Currency">
                <Select
                  value={company?.currency || 'USD'} 
                  onChange={e => setCompany({...company, currency: e.target.value})}
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="AED">AED</option>
                  <option value="INR">INR (₹)</option>
                  <option value="CAD">CAD (C$)</option>
                  <option value="AUD">AUD (A$)</option>
                </Select>
              </FormField>

              <FormField label="POS Cash Variance Limit (AED)">
                <Input 
                  type="number"
                  min="0"
                  step="0.01"
                  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  value={company?.settings?.posVarianceLimit === 0 ? '' : (company?.settings?.posVarianceLimit || '')}
                  onChange={e => setCompany({...company, settings: {...company.settings, posVarianceLimit: e.target.value === '' ? 0 : (parseFloat(e.target.value) || 0)}})}
                  placeholder="0.00"
                />
              </FormField>
            </div>

            {/* POS Session Cashier Policy */}
            <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800 mb-1">POS Session Cashier Policy</p>
                  <p className="text-xs text-slate-500 mb-4">Controls who can operate an active POS session on a register.</p>
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="radio"
                        name="posCashierPolicy"
                        value="SINGLE_CASHIER"
                        checked={(company?.settings?.posCashierPolicy || 'SINGLE_CASHIER') === 'SINGLE_CASHIER'}
                        onChange={() => setCompany({ ...company, settings: { ...company.settings, posCashierPolicy: 'SINGLE_CASHIER' } })}
                        className="mt-0.5 accent-primary"
                      />
                      <div>
                        <span className="text-sm font-medium text-slate-800">Single Cashier</span>
                        <p className="text-xs text-slate-500 mt-0.5">Only the designated session opener can operate and close the session. Other cashiers must open their own session on a different register.</p>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="radio"
                        name="posCashierPolicy"
                        value="MULTIPLE_CASHIERS"
                        checked={company?.settings?.posCashierPolicy === 'MULTIPLE_CASHIERS'}
                        onChange={() => setCompany({ ...company, settings: { ...company.settings, posCashierPolicy: 'MULTIPLE_CASHIERS' } })}
                        className="mt-0.5 accent-primary"
                      />
                      <div>
                        <span className="text-sm font-medium text-slate-800">Multiple Cashiers</span>
                        <p className="text-xs text-slate-500 mt-0.5">Multiple authorized cashiers can operate the same active POS session. Every transaction is still attributed to the actual cashier who performed it. Only the session opener (or manager/admin) can close the session.</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin size={20} className="text-primary" /> Headquarters Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="md:col-span-2 lg:col-span-4">
                <FormField label="Street Address">
                  <Input 
                    value={company?.address?.street || ''} 
                    onChange={e => setCompany({...company, address: {...company.address, street: e.target.value}})}
                  />
                </FormField>
              </div>
              
              <FormField label="City">
                <Input 
                  value={company?.address?.city || ''} 
                  onChange={e => setCompany({...company, address: {...company.address, city: e.target.value}})}
                />
              </FormField>
              
              <FormField label="State / Province">
                <Input 
                  value={company?.address?.state || ''} 
                  onChange={e => setCompany({...company, address: {...company.address, state: e.target.value}})}
                />
              </FormField>
              
              <FormField label="Zip Code">
                <Input 
                  value={company?.address?.zipCode || ''} 
                  onChange={e => setCompany({...company, address: {...company.address, zipCode: e.target.value}})}
                />
              </FormField>
              
              <FormField label="Country">
                <Select
                  value={company?.address?.country || ''}
                  onChange={(e) => {
                    const selectedCountry = COUNTRIES.find(c => c.name === e.target.value);
                    setCompany({
                      ...company, 
                      address: { ...company.address, country: e.target.value },
                      currency: selectedCountry ? selectedCountry.currency : company.currency
                    });
                  }}
                >
                  <option value="">Select a country...</option>
                  {COUNTRIES.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </Select>
              </FormField>
            </div>
            
            <div className="flex justify-end pt-6 mt-6 border-t">
              {hasPermission('EDIT_COMPANY') && (
                <Button type="submit" isLoading={isSaving} leftIcon={<Save size={18} />}>
                  Save Settings
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldAlert size={20} className="text-primary" /> Supplier Compliance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50/50">
            <div>
              <p className="font-semibold text-sm">Trade License Expiry Check</p>
              <p className="text-sm text-muted-foreground mt-1">When enabled, Purchase Orders cannot be created or confirmed for suppliers with an expired or missing Trade License expiry date.</p>
            </div>
            <div className="ml-6 flex items-center">
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={company?.settings?.ENABLE_TRADE_LICENSE_EXPIRY_CHECK || false}
                  onChange={(e) => {
                    const newSettings = { ...company.settings, ENABLE_TRADE_LICENSE_EXPIRY_CHECK: e.target.checked };
                    setCompany({ ...company, settings: newSettings });
                  }}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
          <div className="flex justify-end pt-4">
            {hasPermission('EDIT_COMPANY') && (
              <Button type="button" onClick={handleSubmit} isLoading={isSaving} leftIcon={<Save size={18} />}>
                Save Compliance Setting
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <BranchManagement />
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanySettings;
