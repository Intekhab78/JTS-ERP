import React from 'react';
import { Bell, Search, User, Menu, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SearchInput } from '../ui/SearchInput';
import { DropdownMenu } from '../common/DropdownMenu';
import { ApiStatusBadge } from '../common/ApiStatusBadge';

const Header = ({ toggleSidebar }) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const userMenuItems = [
    { label: 'Profile', onClick: () => {} },
    { label: 'Settings', onClick: () => {} },
    { separator: true },
    { label: 'Log out', danger: true, onClick: handleLogout },
  ];

  return (
    <header className="print:hidden h-20 bg-card flex items-center justify-between px-4 lg:px-10 shrink-0 border-b">
      
      <div className="flex items-center gap-3 flex-1">
        <button 
          aria-label="Toggle Sidebar"
          onClick={toggleSidebar}
          className="lg:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Menu size={20} />
        </button>
        
        <div className="hidden sm:block w-64 lg:w-96">
          <SearchInput placeholder="Search modules..." className="rounded-full bg-background" />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3 lg:gap-5">
        <ApiStatusBadge />

        <button aria-label="Notifications" className="relative p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-background"></span>
        </button>

        <button aria-label="Settings" className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Settings size={20} />
        </button>

        
        <DropdownMenu 
          items={userMenuItems}
          trigger={
            <div role="button" tabIndex={0} aria-label="User menu" className="flex items-center gap-3 group cursor-pointer hover:bg-muted p-1.5 pr-3 rounded-full transition-colors border border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-xs font-bold text-foreground truncate max-w-[120px] lg:max-w-[200px]">{user.firstName ? `${user.firstName} ${user.lastName}` : (user.email || 'Admin User')}</span>
                <span className="text-[10px] text-primary tracking-wider uppercase font-extrabold">{user.roleName || (user.tenantId ? 'Tenant User' : 'Global Admin')}</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
                <User size={18} />
              </div>
            </div>
          }
        />
      </div>
      
    </header>
  );
};

export default Header;
