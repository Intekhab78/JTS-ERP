import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { HelpCircle, LogOut, X, ChevronDown, ChevronRight, SlidersHorizontal, ChevronLeft } from 'lucide-react';
import { ERP_MODULES, getAllPermissionModules } from '../../config/modules.jsx';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedModules, setExpandedModules] = useState({ SALES: true }); // Default expand Sales like image

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = user.roleName || (user.tenantId ? 'Tenant User' : 'Global Admin');
  const userPermissions = user.permissions || [];
  const isGlobalAdmin = !user.tenantId || user.roleName === 'Global Superadmin';

  const hasAccess = (moduleId) => {
    if (isGlobalAdmin) return true;
    if (!moduleId) return true;
    if (userPermissions.includes('*')) return true;
    return userPermissions.some(p => p.endsWith(`_${moduleId}`));
  };

  const toggleModule = (moduleId) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const renderModule = (mod) => {
    if (mod.isParent) {
      const hasAnyAccess = mod.subModules.some(sub => hasAccess(sub.id));
      if (!hasAnyAccess) return null;

      const isExpanded = expandedModules[mod.id];
      const isActiveParent = mod.subModules.some(sub => location.pathname.startsWith(sub.path));

      return (
        <li 
          key={mod.id} 
          className="space-y-1 mb-2"
        >
          <button
            onClick={() => toggleModule(mod.id)}
            className={`group w-full flex items-center justify-between gap-3 px-4 py-2 transition-colors duration-150 text-[11px] font-bold tracking-wider uppercase focus-visible:outline-none ${
              isActiveParent
                ? 'text-indigo-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-3 transition-transform duration-200 ease-out group-hover:translate-x-1">
              {mod.name === 'Sales' ? 'SALES & COMMERCE' : mod.name}
            </div>
            <span className="transition-transform duration-200 group-hover:translate-x-0.5">
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          </button>
          
          {/* Animated Accordion Wrapper */}
          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              isExpanded ? 'max-h-[800px] opacity-100 mt-1' : 'max-h-0 opacity-0'
            }`}
          >
            <ul className="space-y-1">
              {mod.subModules.filter(sub => hasAccess(sub.id) || (sub.children && sub.children.some(c => hasAccess(c.id)))).map((sub) => {
                if (sub.children) {
                  const isSubExpanded = expandedModules[sub.id];
                  const isActiveGroup = location.pathname.startsWith(sub.path);

                  return (
                    <li 
                      key={sub.id} 
                      className="px-2 mb-1 mt-1"
                    >
                      <button
                        onClick={() => {
                          toggleModule(sub.id);
                          if (sub.path) {
                            navigate(sub.path);
                            // Only close sidebar on mobile if they click the link
                            if (window.innerWidth < 1024) setIsOpen(false);
                          }
                        }}
                        className={`group w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-semibold focus-visible:outline-none ${
                          isActiveGroup && !isSubExpanded
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                            : 'text-slate-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-3 transition-transform duration-200 ease-out group-hover:translate-x-1.5">
                          <span className="transition-transform duration-200 group-hover:scale-110">
                            {sub.icon}
                          </span>
                          <span>{sub.name}</span>
                        </div>
                        <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                          {isSubExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </span>
                      </button>

                      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isSubExpanded ? 'max-h-[500px] opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                        <ul className="pl-3 ml-5 border-l border-slate-700/50 space-y-1">
                          {sub.children.filter(child => hasAccess(child.id)).map(child => (
                            <li key={child.id}>
                              <NavLink
                                to={child.path}
                                onClick={() => setIsOpen(false)}
                                className={({ isActive }) => `group flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 text-[13px] font-semibold focus-visible:outline-none ${
                                  isActive
                                    ? 'bg-white/10 text-white' // Distinct active state for nested item
                                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                }`}
                              >
                                <span className="transition-transform duration-200 ease-out group-hover:translate-x-1.5 inline-block">
                                  {child.name}
                                </span>
                              </NavLink>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </li>
                  );
                }

                return (
                  <li 
                    key={sub.id} 
                    className="px-2"
                  >
                  <NavLink
                    to={sub.path}
                    end={sub.path === '/sales' || sub.path === '/purchases' || sub.path === '/inventory' || sub.path === '/pos'}
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) => {
                      let trulyActive = isActive;
                      if (sub.path === '/purchases/consignments' && isActive) {
                        if (location.pathname.includes('/receipts') || 
                            location.pathname.includes('/stock') || 
                            location.pathname.includes('/settlements')) {
                          trulyActive = false;
                        }
                      }
                      
                      return `group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-semibold focus-visible:outline-none ${
                        trulyActive
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      }`;
                    }}
                  >
                    <div className="flex items-center gap-3 transition-transform duration-200 ease-out group-hover:translate-x-1.5">
                      <span className="transition-transform duration-200 group-hover:scale-110">
                        {sub.icon}
                      </span>
                      <span>{sub.name}</span>
                    </div>
                  </NavLink>
                </li>
                );
              })}
            </ul>
          </div>
        </li>
      );
    } else {
      if (!hasAccess(mod.id)) return null;
      return (
        <li 
          key={mod.id} 
          className="px-2 mb-2"
        >
          <NavLink
            to={mod.path}
            onClick={() => setIsOpen(false)}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-semibold focus-visible:outline-none ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <div className="flex items-center gap-3 transition-transform duration-200 ease-out group-hover:translate-x-1.5">
              <span className="transition-transform duration-200 group-hover:scale-110">
                {mod.icon}
              </span>
              <span>{mod.name}</span>
            </div>
          </NavLink>
        </li>
      );
    }
  };

  return (
    <aside 
      aria-label="Sidebar Navigation" 
      className={`print:hidden fixed lg:static inset-y-0 left-0 z-30 w-64 bg-[#262b3a] flex flex-col shrink-0 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-2xl lg:shadow-none select-none ${
        isOpen ? 'translate-x-0 lg:ml-0 opacity-100' : '-translate-x-full lg:translate-x-0 lg:-ml-64 lg:opacity-0 pointer-events-none lg:pointer-events-auto'
      }`}
    >
      <div className="w-64 flex flex-col h-full">
        {/* Sleek Sidebar Header matching Header height (h-14) */}
        <div className="h-14 flex items-center justify-between px-4 shrink-0 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-600/30">
              J
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white tracking-tight leading-tight">
                JTS ERP
              </span>
              <span className="text-[10px] font-medium text-slate-400">Enterprise v4.2</span>
            </div>
          </div>
          <button 
            type="button"
            aria-label="Close Sidebar"
            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors duration-150 cursor-pointer active:scale-90" 
            onClick={() => setIsOpen(false)}
            title="Collapse Sidebar"
          >
            <span className="lg:hidden"><X size={18} /></span>
            <span className="hidden lg:block"><ChevronLeft size={18} /></span>
          </button>
        </div>

        {/* Navigation list with smooth scroll & stable layout */}
        <nav id="tour-sidebar-modules" className="flex-1 py-3 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <ul className="space-y-1">
            {ERP_MODULES.map((mod) => renderModule(mod))}
          </ul>
        </nav>

        {/* Footer actions */}
        <div className="p-3 shrink-0 border-t border-white/5 space-y-1">
          <button 
            id="tour-help-center"
            type="button"
            onClick={() => navigate('/help')}
            className={`group flex items-center gap-3 px-3 py-2 w-full rounded-xl transition-all duration-200 text-xs font-semibold focus-visible:outline-none cursor-pointer ${
              location.pathname === '/help'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3 transition-transform duration-200 ease-out group-hover:translate-x-1.5">
              <span className="transition-transform duration-200 group-hover:scale-110">
                <HelpCircle size={16} />
              </span>
              <span>Help Center</span>
            </div>
          </button>

          <button 
            type="button"
            onClick={handleLogout} 
            className="group flex items-center gap-3 px-3 py-2 w-full rounded-xl transition-all duration-200 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 focus-visible:outline-none cursor-pointer"
          >
            <div className="flex items-center gap-3 transition-transform duration-200 ease-out group-hover:translate-x-1.5">
              <span className="transition-transform duration-200 group-hover:scale-110">
                <LogOut size={16} />
              </span>
              <span>Log Out</span>
            </div>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
