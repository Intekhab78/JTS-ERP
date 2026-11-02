import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { DropdownMenu } from '../common/DropdownMenu';

export const WorkspaceSelector = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Only Global Superadmins (no tenantId) should see the workspace selector
  const isGlobalAdmin = !user.tenantId;

  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(
    localStorage.getItem('active_workspace_id') || ''
  );

  useEffect(() => {
    if (isGlobalAdmin) {
      // Fetch all companies/workspaces for Global Admin
      axios.get('/api/v1/company/all')
        .then(res => {
          if (Array.isArray(res.data)) {
            setWorkspaces(res.data);

            // Auto-select if there is exactly one workspace available
            if (res.data.length === 1) {
              const singleId = res.data[0]._id;
              if (activeWorkspaceId !== singleId) {
                localStorage.setItem('active_workspace_id', singleId);
                setActiveWorkspaceId(singleId);
                window.location.reload();
              }
            }
          }
        })
        .catch(err => {
          console.error('Failed to fetch workspaces for Global Admin:', err);
        });
    }
  }, [isGlobalAdmin]);

  if (!isGlobalAdmin) {
    return null; // Do not render for normal tenant users
  }

  const handleSelectWorkspace = (workspaceId) => {
    localStorage.setItem('active_workspace_id', workspaceId);
    setActiveWorkspaceId(workspaceId);

    // Reload the page to reset all states and re-fetch data with the new x-tenant-id context
    window.location.reload();
  };

  const activeWorkspace = workspaces.find(w => w._id === activeWorkspaceId);

  const dropdownItems = workspaces.map(w => ({
    label: (
      <div className="flex items-center justify-between w-full">
        <span>{w.name}</span>
        {w._id === activeWorkspaceId && <Check size={16} className="text-primary ml-2" />}
      </div>
    ),
    onClick: () => handleSelectWorkspace(w._id)
  }));

  if (workspaces.length <= 1) {
    return null;
  }

  return (
    <DropdownMenu
      items={dropdownItems}
      trigger={
        <button
          className="flex items-center gap-2 h-9 px-2.5 bg-card/60 hover:bg-muted/80 border border-border/60 hover:border-border rounded-xl text-xs font-bold tracking-tight text-foreground transition-all duration-200 shadow-2xs hover:shadow-xs cursor-pointer group select-none"
          title="Select Company context"
        >
          <div className="w-5 h-5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Building2 size={12} />
          </div>
          <span className="max-w-[120px] truncate">
            {activeWorkspace ? activeWorkspace.name : 'Select Company'}
          </span>
          <ChevronDown size={13} className="text-muted-foreground/70 group-hover:text-foreground transition-colors shrink-0" />
        </button>
      }
    />
  );
};
