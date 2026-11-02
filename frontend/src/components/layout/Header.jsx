import React from 'react';
import { Bell, Search, User, Menu, Settings, LogOut, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DropdownMenu } from '../common/DropdownMenu';
import { ApiStatusBadge } from '../common/ApiStatusBadge';
import { WorkspaceSelector } from './WorkspaceSelector';
import { CompanySelector } from './CompanySelector';

const Header = ({ toggleSidebar, isSidebarOpen }) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const userMenuItems = [
    { 
      label: 'My Profile', 
      icon: <User size={15} className="text-primary" />,
      onClick: () => navigate('/profile') 
    },
    { 
      label: 'Account Settings', 
      icon: <Settings size={15} className="text-muted-foreground" />,
      onClick: () => navigate('/settings') 
    },
    { separator: true },
    { 
      label: 'Log out', 
      icon: <LogOut size={15} className="text-rose-500" />,
      danger: true, 
      onClick: handleLogout 
    },
  ];

  return (
    <header className="print:hidden h-14 bg-card/85 backdrop-blur-xl sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6 shrink-0 border-b border-border/70 shadow-xs transition-all">
      
      {/* Left: Sidebar Toggle + Aesthetic Search Bar */}
      <div className="flex items-center gap-3 flex-1">
        {!isSidebarOpen && (
          <button 
            type="button"
            aria-label="Toggle Sidebar"
            onClick={toggleSidebar}
            className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 rounded-xl transition-all duration-200 border border-transparent hover:border-border/60 active:scale-95 cursor-pointer shrink-0 animate-in fade-in zoom-in-90 duration-200"
            title="Open Sidebar"
          >
            <Menu size={18} />
          </button>
        )}
        
        {/* Aesthetic Modern Search Bar */}
        <div id="tour-search-bar" className="hidden sm:block w-72 lg:w-96">
          <div className="relative flex items-center w-full group">
            <Search size={14} className="absolute left-3.5 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
            <input
              type="text"
              placeholder="Search modules, features, shortcuts..."
              className="w-full h-9 pl-9 pr-14 rounded-xl bg-muted/40 hover:bg-muted/70 focus:bg-background border border-border/70 hover:border-border focus:border-primary/50 focus:ring-4 focus:ring-primary/10 text-xs font-medium text-foreground placeholder:text-muted-foreground/75 tracking-tight transition-all duration-200 outline-none shadow-2xs"
            />
            <div className="absolute right-2.5 flex items-center gap-1 pointer-events-none">
              <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold font-mono tracking-wider text-muted-foreground/80 bg-card/90 border border-border/80 rounded-md shadow-2xs">
                Ctrl K
              </kbd>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Selectors, Badges, Premium Icons & User Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div id="tour-company-selector" className="flex items-center gap-2">
          <WorkspaceSelector />
          <CompanySelector />
        </div>
        <ApiStatusBadge />

        {/* Notifications with glow ping */}
        <button 
          id="tour-notifications" 
          aria-label="Notifications" 
          className="relative w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground bg-card/60 hover:bg-muted/80 border border-border/60 hover:border-border rounded-xl transition-all duration-200 shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer group"
        >
          <Bell size={16} className="group-hover:rotate-12 transition-transform duration-200" />
          <span className="absolute top-2 right-2 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          </span>
        </button>

        {/* Settings button */}
        <button 
          aria-label="Settings" 
          onClick={() => navigate('/settings')} 
          className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground bg-card/60 hover:bg-muted/80 border border-border/60 hover:border-border rounded-xl transition-all duration-200 shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer group"
        >
          <Settings size={16} className="group-hover:rotate-45 transition-transform duration-300" />
        </button>

        {/* User Profile Menu with Help Center Font Style */}
        <DropdownMenu 
          items={userMenuItems}
          trigger={
            <div 
              id="tour-user-menu" 
              role="button" 
              tabIndex={0} 
              aria-label="User menu" 
              className="flex items-center gap-2.5 p-1 pl-2.5 pr-1.5 rounded-xl bg-card/60 hover:bg-muted/70 border border-border/60 hover:border-border/90 transition-all duration-200 cursor-pointer group shadow-2xs hover:shadow-xs select-none"
            >
              <div className="hidden md:flex flex-col items-end gap-0.5">
                <span className="text-xs font-bold tracking-tight text-foreground group-hover:text-primary transition-colors truncate max-w-[130px] lg:max-w-[180px]">
                  {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (user.email || 'Admin User')}
                </span>
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[9px] font-black uppercase tracking-wider">
                  {user.roleName || (user.tenantId ? 'Tenant User' : 'Global Admin')}
                </span>
              </div>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-xs ring-2 ring-blue-500/20 group-hover:ring-blue-500/40 transition-all font-bold text-xs shrink-0">
                {user.firstName ? user.firstName.charAt(0).toUpperCase() : <User size={15} />}
              </div>
              <ChevronDown size={13} className="text-muted-foreground/70 group-hover:text-foreground transition-transform duration-200 shrink-0" />
            </div>
          }
        />
      </div>
      
    </header>
  );
};

export default Header;

