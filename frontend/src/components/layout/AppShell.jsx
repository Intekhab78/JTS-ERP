import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import axios from 'axios';
import Sidebar from './Sidebar';
import Header from './Header';

import { WorkspaceSelector } from './WorkspaceSelector';

const AppShell = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const [userLoaded, setUserLoaded] = useState(false);
  const location = useLocation();
  const isFullBleedRoute = false; // Removed full-bleed for QuoteForm so it matches StockOverview layout

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const { data } = await axios.get('/api/v1/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          localStorage.setItem('user', JSON.stringify(data));
        }
      } catch (error) {
        console.error('Failed to refresh user profile:', error);
        // If token is totally invalid, you might log out here, but we let ProtectedRoute handle basic auth
      } finally {
        setUserLoaded(true);
      }
    };
    fetchMe();
  }, []);

  if (!userLoaded) {
    return <div className="h-screen w-screen flex items-center justify-center bg-background"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  // Global Admin Mandatory Workspace Selection Check
  const isGlobalAdmin = userLoaded && (() => {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    return u && !u.tenantId;
  })();
  const hasWorkspace = !!localStorage.getItem('active_workspace_id');

  if (isGlobalAdmin && !hasWorkspace) {
    return (
      <div className="flex flex-col h-screen bg-background items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-xl shadow-lg p-6 space-y-6 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Select Workspace</h2>
          <p className="text-muted-foreground">
            As a Global Administrator, you must select a Workspace (Tenant) context to administer.
          </p>
          <div className="pt-4 flex justify-center border border-border rounded-lg p-4 bg-muted/30">
            <WorkspaceSelector />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden text-foreground font-sans">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-20 lg:hidden transition-opacity"
          aria-hidden="true"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />
        <main className={`flex-1 overflow-x-hidden overflow-y-auto print:overflow-visible bg-background custom-scrollbar ${isFullBleedRoute ? 'print:p-0' : 'p-4 md:p-8 print:p-0'}`}>
          <div className={isFullBleedRoute ? '' : 'max-w-7xl mx-auto'}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppShell;