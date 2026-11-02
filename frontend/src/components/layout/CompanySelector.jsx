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
          } else if (activeCompanyId && activeCompanyId !== 'ALL' && !res.data.some(c => c._id === activeCompanyId)) {
             // Stale ID from prior database/session does not exist in accessible companies
             localStorage.setItem('active_company_id', 'ALL');
             setActiveCompanyId('ALL');
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
          className="flex items-center gap-2 h-9 px-2.5 bg-card/60 hover:bg-muted/80 border border-border/60 hover:border-border rounded-xl text-xs font-bold tracking-tight text-foreground transition-all duration-200 shadow-2xs hover:shadow-xs cursor-pointer group select-none"
          title="Select Legal Company context"
        >
          <div className="w-5 h-5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Building size={12} />
          </div>
          <span className="max-w-[140px] truncate">
            {displayLabel}
          </span>
          <ChevronDown size={13} className="text-muted-foreground/70 group-hover:text-foreground transition-colors shrink-0" />
        </button>
      }
    />
  );
};
