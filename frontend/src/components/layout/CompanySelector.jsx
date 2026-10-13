import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Building, ChevronDown, Check } from 'lucide-react';
import { DropdownMenu } from '../common/DropdownMenu';

export const CompanySelector = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  const [companies, setCompanies] = useState([]);
  const [activeCompanyId, setActiveCompanyId] = useState(
    localStorage.getItem('active_company_id') || 'ALL'
  );

  useEffect(() => {
    // Only fetch if it's a normal user OR if it's a Global Admin who has already selected a workspace
    const isGlobalAdmin = !user.tenantId;
    const hasWorkspace = !!localStorage.getItem('active_workspace_id');
    
    if (isGlobalAdmin && !hasWorkspace) {
      return; // Wait for workspace selection first
    }

    axios.get('/api/v1/legal-company/my-companies')
      .then(res => {
        if (Array.isArray(res.data)) {
          setCompanies(res.data);
          
          // Auto-select if there is exactly one company available
          if (res.data.length === 1) {
             const singleId = res.data[0]._id;
             if (activeCompanyId !== singleId) {
                 localStorage.setItem('active_company_id', singleId);
                 setActiveCompanyId(singleId);
                 window.location.reload();
             }
          }
        }
      })
      .catch(err => {
        console.error('Failed to fetch legal companies:', err);
      });
  }, [user.tenantId]);

  // Hide selector if user only has 1 or 0 companies accessible
  if (companies.length <= 1) {
    return null; 
  }

  const handleSelectCompany = (companyId) => {
    localStorage.setItem('active_company_id', companyId);
    setActiveCompanyId(companyId);
    
    // Reload the page to reset states and refetch data with new x-company-id context
    window.location.reload();
  };

  const activeCompany = companies.find(c => c._id === activeCompanyId);
  const displayLabel = activeCompany ? activeCompany.name : 'All Companies';

  const dropdownItems = [
    {
      label: (
        <div className="flex items-center justify-between w-full">
          <span className="font-semibold text-primary">All Companies</span>
          {activeCompanyId === 'ALL' && <Check size={16} className="text-primary ml-2" />}
        </div>
      ),
      onClick: () => handleSelectCompany('ALL')
    },
    { type: 'divider' },
    ...companies.map(c => ({
      label: (
        <div className="flex items-center justify-between w-full pl-2">
          <span>{c.name}</span>
          {c._id === activeCompanyId && <Check size={16} className="text-primary ml-2" />}
        </div>
      ),
      onClick: () => handleSelectCompany(c._id)
    }))
  ];

  return (
    <DropdownMenu
      items={dropdownItems}
      trigger={
        <button 
          className="flex items-center gap-2 px-3 py-1.5 bg-card hover:bg-muted border border-border rounded-lg text-sm font-medium transition-colors"
          title="Select Legal Company context"
        >
          <Building size={16} className="text-primary" />
          <span className="max-w-[150px] truncate">
            {displayLabel}
          </span>
          <ChevronDown size={14} className="text-muted-foreground opacity-70" />
        </button>
      }
    />
  );
};
