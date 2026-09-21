import React from 'react';
import { Outlet, NavLink, Navigate, useLocation } from 'react-router-dom';
import { Settings as SettingsIcon, Building2, MapPin, Users, Shield, LayoutDashboard } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';

const Settings = () => {
  const location = useLocation();

  const settingsMenu = [
    { id: 'company', label: 'Company Setup', path: '/settings/company', icon: <Building2 size={18} /> },
    { id: 'branches', label: 'Branches', path: '/settings/branches', icon: <MapPin size={18} /> },
    { id: 'users', label: 'Users', path: '/settings/users', icon: <Users size={18} /> },
    { id: 'roles', label: 'Roles & Permissions', path: '/settings/roles', icon: <Shield size={18} /> }
  ];

  // If we are exactly on /settings, redirect to the first item
  if (location.pathname === '/settings') {
    return <Navigate to="/settings/company" replace />;
  }

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 h-full flex flex-col">
      <PageHeader 
        title={
          <div className="flex items-center gap-2">
            <SettingsIcon className="text-primary h-8 w-8" />
            System Settings
          </div>
        }
        description="Configure your ERP modules, company settings, and user access."
      />

      <div className="flex flex-1 overflow-hidden mt-6 bg-card border rounded-xl shadow-sm">
        {/* Left Pane - Navigation */}
        <div className="w-64 border-r bg-muted/20 p-4 shrink-0 overflow-y-auto">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 px-2">General Settings</div>
          <ul className="space-y-1 mb-6">
            {settingsMenu.map(item => (
              <li key={item.id}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                      isActive
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`
                  }
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        {/* Right Pane - Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-background custom-scrollbar relative">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Settings;
